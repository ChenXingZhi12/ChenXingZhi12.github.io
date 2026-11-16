---
title: "Cordis 学习全记录"
description: "我沿着 Cordis 七章教程学习插件加载、生命周期、服务依赖、事件、配置、热重载与工具执行，记下关键代码、运行结果和容易混淆的概念。"
date: 2026-11-12
category: "源码学习"
tags: ["Cordis", "DeepSeek Harness", "TypeScript"]
draft: false
---

学习日期：2026 年 11 月 12 日（Asia/Shanghai）。这一天，我沿着 Cordis 教程学习了七章内容。我把学习时遇到的问题、关键代码和运行结果记下来，方便以后复习。下面的环境版本和运行行为，都以我学习当天使用的本地 checkout 为准。

## 学习路线与完成范围

我先从 DeepSeek Harness 文档网站和 Cordis 的事件概念入手，再依次学习框架教程的七章内容。遇到不明白的地方，我会拆开代码，追踪调用关系，再用理解题和运行示例检查自己的认识。

| 阶段       | 学习内容                               | 本次形成的认识                                                                       |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| 入口与概念 | Web UI 入门、Cordis 入门、事件与监听器 | 文档网站提供说明；实际使用 Web UI 需要启动应用。事件系统负责登记、查找和调用监听器。 |
| 准备环境   | 检查 Node.js、pnpm、依赖和教程启动器   | 复用已有 checkout 和依赖，在 .codex/cordis-tutorial 中练习。                         |
| 教程第一章 | 第一个插件                             | Loader 读取模块配置，Cordis 找到插件入口并调用。                                     |
| 教程第二章 | 生命周期与 effect                      | 插件初始化完成后仍可工作；卸载时清理所属资源。                                       |
| 教程第三章 | 服务与依赖                             | 提供方注册具名服务，消费方通过 ctx 使用，并通过 inject 声明依赖。                    |
| 教程第四章 | 事件与 waterfall                       | 区分类型声明、监听、触发；理解 next() 的调用链与返回链。                             |
| 教程第五章 | 配置                                   | 区分接口类型与运行时校验器，理解默认值、volatile 和 !!js。                           |
| 教程第六章 | 组合、HMR 与诊断                       | 用 id 标识配置项，用 disabled 控制启停，检查 PENDING 并补齐依赖。                    |
| 教程第七章 | 接入 Harness 工具服务                  | 定义、注册、执行工具，并通过 tools/result 事件观察结果。                             |

这一天，我完成了七章主线，跑通的是不调用模型的插件与工具示例，还没有在这轮练习中启动完整 Web UI、配置模型密钥或运行真实模型任务。

后来，我又把插件接入完整的 Web 应用，并完成了一次真实工具调用，另记在 [11 月 16 日的 Harness 学习记录](/notes/harness-web-plugin-and-tool/) 中。这里保留 11 月 12 日的学习进度。

## 环境与练习目录

| 项目             | 本次检查结果                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| 项目根目录       | deepseek-harness 仓库根目录                                                                       |
| 练习目录         | .codex/cordis-tutorial                                                                            |
| Node.js          | v24.22.2；满足仓库当时要求的 &gt;=24.9.0。                                                        |
| pnpm             | 11.28.5；与仓库当时声明的版本一致。                                                               |
| tsx / TypeScript | tsx v4.23.13；TypeScript 6.0.3。                                                                  |
| 依赖与构建文件   | node_modules 及示例所需的 Cordis/Harness 构建文件已经存在，未因本次教程重新安装或执行全仓库构建。 |
| Git              | .codex 已由 .git/info/exclude 忽略；本次辅助示例没有引入被跟踪的源码改动。                        |

我从练习目录启动教程：

```powershell
# 在 deepseek-harness 仓库根目录执行
cd .codex/cordis-tutorial
node --import tsx ../../vendor/cordis/bin.js
```

node 运行教程启动器；`--import tsx` 让本次教程可以加载 TypeScript 文件。这个 vendored CLI 用于 Cordis 教学示例；完整、受支持的 Harness Node 应用仍通过 dsh profile 启动。

学习结束时的主 cordis.yml 对应第七章工具演示。其他命名的 cordis.*.yml 是保留的配置副本，不会自动被这个启动器选择；启动器固定读取当前目录的 cordis.yml。复习其他阶段时，需要将对应内容放回主配置，再启动。

| 文件                                          | 用途                                    |
| --------------------------------------------- | --------------------------------------- |
| hello.ts                                      | 第一章最小插件；也是热重载练习对象。    |
| lifecycle.ts                                  | 第二章父子插件、定时器与 effect 清理。  |
| greeter.ts / consumer.ts                      | 第三章服务提供方与消费方。              |
| stats.ts / reporter.ts                        | 第四章计数服务与事件监听。              |
| waterfall-demo.ts                             | 第四章默认操作、结果包装与短路。        |
| config-demo.ts                                | 第五章配置类型、校验器与默认值。        |
| cordis.config-demo.yml                        | 第五章环境变量表达式的配置副本。        |
| invalid-config/cordis.yml                     | 第五章错误配置实验。                    |
| cordis.hmr.yml                                | 第六章热重载配置副本。                  |
| needs-timer.ts / diagnose.ts                  | 第六章依赖等待与 Fiber 状态诊断。       |
| cordis.diagnose.yml                           | 第六章已补齐 timer 服务的诊断配置副本。 |
| greet-tool.ts / tool-logger.ts / run-greet.ts | 第七章工具注册、结果观察与演示调用。    |
| cordis.yml                                    | 学习结束时使用的第七章组合配置。        |

## 第一章：第一个插件，谁加载文件，谁调用入口

### 最小插件

**hello.ts**

```typescript
import type { Context } from "@deepseek-ai/cordis";

export const name = "hello";

export function apply(ctx: Context) {
  console.log("hello from my first plugin");
}
```

