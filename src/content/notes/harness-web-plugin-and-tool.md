---
title: "Harness 学习记录：从 Web 插件到 Tool 定义"
description: "继续 Cordis 学习，把插件接入 Harness Web 应用，理解 profile、patch、输入输出定义，并通过实操截图记录 greet 工具的真实模型调用。"
date: 2026-11-16
category: "源码学习"
tags: ["DeepSeek Harness", "Cordis", "TypeScript", "Tool"]
draft: false
---

学习日期：2026 年 11 月 16 日（Asia/Shanghai）。这次接着 [Cordis 七章学习记录](/notes/cordis-learning-notes/) 继续，重点是把已学过的插件机制放进完整的 Harness Web 应用，再拆解一个问候工具。

本文整理当天的学习对话、练习代码、运行结果和我提供的真实调用截图。命令、界面路径和实现细节以学习当天的本地 checkout 为准；示例中的 `C:/path/to/deepseek-harness` 是路径占位符，复现时需要替换。

## 今天学到了哪里

此前的 Cordis 教程主要是自己组合服务和插件，观察框架怎样工作。今天继续使用已经建立的 Harness 插件练习，重新启动完整 Web 应用，理解应用组合与扩展的关系。

| 内容                | 今天的进度                                                  |
| ------------------- | ----------------------------------------------------------- |
| 第一个 Harness 插件 | 重新启动练习，在 Web 设置中确认插件已启用                   |
| profile 与 patch    | 理解基础应用组合，以及怎样向组合中插入自己的插件            |
| 开发一个 Tool       | 加入 `greet` 工具插件，并确认工具注册日志                   |
| 工具输入            | 拆解 `parameters`、必填字段、类型与参数名匹配               |
| 工具输出            | 拆解 `execute`、`output.schema` 与 `output.render`          |
| 真实模型调用        | 已在 Web 会话中调用 `greet`，向陈兴志问候，并查看参数与结果 |

**这次已完成 Web 应用打开、插件加载、工具注册，以及一次真实模型工具调用。实际调用传入的人名为“陈兴志”，工具返回 `Hello, 陈兴志!`。文中的 Ada 示例和错误参数表仍用于解释代码，没有逐项实测。**

## 第一个 Harness 插件：入口没有变，运行环境变了

最小插件仍然只有一个入口：

```typescript
import type { Context } from "@deepseek-ai/cordis";

export const name = "hello-plugin";

export function apply(ctx: Context) {
  console.log("[hello-plugin] plugin loaded!");
}
```

框架挂载插件时调用 `apply(ctx)`。这个示例只打印日志，没有注册按钮、页面或工具。

因此，看到插件出现在清单中，并不意味着聊天界面一定增加了可见功能。是否有新功能，要看插件在 `apply` 中向框架登记了什么。

与 Cordis 教学示例相比，插件入口的机制相同；这次新增的重点是：**怎样把这个模块加载进 Harness 已经组合好的完整应用。**

### 这次练习的文件

练习放在仓库根目录的 `.codex/harness-plugin/` 下，和正式源码分开：

```text
.codex/harness-plugin/
├── src/
│   ├── my-plugin.ts      # 启动时打印日志的最小插件
│   └── greet-tool.ts     # 提供 greet 工具的插件
├── cordis.yml            # 插入上述插件的 patch
├── start.ps1             # 本地启动脚本
└── dsh-home/             # 独立的练习配置目录
```

本次练习使用 `3081` 端口，并通过 `DSH_HOME` 隔离练习配置。这个端口是本次设置，不代表所有 Harness 环境的默认端口。

重新打开练习时，补齐了缺失的构建文件，随后确认 Web 应用能够启动、插件加载成功。复现前仍需满足仓库的源码运行要求，单独复制插件文件并不等于完整运行环境已经就绪。

## profile 和 patch：应用怎么组合，插件怎么加入

### profile 选择一套应用组合

命令中的 `web` 是 profile 名称：

```powershell
pnpm dsh web
```

可以把 profile 理解为一份具名的应用组合配置：它决定使用哪些组合包，以及相应的配置覆盖层。

本次检查的 Web profile 中，`dsh.profile.bundles` 包含：

```json
["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"]
```

| 组合包        | 在这套组合中的作用                       |
| ------------- | ---------------------------------------- |
| `dsh-base`    | 提供工具、模型接入、会话持久化等共同能力 |
| `dsh-web-app` | 加入浏览器应用所需的能力                 |

所以，在自己的插件加入之前，这套 profile 已经能够组织出 Web 应用。

### patch 在已有组合上增加配置

`--patch` 指定一份配置修改。在本次练习中，它向已有应用插入两个插件：

