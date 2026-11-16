---
title: "Harness 学习记录：从 Web 插件到 Tool 定义"
description: "以 greet 工具为例，说明插件怎样接入 Harness Web 应用，并通过真实调用追踪参数校验、业务执行与结果渲染。"
date: 2026-11-16
category: "源码学习"
tags: ["DeepSeek Harness", "Cordis", "TypeScript", "Tool"]
draft: false
---

完成 Cordis 七章练习后，下一步是把插件接入完整的 Harness Web 应用。本文以一个 `greet` 工具为例，串起 profile、patch、工具注册、参数校验与输出渲染，并用一次真实调用检查这条链路。

这段实践围绕两个问题展开：插件怎样进入已有应用？工具定义又怎样变成一次可以检查参数和结果的调用？先从应用组合与最小插件开始，再看完整工具代码和实操截图。

记录日期为 2026 年 11 月 16 日。成功调用的实际输入是 `{"name":"陈兴志"}`，返回 `Hello, 陈兴志!`；Ada 和错误参数示例用于解释机制，未逐项实测。命令和界面以当时的本地 checkout 为准，`C:/path/to/deepseek-harness` 需要替换为实际仓库路径。框架基础见前篇 [Cordis 学习全记录](/notes/cordis-learning-notes/)。

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

插件清单反映模块的加载状态。聊天界面是否增加功能，取决于 `apply` 登记了哪些能力：只打印日志的插件可以正常加载，同时不产生新的按钮或工具。

插件入口沿用 Cordis 的机制。接入完整应用时，重点转向应用组合：由哪一套配置提供基础能力，又在哪一层加入扩展。

### 这次练习的文件

练习文件位于仓库根目录的 `.codex/harness-plugin/`，与正式源码分开：

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

这次重新启动时，先补齐了缺失的构建文件，随后 Web 应用启动、插件加载均正常。复现时要先满足仓库的源码运行要求，再检查插件文件与配置。

## profile 和 patch：应用怎么组合，插件怎么加入

### profile 选择一套应用组合

命令中的 `web` 是 profile 名称：

```powershell
pnpm dsh web
```

profile 是一份具名的应用组合配置，用来指定组合包及相应的配置覆盖层。

本次 Web profile 的 `dsh.profile.bundles` 包含：

```json
["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"]
```

| 组合包        | 在这套组合中的作用                       |
| ------------- | ---------------------------------------- |
| `dsh-base`    | 提供工具、模型接入、会话持久化等共同能力 |
| `dsh-web-app` | 加入浏览器应用所需的能力                 |

这两个组合包提供 Web 应用的基础。自定义插件通过后续配置加入。

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

按这份配置，若启动时不传入练习 patch，原来的 profile 仍然能够组织 Web 应用，而通过这份 patch 加入的两个插件不会加载。这个推演有助于区分应用的基础组合和额外扩展，未另外进行移除 patch 的运行实验。

## 在界面上找插件，以及首次访问的认证问题

确认插件是否加载，可以沿下面的界面路径检查：

1. 点击左下角头像，进入**设置**。
2. 选择**内置插件**。
3. 搜索 `hello`。
4. 在**全局插件**下找到以 `my-plugin.ts` 结尾的条目，配置项标识为 `tutorial-hello`，状态为**已启用**。

这里有两个容易混淆的名称：配置项的 `id` 是 `tutorial-hello`，插件代码导出的 `name` 是 `hello-plugin`。当天这个清单展示的是模块路径和配置项标识，不能只按导出的插件名称寻找。

### 为什么直接打开本地地址会显示 unauthorized

这次在本地浏览器直接输入地址时，页面返回了 `unauthorized`。排查后确认，浏览器尚未完成 Harness 认证，缺少相应 Cookie。

使用启动终端打印的完整认证地址完成首次访问后，页面恢复正常。认证成功后地址栏回到普通地址，同一个浏览器随后可以直接访问应用。

换浏览器、清除 Cookie 或重新建立环境后，可能需要重新认证。完整认证地址包含访问凭据，分享排查过程时应省略实际 token。

## 插件与 Tool：一个负责接入，一个提供可调用能力

我最初的理解是：“一个工具是不是也相当于一个插件，只是需要用 `ctx.tools.register` 注册？”

从注册代码看，二者的关系是：**插件提供接入入口，工具提供可调用能力。一个插件可以注册多个工具，也可以同时注册服务和事件监听器。**

```text
一个插件
  └── apply(ctx)
        ├── 注册 greet 工具
        ├── 注册其他工具
        └── 注册事件监听器或其他能力
```

`defineTool(...)` 定义工具，`ctx.tools.register(...)` 把工具登记到工具服务。当前练习恰好采用一个插件提供一个工具的结构，二者不要求一一对应。

### 完整的问候工具代码

`greet-tool.ts` 的完整实现如下。代码只统一了格式，执行逻辑与练习文件一致：

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

启动时出现以下日志，确认注册代码已经执行：

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