import type 只提供类型信息；导出的 name 是可选显示元数据；导出的 apply 是本教程模块形态插件的入口。定义函数时不执行函数体，挂载插件并进入初始化时才执行。

**第一章 cordis.yml**

```yaml
- name: "./hello.ts"
```

YAML 中的 name 是模块路径或包名；TypeScript 中导出的 name 是插件显示名称，两者用途不同。

### 启动器与 Include 的分工

```typescript
const ctx = new Context();
ctx.baseUrl = pathToFileURL(process.cwd()).href + "/";

await ctx.plugin(Loader);
await ctx.loader.create({
  name: "@deepseek-ai/cordis-plugin-include",
  config: { path: "./cordis.yml" },
});
```

1. Node 执行 vendor/cordis/bin.js；启动器创建根 Context。
2. 启动器设置 baseUrl，并挂载 Loader。
3. Loader 挂载 Include；Include 根据 config.path 读取、解析 cordis.yml。
4. Include 把 YAML 中的配置项交给 Loader。
5. Loader 根据配置项 name 导入 hello.ts，并把模块导出交给 Cordis 插件注册机制。
6. Cordis 识别模块导出中的 apply，满足启动条件后调用 apply(ctx, config)。

因此，读取 cordis.yml 不是 new Context() 自动完成的动作，而是教程启动器显式接入 Loader 与 Include 后发生的。模块导入使函数可被访问，插件挂载则进一步启动插件。

### 相对路径从哪里开始算

| 路径或 API                 | 本例中的起点与含义                                     |
| -------------------------- | ------------------------------------------------------ |
| process.cwd()              | Node 进程当前工作目录，即先前 cd 进入的练习目录。      |
| ../../vendor/cordis/bin.js | 命令行脚本路径，相对于终端当前工作目录。               |
| path: './cordis.yml'       | 相对于启动器设置的 ctx.baseUrl；此处来自当前工作目录。 |
| name: './hello.ts'         | 相对于包含该配置项的 YAML 文件所在目录。               |

执行另一个目录下的脚本，不会自动把工作目录改成脚本所在目录。没有搜索全仓库的步骤：路径由当前工作目录、baseUrl 与明确写出的相对路径解析得到。

### 入口函数为什么会运行

在本例中，Loader 把模块导出交给 ctx.registry.plugin；Cordis 将对象的 apply 方法识别为入口，再在插件运行阶段调用它。apply 是框架约定的成员名称，不是 JavaScript 的自动启动关键字。

| 插件形态                                 | 框架执行方式                                     |
| ---------------------------------------- | ------------------------------------------------ |
| 函数：ctx.plugin(heartbeat)              | 直接把传入函数作为入口调用，函数名不必是 apply。 |
| 对象：ctx.plugin({ apply(ctx) { ... } }) | 调用对象的 apply 方法。                          |
| Service 子类：ctx.plugin(GreeterService) | 创建服务类实例，执行构造与相应初始化流程。       |

## 第二章：生命周期与 effect，创建资源，也登记清理

### 生命周期示例

为了方便复习，我在下面的示例中统一用 700 毫秒作为演示卸载时间，具体 tick 次数仍取决于调度。

**lifecycle.ts**

```typescript
import type { Context } from "@deepseek-ai/cordis";

export const name = "lifecycle-demo";

function heartbeat(ctx: Context) {
  console.log("heartbeat plugin loading");
  ctx.effect(() => {
    const timer = setInterval(() => console.log("tick"), 200);
    return () => {
      clearInterval(timer);
      console.log("heartbeat cleaned up");
    };
  });
}

export function apply(ctx: Context) {
  // Mount a child plugin and keep its fiber to dispose it later.
  const fiber = ctx.plugin(heartbeat);
  // The demo timer is itself an effect: if THIS plugin is unloaded first,
  // the pending callback is cancelled instead of firing on a dead app.
  ctx.effect(() => {
    const timer = setTimeout(async () => {
      await fiber.dispose();
      console.log("disposed");
      process.exit(0);
    }, 700);
    return () => clearTimeout(timer);
  });
}
```

父插件 apply 挂载 heartbeat 子插件，保存返回的 Fiber；子插件创建每隔约 200 毫秒打印 tick 的定时器。父插件另建一次性定时器，约 700 毫秒后卸载子插件。

| 代码                                  | 执行时机与作用                                           |
| ------------------------------------- | -------------------------------------------------------- |
| ctx.effect(() =&gt; { ... }) 的函数体 | 插件加载期间创建资源。                                   |
| effect 返回的函数                     | 插件卸载时由 Cordis 调用，负责释放资源。                 |
| setInterval / clearInterval           | 重复定时与取消重复定时。                                 |
| setTimeout / clearTimeout             | 一次性定时与取消尚未执行的回调。                         |
| await fiber.dispose()                 | 卸载对应插件实例，等待清理完成；它的子插件也会递归卸载。 |
| process.exit(0)                       | 结束整个 Node 演示进程；它不是 Cordis 插件清理 API。     |

两个名为 timer 的局部变量位于不同函数作用域，分别保存子插件的重复定时器与父插件的一次性定时器。父子插件各自收到自己的 ctx。

### 执行顺序与验证结果

1. 挂载父插件，开始执行 apply。
2. 挂载 heartbeat，打印启动消息并创建重复定时器。
3. 父插件安排约 700 毫秒后的卸载回调。
4. 重复定时器打印 tick。
5. 一次性回调调用 await fiber.dispose()。
6. 子插件清理函数取消重复定时器，打印 heartbeat cleaned up。
7. 卸载完成后打印 disposed，再退出演示进程。

**学习时的运行记录**

```text
heartbeat plugin loading
tick
tick
tick
heartbeat cleaned up
disposed
```