```yaml
- insert:
    - id: tutorial-hello
      name: "C:/path/to/deepseek-harness/.codex/harness-plugin/src/my-plugin.ts"
    - id: tutorial-greet
      name: "C:/path/to/deepseek-harness/.codex/harness-plugin/src/greet-tool.ts"
```

| 字段     | 含义                                   |
| -------- | -------------------------------------- |
| `insert` | 向已有配置插入条目                     |
| `id`     | 配置项的稳定标识，用于识别和管理该条目 |
| `name`   | 要加载的插件模块；这里填写文件路径     |

这里需要使用插件的**绝对路径**。patch 文件贡献配置，不会把 Loader 的模块解析根目录自动改成 patch 所在目录。

下面的命令展示选择 profile、加载练习 patch 和指定端口的核心关系；它不包含本地启动脚本中的其他辅助设置：

```powershell
# 在 deepseek-harness 仓库根目录执行
pnpm.cmd dsh web --patch ./.codex/harness-plugin/cordis.yml --port 3081
```

组合过程可以顺着这一条线看：

```text
选择 web profile
    ↓
组合基础能力与 Web 应用
    ↓
应用本地 patch
    ↓
加入 tutorial-hello 和 tutorial-greet 配置项
    ↓
Cordis 加载对应模块，依赖就绪后调用 apply(ctx)
```

当天的一个理解题是：如果不传入 hello 插件的 patch，会发生什么？

在本次配置中，Web 应用仍可以由原来的 profile 启动，但我们通过这份 patch 加入的插件不会随之加载。这让我区分了“应用本身的组合”和“自己的扩展配置”。

## 在界面上找插件，以及首次访问的认证问题

当天确认 hello 插件的路径是：

1. 点击左下角头像，进入**设置**。
2. 选择**内置插件**。
3. 搜索 `hello`。
4. 在**全局插件**下找到以 `my-plugin.ts` 结尾的条目，配置项标识为 `tutorial-hello`，状态为**已启用**。

这里有两个容易混淆的名称：配置项的 `id` 是 `tutorial-hello`，插件代码导出的 `name` 是 `hello-plugin`。当天这个清单展示的是模块路径和配置项标识，不能只按导出的插件名称寻找。

### 为什么直接打开本地地址会显示 unauthorized

这次在自己的浏览器中直接输入本地地址时，遇到了 `unauthorized`。原因是该浏览器还没有完成 Harness 的认证，缺少相应 Cookie。

处理方式是使用启动终端打印的、带认证参数的完整地址完成首次访问。认证成功后，地址栏恢复普通地址，同一个浏览器随后可以直接访问应用。

换浏览器、清除 Cookie 或重新建立环境后，可能需要重新完成认证。认证链接中的 token 属于访问凭据，不应贴进文章、截图或公开仓库；本文只记录机制，不记录实际链接或凭据。

## 插件与 Tool：一个负责接入，一个提供可调用能力

我最初的理解是：“一个工具是不是也相当于一个插件，只是需要用 `ctx.tools.register` 注册？”

更准确的关系是：**插件可以提供工具；一个插件可以提供多个工具，也可以同时注册服务和事件监听器。**

```text
一个插件
  └── apply(ctx)
        ├── 注册 greet 工具
        ├── 注册其他工具
        └── 注册事件监听器或其他能力
```

`defineTool(...)` 定义工具，`ctx.tools.register(...)` 把工具登记到工具服务。当前练习恰好采用一个插件提供一个工具的结构，二者不要求一一对应。

### 完整的问候工具代码

以下是当天 `greet-tool.ts` 的代码，按本站风格格式化了引号、分号和换行，执行逻辑保持一致：

```typescript
import type { Context } from "@deepseek-ai/cordis";
import { defineTool } from "@deepseek-ai/dsh-tools";

export const name = "greet-tool";
export const inject = ["tools"];

export function apply(ctx: Context) {
  ctx.tools.register(
    defineTool({
      name: "greet",
      description: "Return a greeting for the named person.",
      parameters: {
        name: {
          type: "string",
          required: true,
          description: "Name of the person to greet.",
        },
      },
      output: {
        schema: { type: "string" },
        render: (_args, value) => [{ type: "text", text: value }],
      },
      async execute(args) {
        return `Hello, ${args.name}!`;
      },
    }),
  );

  console.log("[greet-tool] registered greet");
}
```

`inject = ['tools']` 声明对工具服务的依赖。框架等服务就绪后，才运行插件的 `apply(ctx)`，这样注册时可以使用 `ctx.tools`。

当天终端实际出现了注册日志：