加载日志用于确认注册阶段；调用记录用于确认执行阶段。两种证据分别对应不同的时间点。

用 Python 类比：扩展模块初始化时把函数登记到命令表；用户后续请求某个命令时，框架才调用对应函数。模块和函数处在不同层次。

## 真实调用：从聊天结果追到参数与返回值

完成注册后，我在 Web 会话中发送了：

```text
使用 greet tool to greet 陈兴志
```

聊天回复之外，还需要检查工具调用记录，才能对应实际参数与返回值。下面三张实操截图分别展示会话结果、调用链和工具明细，点击可查看原图。

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

这条记录把声明中的 `parameters.name`、执行时的 `args.name` 和实际输入对应起来，也为“工具已经执行”提供了比自然语言回复更直接的证据。

<figure class="article-figure">
  <a href="/images/harness-learning/greet-trace.png" target="_blank" rel="noopener noreferrer">
    <img src="/images/harness-learning/greet-trace.png" width="1070" height="279" alt="Harness 调用链截图：greet 工具收到 name 为陈兴志的参数，并返回 Hello, 陈兴志!" loading="lazy" decoding="async" />
  </a>
  <figcaption>实操截图 2：工具调用链中的输入参数与返回值。</figcaption>
</figure>

### 工具明细中查看 Schema、状态与计时

工具明细显示状态为“已完成”，参数为 `name: "陈兴志"`，结果为 `Hello, 陈兴志!`。Schema 中的 `required: ["name"]`，与代码中的 `required: true` 对应。

<figure class="article-figure">
  <a href="/images/harness-learning/greet-details.png" target="_blank" rel="noopener noreferrer">
    <img src="/images/harness-learning/greet-details.png" width="651" height="711" alt="greet 工具明细截图：已完成状态、name 参数、问候结果、参数 Schema 和 10 毫秒的工具耗时" loading="lazy" decoding="async" />
  </a>
  <figcaption>实操截图 3：工具详情中的完成状态、参数、结果、Schema 与计时。</figcaption>
</figure>

整轮会话显示约 6 秒，工具明细显示 10 毫秒，统计范围不同。会话还包含模型生成等过程；工具计时只对应其中一段执行，单次结果也不足以代表稳定性能。

这次调用验证了一个正常输入下的成功路径。缺少参数、类型错误等分支，仍需单独测试。

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

按参数规则，可以推演下面几种输入的结果。其中中文人名已通过上面的真实调用；其余各项未逐一实测：

| 输入                | 按当前规则的预期                     |
| ------------------- | ------------------------------------ |
| `{"name":"Ada"}`    | 通过                                 |
| `{"name":"陈兴志"}` | 通过，已有真实调用记录               |
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

类型推导帮助检查代码中的用法，运行时校验负责检查实际输入。外部传入的数据仍需经过后者。

用 Python 类比，可以想成框架先根据规则检查一个输入字典，再把它交给业务函数；同时，开发工具还获得了这个字典应有结构的类型信息。

## output：业务返回值怎样变成模型的工具结果

输入校验之后，还要说明业务函数返回什么，以及返回值怎样进入模型的工具结果：

```typescript
output: {
  schema: { type: 'string' },
  render: (_args, value) => [
    { type: 'text', text: value }
  ],
},
```

输出定义分开处理数据约束与结果呈现：`schema` 约束业务值，`render` 将业务值转换为内容块。

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

这样改写时，业务函数仍返回 `Hello, Ada!`，渲染文本则变成 `HELLO, ADA!`。这个改写说明业务值与结果呈现的分工，尚未替换进实际练习文件。

用 Python 类比：业务函数先返回一个值，再交给格式化函数生成输出内容。格式化规则可以变化，原始业务值不必随之改变。

## 复习时抓住这条调用链

从配置到执行，完整链路可以归纳为：

```text
profile 组织应用
  → patch 增加插件配置
  → Cordis 等待依赖并调用 apply
  → 插件注册工具
  → 调用者请求执行工具
  → 校验参数，执行 execute
  → 校验业务值，render 生成结果内容
```

前四步完成应用组合与工具登记，后续步骤处理实际调用。复查时，可以分别寻找配置项、注册日志、调用参数和结果内容，避免只凭某一个环节判断整条链路已经成功。

下一步先测试缺少参数和类型错误等输入，再继续学习插件配置、打包与安装。这样既能补齐当前工具的验证，也能逐步走向更完整的插件开发流程。

## 参考与关联记录

- 前篇：[Cordis 学习全记录](/notes/cordis-learning-notes/)。
- 官方教程：[第一个 Harness 插件](https://deepseek-harness.github.io/deepseek-harness/develop/basic/)。
- 官方教程：[开发一个 Tool](https://deepseek-harness.github.io/deepseek-harness/develop/basic/tool)。

参数和输出流程可对照本地 `packages/core/tools/src/schema.ts`、`pipeline.ts` 阅读。版本变化可能影响接口和界面，复现时应同时检查所用 checkout。