tick 次数受系统调度影响，不应把恰好三次当作协议。await 保证清理完成后才打印 disposed。正常演示路径主动卸载的是子插件，然后直接结束进程；父插件的一次性定时器 disposer 用于父插件更早被卸载的情况。

### 需要记住的生命周期结论

- apply 执行结束表示初始化完成，插件可进入 ACTIVE；不表示插件已卸载。
- 普通 Node 定时器不会因为 Cordis 插件卸载而自动消失；需要返回 clearInterval / clearTimeout 的清理函数。
- 未清理的旧定时器可能在重载后继续运行，与新定时器一起重复输出。
- ctx.on、ctx.plugin 等框架注册已纳入 effect 管理，不需要为同一注册再手工重复维护清理。
- 父插件卸载时，子插件也会卸载；子插件创建的资源是否被释放，取决于它是否正确提供清理逻辑。

| Fiber 状态 | 含义                                 |
| ---------- | ------------------------------------ |
| PENDING    | 等待启动条件，例如所需服务尚未就绪。 |
| LOADING    | 插件正在初始化。                     |
| ACTIVE     | 初始化完成，插件工作中。             |
| FAILED     | 配置校验或初始化失败。               |
| UNLOADING  | 正在卸载与清理。                     |
| DISPOSED   | 卸载清理完成。                       |

## 第三章：服务与依赖，通过 ctx 提供和使用能力

### 服务提供方

**greeter.ts**

```typescript
import { Service, type Context } from "@deepseek-ai/cordis";

declare module "@deepseek-ai/cordis" {
  interface Context {
    greeter: GreeterService;
  }
}

export class GreeterService extends Service {
  constructor(ctx: Context) {
    super(ctx, "greeter");
  }

  greet(who: string) {
    return `Hello, ${who}!`;
  }
}

export const name = "greeter";

export function apply(ctx: Context) {
  ctx.plugin(GreeterService);
}
```

GreeterService 继承 Service；ctx.plugin(GreeterService) 挂载该类并创建实例，构造函数中的 super(ctx, 'greeter') 注册服务名。随后消费方可以使用 ctx.greeter.greet(...)。仅定义或导出这个类，不会自动挂载服务。

| 名称                               | 职责                                            |
| ---------------------------------- | ----------------------------------------------- |
| GreeterService                     | 类名。                                          |
| super(ctx, 'greeter') 中的 greeter | 运行时服务名称，供 ctx.greeter 和 inject 使用。 |
| export const name = 'greeter'      | 插件显示名称。                                  |
| YAML 中的 id                       | 配置项的稳定标识，不决定服务名称。              |

### 类型声明与实际注册

declare module 使用声明合并扩充 Cordis 的 Context 接口，让 TypeScript 知道 ctx.greeter 的类型。它不会生成服务实例。实际注册依靠 Service 构造与挂载。只写声明、不挂载服务时，消费方声明的依赖仍不会满足。

### 服务消费方与必需依赖

**consumer.ts**

```typescript
import type { Context } from "@deepseek-ai/cordis";

export const name = "consumer";
export const inject = ["greeter"];

export function apply(ctx: Context) {
  console.log(ctx.greeter.greet("world"));
}
```

inject = ['greeter'] 声明的是服务名称，消费方会等待该服务就绪后才执行 apply。YAML 文件中两项的先后位置不能替代依赖声明。若提供方注册 welcome，而消费方等待 greeter，名称不匹配，消费方保持 PENDING。

```yaml
- name: "./greeter.ts"
- name: "./consumer.ts"
```

**学习时的运行记录**

```text
Hello, world!
```

依赖跟踪会持续进行：提供方卸载使服务消失时，依赖它的消费方当前运行也会卸载并清理；服务恢复后，消费方重新初始化。服务依赖关系并不要求消费方是提供方的子插件。

### 可选依赖

```typescript
export function apply(ctx: Context) {
  const greeter = ctx.get("greeter");
  console.log(greeter?.greet("maybe") ?? "no greeter available");
}
```

可选使用时不把该服务放进 inject，而是在使用处检查是否存在。ctx.get 返回服务或 undefined；?. 在值非空时继续访问；?? 仅在左侧为 null 或 undefined 时使用右侧默认值。必须依赖某项服务才能工作的插件，应把该服务放入 inject。我学习了这个可选依赖示例，但没有把它替换进 consumer.ts。

## 第四章：事件，登记、触发与分发

### 基础术语

| 概念               | 本次示例中的含义                                          |
| ------------------ | --------------------------------------------------------- |
| 事件               | 发生某件事的通知，例如任务完成、计数变化、工具返回结果。  |
| 事件名             | 标识通知种类，例如 stats/report。                         |
| 事件参数 / payload | 描述这一次事件的数据，例如 prompt 与 2。                  |
| 监听器             | 提前注册、在事件分发时由框架调用的处理函数。              |
| 注册 / 订阅        | 使用 ctx.on 将处理函数登记到指定事件。                    |
| 触发 / 分发        | 使用 ctx.emit、ctx.waterfall 等方法让框架调用相应监听器。 |
| 事件系统           | 保存事件与监听器关联，并按相应模式组织调用的机制。        |

ctx.on 只登记函数，不会立即运行监听器。事件名不会自动监测任务或数据变化，必须有代码在合适时机触发。普通的 Cordis 事件分发不会为后注册的监听器补发过去的通知。

### 计数服务和观察插件

**stats.ts**

```typescript
import { Service, type Context } from "@deepseek-ai/cordis";

declare module "@deepseek-ai/cordis" {
  interface Context {
    stats: StatsService;
  }
  interface Events {
    "stats/report"(name: string, count: number): void;
  }
}

export class StatsService extends Service {
  private counts = new Map<string, number>();

  constructor(ctx: Context) {
    super(ctx, "stats");
  }

  bump(name: string) {
    const next = (this.counts.get(name) ?? 0) + 1;
    this.counts.set(name, next);
    this.ctx.emit("stats/report", name, next);
  }
}

export const name = "stats";

export function apply(ctx: Context) {
  ctx.plugin(StatsService);
}
```