```text
[greet-tool] registered greet
```

### 加载时注册，调用时执行业务

`apply` 中完成登记；`execute` 中的问候逻辑，要等工具被调用时才运行。

| 名称         | 在代码中的位置           | 表示什么                 |
| ------------ | ------------------------ | ------------------------ |
| `greet-tool` | 插件导出的 `name`        | 插件名称                 |
| `greet`      | `defineTool` 中的 `name` | 登记到工具服务的工具名称 |
| `name`       | `parameters` 的字段      | 调用者需要提供的人名     |

“注册成功”说明工具已经被登记，不等于模型已经调用过它。

用 Python 类比：扩展模块初始化时把函数登记到命令表；用户后续请求某个命令时，框架才调用对应函数。模块和函数处在不同层次。

## 真实调用：从聊天结果追到参数与返回值

完成注册后，我在 Web 会话中发送了：

```text
使用 greet tool to greet 陈兴志
```

这次不仅看到了助手回复，还展开查看了工具调用记录。以下三张图片是我的实际操作截图，点击可查看原图。

### 聊天中确认工具已被调用

聊天界面显示了 `greet · 陈兴志` 的工具调用条目，助手最终回复：已通过 `greet` 工具向陈兴志问好，结果为 `Hello, 陈兴志!`。

<figure class="article-figure">
  <a href="/images/harness-learning/greet-chat.png" target="_blank" rel="noopener noreferrer">
    <img src="/images/harness-learning/greet-chat.png" width="1443" height="446" alt="Harness 聊天截图：请求 greet 工具向陈兴志问候，界面显示工具调用及 Hello, 陈兴志! 的回复" loading="lazy" decoding="async" />
  </a>
  <figcaption>实操截图 1：聊天界面中的工具调用与最终回复。</figcaption>
</figure>

### 调用链中核对工具名和实际参数

调用链把用户消息、上下文、助手消息和工具执行分开显示。在工具一行，可以直接看到：

```text
工具：greet
参数：{"name":"陈兴志"}
返回：Hello, 陈兴志!
```

这让前面代码中的 `parameters.name`、`args.name` 和实际输入对应起来。判断工具是否执行时，查看这一条调用记录，比只看助手自然语言回复更直接。

<figure class="article-figure">
  <a href="/images/harness-learning/greet-trace.png" target="_blank" rel="noopener noreferrer">
    <img src="/images/harness-learning/greet-trace.png" width="1070" height="279" alt="Harness 调用链截图：greet 工具收到 name 为陈兴志的参数，并返回 Hello, 陈兴志!" loading="lazy" decoding="async" />
  </a>
  <figcaption>实操截图 2：工具调用链中的输入参数与返回值。</figcaption>
</figure>

### 工具明细中查看 Schema、状态与计时

展开工具明细后，可以看到状态为“已完成”，参数为 `name: "陈兴志"`，结果为 `Hello, 陈兴志!`。Schema 中的 `required: ["name"]`，也与代码中的 `required: true` 对应。

<figure class="article-figure">
  <a href="/images/harness-learning/greet-details.png" target="_blank" rel="noopener noreferrer">
    <img src="/images/harness-learning/greet-details.png" width="651" height="711" alt="greet 工具明细截图：已完成状态、name 参数、问候结果、参数 Schema 和 10 毫秒的工具耗时" loading="lazy" decoding="async" />
  </a>
  <figcaption>实操截图 3：工具详情中的完成状态、参数、结果、Schema 与计时。</figcaption>
</figure>

截图中整轮会话显示约 6 秒，工具明细显示 10 毫秒。这是不同范围的耗时：整轮会话还包含模型生成等过程，不能把两者直接当成同一个指标，也不能用这一次记录代表稳定性能。

这次成功调用确认了“注册 → 接收参数 → 执行 → 返回工具结果 → 助手回复”这条路径。缺少参数、参数类型错误等情况，仍需要另行测试。

## parameters：输入规则与参数名必须一致

工具的输入定义是：

```typescript
parameters: {
  name: {
    type: 'string',
    required: true,
    description: 'Name of the person to greet.',
  },
},
```

它声明工具接受一个名为 `name` 的必填字符串参数；`description` 解释这个参数的用途。

假设调用参数是：

```json
{ "name": "Ada" }
```

通过校验后，业务函数收到的 `args.name` 就是字符串 `'Ada'`。

### 参数错误时会怎样

下面是依据这份定义进行的代码推演，今天没有逐一发起模型请求来测试这些输入：