**reporter.ts**

```typescript
import type { Context } from "@deepseek-ai/cordis";
import type {} from "./stats.ts";

export const name = "reporter";
export const inject = ["stats"];

export function apply(ctx: Context) {
  ctx.on("stats/report", (name, count) => {
    console.log(`[stats] ${name} -> ${count}`);
  });
  ctx.stats.bump("tool_call");
  ctx.stats.bump("tool_call");
  ctx.stats.bump("prompt");
}
```

Map 保存每个计数项的独立数值。bump 读取旧值，缺省按 0 计算，加一后写回，再主动 emit 事件。this 指向当前服务实例。这里的局部变量 next 是新计数值，与 waterfall 的 next 函数没有关系。

**学习时的运行记录**

```text
[stats] tool_call -> 1
[stats] tool_call -> 2
[stats] prompt -> 1
```

继续调用 bump('prompt') 时，会发出参数 prompt、2。监听器必须先于希望接收的那次触发完成注册。

### 事件类型声明

```typescript
interface Events {
  "stats/report"(name: string, count: number): void;
}
```

这段声明让 TypeScript 知道事件名称、参数位置、参数类型和监听器返回类型；不会实际注册监听器或触发事件。将 count 写成字符串 '2' 无法通过类型检查，但类型声明本身不会在运行时自动校验输入。import type {} from './stats.ts' 使声明文件参与类型分析，运行时会被移除。

### 五种分发模式

| 模式      | 等待与顺序                               | 结果与停止规则                                                                  |
| --------- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| emit      | 按顺序调用；不等待监听器返回的 Promise。 | 忽略监听器返回值，用于同步广播通知。                                            |
| parallel  | 并发运行监听器，并等待全部结束。         | 不把监听器的结果汇总为业务返回值；并发不代表创建多个线程。                      |
| serial    | 逐个调用并等待。                         | 遇到首个停止值即返回，不保证所有监听器都会执行。                                |
| bail      | 逐个同步调用，不等待异步结果。           | 遇到首个停止值即返回。                                                          |
| waterfall | 每层通过 next() 决定是否进入后续处理。   | 可以加工下游返回值，也可以不调用 next 而短路。可组合返回 Promise 的异步监听器。 |

serial / bail 的停止值是除 null、false、undefined 之外的值；0 和空字符串也会停止，不能理解为“只有真值才停止”。emit 不等待异步结果，不等于监听器中的同步代码都在后台执行。

事件设计者先约定模式，在 Harness 事件声明中通过 @mode 记录；触发代码使用对应方法落实这一模式。监听器注册时不选择分发模式。@mode 是文档与检查用标记，本身不负责运行时调度；同一个已定义事件应遵守约定的分发方法。

## 第四章补充：waterfall，调用后续处理，再接收返回结果

### 完整示例

**waterfall-demo.ts**

```typescript
import type { Context } from "@deepseek-ai/cordis";

declare module "@deepseek-ai/cordis" {
  interface Events {
    "demo/transform"(
      input: string,
      next: () => Promise<string>,
    ): Promise<string>;
  }
}

export const name = "waterfall-demo";

export function apply(ctx: Context) {
  // Listener 1: wrap the downstream result.
  ctx.on("demo/transform", async (input, next) => {
    const downstream = await next();
    return downstream.toUpperCase();
  });

  // Listener 2: short-circuit when it owns the decision.
  ctx.on("demo/transform", async (input, next) => {
    if (input.includes("blocked")) return "** blocked **";
    return next();
  });

  void (async () => {
    console.log(
      await ctx.waterfall("demo/transform", "hello", async () => "hello"),
    );
    console.log(
      await ctx.waterfall(
        "demo/transform",
        "blocked words",
        async () => "blocked words",
      ),
    );
  })();
}
```

**学习时的运行记录**

```text
HELLO
** BLOCKED **
```

### next 是框架传入的续接函数

同一事件的两个监听器按本例注册顺序连接，最里面是触发时提供的默认操作。监听器 1 调用 next 会进入监听器 2；监听器 2 调用 next 会进入默认操作。next 返回后续处理的结果，因此前面的监听器还能加工该结果。

```text
监听器 1：调用 next()，等待结果
    ↓
监听器 2：检查输入，允许则调用 next()
    ↓
默认操作：返回 hello
    ↑
监听器 2：返回 hello
    ↑
监听器 1：把 hello 转为 HELLO，再返回
    ↑
外层调用得到 HELLO
```

next 是习惯命名，不是关键字。参数按位置接收，所以可以把 (input, next) 改成 (text, continueChain)。对 waterfall 来说，续接函数由框架放在最后一个参数位置；本例只有一个输入，因此它恰好是第二个参数。

### 输入与默认结果为何可以不同

```typescript
await ctx.waterfall("demo/transform", "hello", async () => "hello");
```

| 代码部分                      | 作用                                        |
| ----------------------------- | ------------------------------------------- |
| 第二个参数 'hello'            | 传给监听器的输入 input。                    |
| 最后的 async () =&gt; 'hello' | 待调用的默认操作，固定产生 hello 这个结果。 |

对于上面这一行调用，input 用于判断是否包含 blocked；默认操作固定返回 hello。因此只把第二个参数换成 world 等普通输入，仍会得到 HELLO。包含 blocked 时，监听器 2 直接返回 ** blocked **，默认操作被跳过；返回值仍经过监听器 1，成为 ** BLOCKED **。

```typescript
const text = "good morning";
const result = await ctx.waterfall("demo/transform", text, async () => text);
// 在现有两个监听器下，得到 GOOD MORNING
```

这段改写通过闭包读取外部变量 text，默认结果才会随输入变量变化。我用它理解输入与默认结果的关系，没有替换实际的 waterfall-demo.ts。

### 事件何时触发，void 又是什么

ctx.waterfall 本身就是分发方法，每调用一次就发起一次该事件的处理。apply 先注册两个监听器，再运行立即调用的异步函数，其中依次发起 hello 和 blocked words 两次分发。

```typescript
void (async () => {
  // 内部可使用 await
})();
```

1. async () =&gt; { ... } 定义异步函数。
2. 外层括号把函数作为表达式包住，末尾 () 立即调用它。
3. 异步函数调用返回 Promise；void 运算符丢弃该返回值，使整个表达式的值为 undefined。
4. 真正启动调用的是末尾 ()；void 不会取消函数，也不会等待或自动处理其错误。

此处的 void 是运行时运算符；事件声明中的 : void 是类型标注，两者用途不同。async 函数返回 Promise，用 await 可以等待它的结果；JavaScript 与 Python 对异步函数调用的启动方式不同，不能把 void 调用直接等同于 Python 的协程调度。

### waterfall 的实际用途

为了理解实际用途，我记下了两个假设场景：生成报告时由缓存插件直接返回已有报告；执行命令时由权限插件决定是否允许继续。外层日志插件调用 next，获得最终结果后记录日志。这两个业务场景帮助我理解机制，还没有实际实现。

- 操作前参与检查：例如权限检查、选择缓存。
- 短路：直接给出结果或拒绝结果，跳过默认操作。
- 操作后加工：记录结果或转换返回内容。

默认操作以函数形式传入，允许插件先判断，再决定是否执行它。只负责观察或标注的 waterfall 监听器应调用 next；不调用表示停止后续执行。

## 第五章：配置，类型、校验器、默认值与动态值

### 配置插件与数据传递

**config-demo.ts**

```typescript
import type { Context } from "@deepseek-ai/cordis";
import Schema from "@deepseek-ai/schemastery";

export const name = "config-demo";

export interface Config {
  greeting: string;
  targets: string[];
}

export const Config: Schema<Config> = Schema.object({
  greeting: Schema.string().default("Hello"),
  targets: Schema.array(String).default(["world"]),
});

export function apply(ctx: Context, config: Config) {
  for (const target of config.targets) {
    console.log(`${config.greeting}, ${target}!`);
  }
}
```

```yaml
- name: "./config-demo.ts"
  config:
    targets: ["alpha", "beta"]
```

Loader 读取 YAML 的 config 字段，按插件导出的运行时 Config 规则进行校验、补充默认值，再把结果作为第二个参数传给 apply。未填写 greeting 时，本例使用 Hello，输出 Hello, alpha! 与 Hello, beta!。显式配置 Hi 后，问候语变为 Hi。

### 为什么有 config、Config 和 GreetingConfig

| 名称所在位置                 | 是否可以改名                                             | 原因                                                   |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| YAML 的 config:              | 不能直接改为 customConfig: 来替代它。                    | 这是 Loader 识别并传入插件的字段。                     |
| export const Config = 校验器 | 对外导出名需保持 Config；内部变量可另名再导出为 Config。 | Cordis 从插件导出的 Config 取得运行时校验器。          |
| interface Config             | 可以改为 interface GreetingConfig。                      | 这是开发者定义的类型名，引用它的类型标注同步修改即可。 |
| apply(ctx, config) 的参数名  | 可以改成 options、customConfig 等。                      | 参数按位置接收，不靠变量名匹配 YAML 字段。             |
| greeting、targets 等内部字段 | 可以设计其他字段，但 schema、类型与使用代码需一致。      | 这些是插件自己的配置内容。                             |

```typescript
export interface GreetingConfig {
  greeting: string;
  targets: string[];
}

export const Config: Schema<GreetingConfig> = Schema.object({
  greeting: Schema.string().default("Hello"),
  targets: Schema.array(String).default(["world"]),
});

export function apply(ctx: Context, options: GreetingConfig) {
  console.log(options.greeting);
}
```

GreetingConfig 可以标注 apply 的第二个参数，也可以用于其他变量或函数；它只描述类型，不创建配置值。接口与校验器可以同名，是因为 TypeScript 区分类型与运行时值。我用 GreetingConfig 这个改名示例理解两者的区别，实际练习文件仍保留教程中的 Config 名称。

### 缺省与错误类型是两件事

| 输入                        | 处理                                        |
| --------------------------- | ------------------------------------------- |
| 没有 greeting、没有 targets | 补成 Hello 与 [world]，打印 Hello, world!。 |
| targets: ['alpha']          | 合法的字符串数组。                          |
| targets: 'alpha'            | 类型错误，不会自动转换成数组。              |

interface 提供编译期类型信息，运行时会被移除；Schema 是实际执行的校验器。直接调用校验器检查 targets: not-an-array 时，本次得到：

```text
$.targets expected array but got not-an-array
```

运行 invalid-config/cordis.yml 时，我发现本地最小教程启动器没有打印错误，直接以 0 退出。随后独立调用同一个 Config 校验器，才明确得到上述错误，并以 1 退出。我没有在这次学习中修复启动器，也不能据此认为它已经符合教程描述的错误显示与退出码。这让我记住：没有输出或退出码为 0，不能单独证明所有预期插件都初始化成功。

### volatile：读取可更新的配置引用

```typescript
greeting: Schema.string().default("Hello").volatile();

// 使用处每次操作时读取当前值
config.greeting.get();
```

volatile 字段提供可读取当前值的引用。Loader 接收到有效配置更新，且只有 volatile 字段变化、其他普通字段的有效值保持一致时，可以更新正在运行实例中的引用，无需重新挂载。若问候语从 Hello 更新为 Hi，之后 get() 得到 Hi。