| 输入                | 按当前规则的预期                     |
| ------------------- | ------------------------------------ |
| `{"name":"Ada"}`    | 通过                                 |
| `{"name":"陈兴志"}` | 通过                                 |
| `{}`                | 失败，缺少必填参数                   |
| `{"name":123}`      | 失败，参数类型不符                   |
| `{"person":"Ada"}`  | 失败，没有提供名为 `name` 的必填字段 |

**框架不会自动把 `person` 改名为 `name`。** 参数名属于调用约定，含义看起来相近也不能替代。

在本例使用的 `defineTool` 路径中，输入先校验，再进入用户编写的业务函数；校验失败不会执行这段问候逻辑。

### 一份定义承担两种作用

`defineTool` 根据参数定义推导 TypeScript 类型，因此代码中的 `args.name` 可以被推导为必填字符串。

| 时机             | 作用                               |
| ---------------- | ---------------------------------- |
| 编写代码时       | 帮助 TypeScript 检查参数的使用方式 |
| 工具实际被调用时 | 校验传入的数据是否满足规则         |

这两件事不能混为一谈：编辑器里的类型提示，不会自动保证外部传入的数据正确；运行时仍需要校验。

用 Python 类比，可以想成框架先根据规则检查一个输入字典，再把它交给业务函数；同时，开发工具还获得了这个字典应有结构的类型信息。

## output：业务返回值怎样变成模型的工具结果

今天最后学到的部分是输出定义：

```typescript
output: {
  schema: { type: 'string' },
  render: (_args, value) => [
    { type: 'text', text: value }
  ],
},
```

这里把“返回什么数据”和“怎样把数据转换成结果内容”分开了。

### execute 返回业务数据

```typescript
async execute(args) {
  return `Hello, ${args.name}!`
}
```

假设传入 `{ name: 'Ada' }`，这段业务代码返回字符串 `Hello, Ada!`。

`output.schema` 声明返回值应当是字符串。输入规则看 `parameters`，输出值规则看 `output.schema`，二者检查的对象不同。

### render 生成内容块

框架将调用参数和通过输出校验的值交给 `render`。在这个示例中：

| 参数    | 示例值            |
| ------- | ----------------- |
| `_args` | `{ name: 'Ada' }` |
| `value` | `'Hello, Ada!'`   |

`_args` 的下划线只是表示当前函数没有使用该参数的命名习惯，不是特殊语法。

渲染后得到一个内容块数组：

```json
[{ "type": "text", "text": "Hello, Ada!" }]
```

本例只有一个文本块。这里的 `render` 用于把业务值转换为面向模型的工具结果内容，不表示已经创建了一张浏览器 UI 卡片。

```text
收到工具调用与参数
    ↓
校验输入参数
    ↓
execute(args) 返回业务值
    ↓
按 output.schema 校验返回值
    ↓
render(args, value) 生成结果内容块
```

### 改变输出文本，不必改变业务返回值

例如，把渲染函数改为：

```typescript
render: (_args, value) => [{ type: "text", text: value.toUpperCase() }];
```

业务函数仍返回 `Hello, Ada!`，但渲染文本变成 `HELLO, ADA!`。这是理解职责分工的改写示例，没有修改当天的实际练习文件。

用 Python 类比：业务函数先返回一个值，再交给格式化函数生成输出内容。格式化规则可以变化，原始业务值不必随之改变。

## 复习时抓住这条调用链

现在可以把几个概念串起来：

```text
profile 组织应用
  → patch 增加插件配置
  → Cordis 等待依赖并调用 apply
  → 插件注册工具
  → 调用者请求执行工具
  → 校验参数，执行 execute
  → 校验业务值，render 生成结果内容
```

前四步解释“工具怎么进入系统”，后面的步骤解释“工具被调用后怎么工作”。这次通过实际会话和工具详情，把插件加载、工具注册与一次成功调用串了起来；错误输入等分支仍未逐项验证。

后续学习路线包括插件配置、打包与安装，再继续深入生命周期、服务依赖、事件系统，以及能力分层、LLM 适配器和持久化插件。这些是后续安排，没有算作今天已经完成的内容。

## 参考与关联记录

- 前篇：[Cordis 学习全记录](/notes/cordis-learning-notes/)。
- 官方教程：[第一个 Harness 插件](https://deepseek-harness.github.io/deepseek-harness/develop/basic/)。
- 官方教程：[开发一个 Tool](https://deepseek-harness.github.io/deepseek-harness/develop/basic/tool)。

本文的学习进度与运行结果来自当天的练习记录及作者提供的三张实操截图；工具参数及输出流程另与当时本地 `packages/core/tools/src/schema.ts`、`pipeline.ts` 实现核对。文档和项目后续可能变化，复现时应结合所用版本检查。