仅在初始化时把 get() 的字符串保存到变量，再在后续操作中一直使用该变量，不会自动读取新配置。volatile 本身不负责监视文件。这一部分，我先理解了语义，还没有专门做 volatile 更新实验；config-demo.ts 仍使用普通字符串字段。

### !!js：加载时计算配置

**cordis.config-demo.yml**

```yaml
- name: "./config-demo.ts"
  config:
    greeting: !!js process.env.DEMO_GREETING ?? 'Hello'
    targets: ["alpha", "beta"]
```

!!js 标记由本仓库 Loader 解释的 JavaScript 表达式。process.env.DEMO_GREETING 读取环境变量，?? 'Hello' 在值为 null 或 undefined 时提供默认值。去掉 !!js，后面的内容会作为普通字符串，不会执行表达式。使用的是 !!js，不是 !js。

```powershell
$env:DEMO_GREETING = 'Hi'
node --import tsx ../../vendor/cordis/bin.js
```

| 实际验证条件                   | 输出                         |
| ------------------------------ | ---------------------------- |
| 清除演示进程中的 DEMO_GREETING | Hello, alpha! / Hello, beta! |
| 演示进程中 DEMO_GREETING 为 Hi | Hi, alpha! / Hi, beta!       |

表达式先求值，再交给 schema 校验，最后传给 apply。它不是每次读取 config.greeting 时都重新计算。所示环境变量设置位于命令进程中，没有创建 Windows 持久环境变量。

## 第六章：组合、热重载与依赖诊断

### id 与 disabled

```yaml
- id: greeter-entry
  name: "./greeter.ts"
- id: consumer-entry
  name: "./consumer.ts"
  disabled: true
```

id 是配置项的稳定标识，便于 Loader 在重读配置时识别同一项。disabled: true 保留配置但禁止挂载；运行中收到相应更新时会卸载该插件。改回 false 后仍按依赖条件重新启动。修改 id 不会把 ctx.greeter 变成 ctx.abc，因为服务名由服务注册决定。

### HMR 实操

**cordis.hmr.yml**

```yaml
- id: logger
  name: "../../vendor/logger-console/lib/index.js"
- id: timer
  name: "../../vendor/timer/lib/index.js"
- id: hmr
  name: "../../packages/boot/hmr/lib/index.js"
  config:
    root: ["."]
    ignored: ["**/node_modules"]
- id: hello
  name: "./hello.ts"
```

本地根目录没有直接链接教程中的几个包名，但对应构建文件存在，因此辅助配置使用相对文件路径加载 logger、timer 与 dsh-hmr。ignored 覆盖默认隐藏目录忽略规则，使位于 .codex 下的练习文件可被监视；没有把监视范围扩展到整个仓库。

1. 启动一次教程进程，看到 hello from my first plugin 与 hmr watching 日志。
2. 保持同一个进程运行，把 hello.ts 的输出改为 hello from my EDITED plugin 并保存。
3. 观察到新消息与 hmr reload plugin at hello.ts 日志。
4. 将 hello.ts 恢复为原文字，再次观察到重载。
5. 停止验证进程，保留可供之后复习的 HMR 配置副本。

这次我验证的是同一 Node 进程内的插件代码替换。旧实例先卸载清理，新实例再初始化，服务依赖也参与这一过程。因此，我不能把这里的热重载理解成重启整个 Node 进程。

### 检查没有输出的插件

**needs-timer.ts**

```typescript
import type { Context } from "@deepseek-ai/cordis";

export const name = "needs-timer";
export const inject = ["timer"];

export function apply(ctx: Context) {
  console.log("needs-timer loaded");
}
```

**diagnose.ts**

```typescript
import { FiberState, type Context } from "@deepseek-ai/cordis";

export const name = "diagnose";

export function apply(ctx: Context) {
  ctx.effect(() => {
    const timer = setTimeout(() => {
      for (const runtime of ctx.registry.values()) {
        for (const fiber of runtime.fibers) {
          if (fiber.state === FiberState.PENDING) {
            console.log(
              `${fiber.name} is PENDING — a required service is missing`,
            );
          }
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  });
}
```

诊断插件用稍后的回调遍历 ctx.registry.values()，再遍历每个 runtime 的 fibers，找出状态为 PENDING 的实例。定时器按第二章方法通过 effect 管理。这里使用 Node 内置 setTimeout 进行延迟；needs-timer 等待的则是名为 timer 的 Cordis 服务，两者不同。

| 组合                                              | 本次实际结果                                           |
| ------------------------------------------------- | ------------------------------------------------------ |
| 仅 needs-timer 与 diagnose，没有 timer 服务提供方 | needs-timer is PENDING — a required service is missing |
| 加入 timer 服务提供方                             | needs-timer loaded                                     |

PENDING 是合法的等待状态，不等同于 FAILED。只存在等待中的 Fiber，并不一定能使 Node 进程保持运行。已补齐服务的配置保存在 cordis.diagnose.yml。

## 第七章：接入 Harness，工具注册、执行与结果观察

### 本地版本的适配

学到这里时，我遇到了教程和本地实现的差异：教程把问候工具的注册和演示调用写在同一个文件中，而本地源码已把工具执行职责拆为独立执行器。ToolsService.execute 会选择执行器，没有提供方就无法执行。所以，这次练习中补上了 NativeToolExecutor，并把演示调用拆到 run-greet.ts，按明确顺序完成准备后再调用。我跑通了真实工具流水线，但没有调用模型。

### 定义并注册问候工具

**greet-tool.ts**

```typescript
import type { Context } from "@deepseek-ai/cordis";
import { defineTool } from "../../packages/core/tools/lib/index.js";

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
}
```

| 工具定义字段  | 含义                                                 |
| ------------- | ---------------------------------------------------- |
| name          | 工具调用名称 greet；与插件显示名称 greet-tool 不同。 |
| description   | 向调用方说明工具用途。                               |
| parameters    | 接受的参数及规则；name 是必填字符串。                |
| output.schema | 声明工具返回的规范值是字符串。                       |
| output.render | 将规范值转换成结果内容块。                           |
| execute(args) | 实现具体功能，返回问候语。                           |

defineTool 定义工具并连接参数规则、类型推导和校验；ctx.tools.register 把它登记到工具服务。仅注册不会自动执行问候。注册 disposer 与当前插件关联，卸载插件时工具注册会撤销。

### 独立结果观察插件

**tool-logger.ts**

```typescript
import type { Context } from "@deepseek-ai/cordis";
import type {} from "../../packages/core/tools/lib/index.js";

export const name = "tool-logger";
export const inject = ["tools"];

export function apply(ctx: Context) {
  ctx.on("tools/result", (exec, result) => {
    const text = result.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");
    console.log(`[tool-logger] ${exec.name} -> ${text}`);
  });
}
```

该插件不导入问候插件，通过 tools/result 事件观察工具结果。exec 提供执行信息，exec.name 是工具名；result.content 是内容块数组。map 取出文本块内容、将其他块映射为空字符串，join('') 再连接成文本。

### 准备完成后发起调用

**run-greet.ts**

```typescript
import type { Context } from "@deepseek-ai/cordis";
import type { ToolCallId } from "@deepseek-ai/dsh-llm";
import { brandString } from "../../packages/util/brand/lib/index.js";
import * as NativeToolExecutor from "../../packages/core/tool-executor-native/lib/index.js";
import * as ToolLogger from "./tool-logger.ts";
import * as GreetTool from "./greet-tool.ts";

export const name = "run-greet";
export const inject = ["tools"];

export async function apply(ctx: Context) {
  await ctx.plugin(NativeToolExecutor);
  await ctx.plugin(ToolLogger);
  await ctx.plugin(GreetTool);

  const result = await ctx.tools.execute({
    calls: [
      {
        type: "tool-call",
        id: brandString<ToolCallId>("demo-1"),
        name: "greet",
        arguments: JSON.stringify({ name: "Cordis" }),
      },
    ],
    signal: new AbortController().signal,
  });
  console.log(
    "tool replied:",
    JSON.stringify(result.results[0]?.result.content),
  );
}
```

三个 await ctx.plugin(...) 依次等待执行器、日志监听器和问候工具完成加载，然后才发起调用。这样不把调用准备顺序寄托在 YAML 列表位置上，也不会因为先发结果事件后注册监听器而漏掉本次日志。

| 调用字段                                    | 作用                                                |
| ------------------------------------------- | --------------------------------------------------- |
| calls                                       | 工具调用批次，本例只有一个调用。                    |
| type: 'tool-call'                           | 工具调用记录的类型标记。                            |
| id: brandString&lt;ToolCallId&gt;('demo-1') | 用 ToolCallId 类型标记本次关联标识。                |
| name: 'greet'                               | 选择已注册的 greet 工具。                           |
| arguments: JSON.stringify(...)              | 以 JSON 字符串提供参数，流水线再解析、校验为 args。 |
| signal                                      | 用于向执行过程传达取消信号。                        |

两处 execute 不要混淆：ctx.tools.execute 是统一调用入口；工具定义中的 execute(args) 是具体业务实现。调用入口负责选择执行器、查找工具、解析参数并通过流水线完成执行和结果处理。

### 当前组合与真实输出

**cordis.yml**

```yaml
- id: logger
  name: "../../vendor/logger-console/lib/index.js"
- id: system-prompt
  name: "../../packages/core/system-prompt/lib/index.js"
- id: tools
  name: "../../packages/core/tools/lib/index.js"
- id: run-greet
  name: "./run-greet.ts"
```

**学习时的运行记录**

```text
[tool-logger] greet -> Hello, Cordis!
tool replied: [{"type":"text","text":"Hello, Cordis!"}]
```

1. greet 工具的 execute 返回字符串 Hello, Cordis!。
2. output.render 生成包含 text 类型内容块的数组。
3. 流水线在结果处理过程中发出 tools/result。
4. 日志监听器先打印 [tool-logger] 一行。
5. ctx.tools.execute 的 Promise 随后完成，调用方再打印 tool replied。

run-greet 是父插件，挂载了原生执行器、日志与问候子插件。父插件卸载时，这些子插件及其所属注册也会按框架生命周期清理。这一天，我还没有执行完整 agent loop、模型请求、Web UI 或真实会话持久化实验。

## 易混概念与语法速查

| 问题                                  | 本次澄清的结论                                                         |
| ------------------------------------- | ---------------------------------------------------------------------- |
| 创建文件等于加载插件吗？              | 不等于。必须被 Loader 或 ctx.plugin 接入，并满足启动条件。             |
| 导入模块等于调用 apply 吗？           | 不等于。导入取得导出成员，Cordis 挂载机制进一步调用入口。              |
| apply 返回等于插件结束吗？            | 不等于。初始化完成后实例可处于 ACTIVE。                                |
| 写了 interface 就有服务了吗？         | 没有。类型声明不会创建运行时服务实例。                                 |
| config 与 Config 靠大小写自动匹配吗？ | 不是。YAML 字段、运行时导出、类型名和参数名各有职责。                  |
| next 必须叫 next 吗？                 | 名称可改，位置与调用语义由 waterfall 约定。                            |
| emit 会等待异步监听器吗？             | 不会等待它返回的 Promise；同步代码仍在调用时执行。                     |
| serial 会运行所有监听器吗？           | 不保证；遇到停止值就提前返回。                                         |
| waterfall 的输入就是最终输出吗？      | 不一定。最终结果由默认操作及各监听器返回值共同决定。                   |
| 没写 next 也会自动继续吗？            | 不会；不调用 next 会停止后续调用链。                                   |
| async () =&gt; value 是立即执行吗？   | 它先定义函数；需要调用才开始执行。                                     |
| void 是一个函数吗？                   | 这里是运算符，用于丢弃表达式结果。                                     |
| 默认值会修正错误类型吗？              | 不会。缺省可补值，错误类型应校验失败。                                 |
| volatile 会自己监视文件吗？           | 不会。它描述配置更新方式，监视和更新分发由其他机制负责。               |
| HMR 等于重启 Node 吗？                | 本次验证的是同一进程中替换插件实例。                                   |
| 无输出一定代表报错吗？                | 不一定。可能处于 PENDING，也可能是模块未加载等，需检查实际状态与日志。 |

| 语法 / API                                 | 理解方式与 Python 类比                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 函数参数名与类型名                         | config: GreetingConfig 中 config 是变量名，GreetingConfig 是类型；类似 Python 参数的类型注解。 |
| `class ... extends Service` / `super(...)` | 继承父类并调用父类构造，类似 Python 的 `class Child(Parent)` 与 `super().__init__(...)`。      |
| `() => value`                              | 无参数箭头函数，表达式体隐式返回 value；近似一个返回值的 lambda。                              |
| `return () => cleanup()`                   | 返回清理函数，不是马上调用；类似返回一个 lambda 或函数对象。                                   |
| 闭包                                       | 内层函数保留对外层变量的访问能力；用于清理 timer 或返回外层 text。                             |
| async / await                              | 异步函数与等待结果；可类比 Python 的 async def / await，但两种语言的调用启动行为不同。         |
| Map / get / set                            | 键值计数表；基本用法可类比 Python 字典。                                                       |
| `for...of`                                 | 逐项遍历值；可类比 Python 的 for x in values。                                                 |
| ?. / ??                                    | 空值时停止访问，以及 null/undefined 时取默认值；不能简单替换成真值判断。                       |
| `${value}`                                 | 字符串插值；可类比 Python f-string。                                                           |
| `map(...).join('')`                        | 逐项生成文本再连接；可类比列表推导式和 ''.join(...)。                                          |

## 验证边界、复习顺序与下一步

| 内容                           | 验证程度                                                             |
| ------------------------------ | -------------------------------------------------------------------- |
| 环境、第一章 hello             | 检查工具版本、依赖和已有构建文件；实际启动成功。                     |
| 生命周期                       | 实际观察启动、tick、清理与卸载完成的输出。                           |
| greeter 服务                   | 实际打印 Hello, world!；依赖更名、可选依赖等作为理解题与解释。       |
| stats 与 waterfall             | 实际得到计数输出，以及 HELLO / ** BLOCKED **。                       |
| 配置默认值与环境变量           | 实际得到默认问候与 Hi 问候；错误输入另做直接校验。                   |
| volatile / GreetingConfig 改名 | 我理解了机制与写法，还没有将其作为独立运行实验执行。                 |
| HMR / PENDING                  | 实际验证同进程代码重载，以及补齐 timer 前后的输出。                  |
| Harness 工具                   | 使用本地原生执行器，实际通过工具流水线执行并观察结果事件。           |
| 完整产品运行与仓库检查         | 未运行模型、Web UI、全套构建或全仓库测试；不据此声明这些路径已通过。 |

以后复习时，我打算按下面的顺序，再试着自己解释代码为什么会运行、何时会清理：

1. 从 hello.ts 和启动器开始，指出当前工作目录、YAML 路径、模块路径与入口调用位置。
2. 阅读 lifecycle.ts，区分 effect 主体和返回的 disposer，预测卸载后的定时器行为。
3. 阅读 greeter / consumer，区分类型声明、服务注册和 inject 名称。
4. 阅读 stats / reporter，按“先注册、后触发”追踪一次计数通知。
5. 阅读 waterfall-demo，分别手动追踪 hello 与 blocked words 两条调用与返回路径。
6. 阅读 config-demo，分别解释 YAML config、接口类型和运行时 Config 校验器。
7. 恢复 HMR 配置后修改 hello，观察清理和重新初始化；用 diagnose 排查缺少依赖。
8. 阅读当前第七章的三个文件，从工具注册追踪到调用、渲染、事件、返回。

接下来，我会沿着真实 Harness 的 dsh profile 与插件组合继续阅读，理解 base、headless、模型适配器、agent loop、Session 和持久化之间的关系。我也记住了一个边界：教程 CLI 是教学环境，接入真实应用时，仍要沿着受支持的 dsh profile 与 patch 方式来做。

## 参考资料

[Web UI 入门](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart)

[Cordis 入门与分发模式](https://deepseek-harness.github.io/deepseek-harness/reference/cordis-primer)

[Cordis Events API](https://deepseek-harness.github.io/deepseek-harness/reference/cordis-api/events)

[Cordis 教程总览](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/)

[第一个插件](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/01-first-plugin)

[生命周期与 effect](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/02-lifecycle-and-effects)

[服务](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/03-services)

[事件](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/04-events)

[配置](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/05-config)

[组合与 HMR](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/06-composition-and-hmr)

[进入 Harness](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/07-into-the-harness)

整理笔记时，我统一了示例中的问候文本、演示时长及部分类型名称，方便阅读；运行记录仍保留当日实验的结果和范围。复习时，我可以对照 .codex/cordis-tutorial 中的示例、vendor/cordis/bin.js，以及 Loader / Include / Fiber / Registry、tools 和原生执行器的实现。遇到网页和本地实现不一致的地方，我会把差异和实际跑到哪一步一起记下来。
