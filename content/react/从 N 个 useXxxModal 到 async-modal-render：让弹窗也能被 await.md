---
title: 从 N 个 useXxxModal 到 async-modal-render：让弹窗也能被 await
published: 2026-01-30
tags: [开源项目]
category: react
draft: false
---
## 背景：从回调地狱到线性流程

在 React 里，传统的弹窗调用方式通常长这样：

- 组件里用 `useState` 维护 `visible`
- 点击按钮时把 `visible` 置为 `true`
- 把业务逻辑塞进 `Modal` 的 `onOk` / `onCancel` 回调

看起来很正常，但一旦业务变复杂，问题就开始暴露：

- 业务流程被拆散在多个回调里，阅读代码时需要在文件里来回跳转
- 状态管理和副作用交织在一起，出错时不好排查
- 多步交互（比如表单校验 → 二次确认 → 提交接口）会被拆成一堆嵌套回调

更现实一点的例子是：在一个中大型的后台项目里，你会发现到处都是 `XxxxModal` 组件，每个组件旁边都配套一个 `useXxxxModal` Hook，把弹窗的展示和回调逻辑内聚进去。

这种模式有它的好处：调用方只需要 `const { open } = useXxxxModal()`，然后在按钮点击的时候 `open()` 即可，业务逻辑相对集中在这个 Hook 里。

但当项目里有N个弹窗，就意味着有N个 `useXxxxModal`。你打开目录，全是 `useXxxModal.ts`，看着非常难受——难受到某一天，一怒之下先难受了一下，然后冷静下来想：既然是我难受，那就本着“谁难受谁解决”的原则，把这套模式抽象成一个通用的库。

于是，有了 async-modal-render。

## 反思：为什么一定要自己写N个 Hook？

回头看业务代码里的弹窗，实际上都有几个明显的共同点：

- UI 形态差不多：都是一个 Modal/Dialog，只是内容不同
- 行为类似：都是“确定 / 取消”两条路径，要么得到一个结果，要么放弃
- 展示方式统一：组件通常叫 `XxxxModal`，配套一个 `useXxxxModal`，由 Hook 内部负责挂载和卸载

换句话说，我们其实是在重复造同一种轮子：每个业务弹窗都在自己实现“把回调封装成一个 Promise 的返回值”。只不过，这个 Promise 包在了各自的 `useXxxxModal` 里。

如果我们把视角从“一个个业务 Hook”提升到“弹窗这个交互模式”，会发现这件事完全可以交给一个公共库来做：

- 弹窗组件只负责展示和触发 `onOk` / `onCancel`，不关心调用方式
- 调用方用 `async/await` 写线性的业务代码，不需要自己管理状态
- 中间这层“把回调 Promise 化、负责任务收尾”的脏活累活，全部交给库来完成

于是我给这个库定了几个原则：对业务代码“零侵入”“高复用”，让“写一个弹窗”这件事从“再写一个 Hook”变成“用一行 `await`”。

## 设计：从几个具体痛点倒推出来的架构

当时给自己列了这样一份 checklist：

- 能够以极低的成本调用 n 个已有的业务弹窗
- API 方式要简单，调用者只看到 `await` 和返回值
- 高内聚、低耦合：弹窗组件完全不知道自己会被这个库调用
- 有一套友好的说明文档、示例和对比说明
- 兼容 React 16+ 的所有版本，对构建工具选择足够谨慎（选 dumi 2）
- 稳定：核心分支都要被用例覆盖，测试框架选 vitest 4

围绕这些目标，逐步演化出了现在的几个核心设计。

### 1. Promise 化的调用：一个入口，多种形态

最顶层只有一个核心能力：**把“弹窗的生命周期”变成一个可 `await` 的 Promise**。在实现上拆成了三种使用姿势：

- 函数式调用：`asyncModalRender(Component, props, container?, options?)`
- Hook 模式：`const { render, holder } = useAsyncModalRender()`
- Context 模式：`<AsyncModalRenderProvider>` + `useAsyncModalRenderContext()`

无论哪种方式，调用者看到的都是统一的形态：

```ts
const data = await render(MyModal, props, options)
// 或者
const data = await asyncModalRender(MyModal, props, container, { quiet })
```

内部则通过一个统一的实现 `asyncModalRenderImp` 来处理：

- 负责把组件的 `onOk` / `onCancel` 包装成 Promise 的 `resolve` / `reject`
- 在 `onOk` / `onCancel` 之后调用 `options.onClose` 做收尾（卸载、隐藏等）
- 在 Quiet 模式下，把“取消”改造成 `resolve(undefined)` 而不是 `reject`

这样做的好处是：

- 所有渲染路径（static / hook / context）只在“挂载方式”上有差异
- “业务逻辑 → Promise → 组件交互”这一条链路只有一个实现，便于测试和演进

### 2. 高内聚、低耦合：弹窗组件保持“纯”

一个重要的设计目标是：**弹窗组件本身对 async-modal-render 无感**。

也就是说，业务侧写的组件只是一个普通的 React 组件：

- 接收 `onOk` / `onCancel` 这两个回调
- 在用户操作时自己选择何时调用它们
- 不需要引入任何特定 Hook 或上下文

这样一来：

- 组件可以独立存在，被页面直接用 `<XxxxModal />` 的方式挂进去也完全没问题
- 如果业务里已经有成熟的弹窗组件，只要把回调签名适配成 `onOk` / `onCancel` 即可

为了解决“现有组件的回调名不统一”的问题，库里额外提供了一个 `withAsyncModalPropsMapper`：

- 比如已有组件用的是 `onFinished` / `onClose`
- 通过 `withAsyncModalPropsMapper(Comp, ['onFinished', 'onClose'])`
- 就能生成一个“标准化后的组件”，直接交给 `render` 使用

这一层映射逻辑做成了 HOC 的形式，并对持久化场景做了缓存和引用检查，避免因为组件引用变化导致 React 状态丢失。

### 3. 兼容 React 16+ 的静态渲染：staticRender 把坑踩了一遍

为了让 `asyncModalRender` 能在“任何地方”被调用（不依赖 Hook/Context），必须有一套**可靠的静态渲染方案**：

- 在 React 16/17 时代用 `ReactDOM.render` / `unmountComponentAtNode`
- 在 React 18 用 `createRoot(container).render(element)` + `root.unmount()`
- 在 React 19+（移除了 `ReactDOM.render`）只能走 `react-dom/client`

`staticRender` 做的事情就是：

- 动态按需加载 `react-dom` / `react-dom/client`
- 根据版本号判断走哪条分支
- 在容器节点上复用 `__reactCompatRoot`，避免重复创建 Root
- 返回一个统一的卸载函数，用于在弹窗关闭时清理 DOM

这块踩过几个坑：

- 早期版本在 React 19 下会因为直接调用 `ReactDOM.render` 报错
- React 18 的 Root 管理如果不做复用，很容易在文档站/热更新场景下出现重复挂载

最后把这些细节都收敛在 `staticRender` 里面，业务调用方只需要知道：“给我一个 DOM 容器，我负责把弹窗挂上去并在结束时卸载掉”。

### 4. Hook + Context：复用一份能力，覆盖不同场景

业务里已经有大量的“用 Hook 控制弹窗”的惯性，完全抛弃 Hook 体验并不现实，因此在 `asyncModalRender` 之外，还设计了：

- `useAsyncModalRender`：在组件内部通过 Hook 管理弹窗
- `AsyncModalRenderProvider` + `useAsyncModalRenderContext`：在应用根部注入能力

这两者本质上都是对同一套实现的不同包装：

- `useAsyncModalRender` 内部通过一个 `ElementsHolder` 组件，把所有弹窗元素挂在一个统一容器里
- `AsyncModalRenderProvider` 简单地在 Context 中暴露 Hook 返回的那些方法，并把 `holder` 一并渲染出来

为了解决“谁来负责销毁”的问题，Context 还多了一层 `destroyStrategy`：

- `hook`：跟随消费方组件的卸载自动清理
- `context`：不随组件卸载，适合全局控制场景，需要显式调用 `destroy`

这部分的逻辑在 `AsyncModalRenderContext` 里做了统一封装，并通过测试确保：

- Provider 卸载时，不会留下孤儿弹窗 DOM
- 多次调用 `destroyModal` 是幂等的
- 在未注入 Provider 的情况下调用，会抛出清晰的错误提示

### 5. 持久化和销毁：把“状态留在弹窗里”

在日常业务里，有不少弹窗需要“关掉以后再打开还能保留内部状态”，比如：

- 复杂表单
- 富文本编辑器
- 多步骤导入向导

如果每次都销毁组件，再重新挂载，就意味着内部状态全部丢失。于是引入了两个关键配置：

- `persistent`: 标识某个弹窗实例的“持久化 key”，支持 string / number / symbol
- `openField`: 指定组件 props 中负责控制显隐的那个 boolean 字段，比如 `open` / `visible`

在持久化模式下：

- 第一次打开时挂载组件，并把 `openField` 置为 `true`
- 关闭时不销毁组件，而是 `cloneElement` 一份，把 `openField` 改成 `false` 再 patch 回去
- 下次用同一个 `persistent` key 打开，拿到的是同一个组件实例，内部状态自然能被保留

对应地，还提供了一个 `destroy` 方法，用来：

- 按 `persistent` 定位并销毁某个持久化弹窗
- 可选地按可见性筛选（仅销毁 visible / hidden 的实例）

为了防止误用，在实现里加了一个 `PersistentComponentConflictError`：

- 同一个 `persistent` key 如果对应了不同的组件构造器，会直接抛错
- 避免出现“你以为是同一个弹窗，其实已经换了组件，导致 React 状态错乱”的隐性 bug

### 6. Quiet 模式：给调用方一个“不吵闹”的选择

在很多场景里，“用户取消”本质上并不是一个错误：

- 用户点了“取消”，业务上通常认为是一个正常分支
- 如果每次都 `reject`，调用方就必须在 `catch` 里区分取消和真实错误

为此抽象出了 Quiet 模式：

- 普通模式：`onCancel` → `reject AsyncModalRenderCancelError`
- Quiet 模式：`onCancel` → `resolve(undefined)`，不再抛错

在 API 层面有两种写法：

- `renderQuiet` / `renderQuietFactory`：已经帮你把 `quiet: true` 填好了
- `render` / `renderFactory`：通过 `options.quiet` 手动开启

这样调用方可以根据场景选择：

- 严肃的业务流程（必须区分“用户取消”和“接口出错”）用普通模式 + `try/catch`
- 轻量交互（比如一个输入弹窗，用户不想填就直接关掉）用 Quiet 模式，按返回值是否为 `undefined` 分支即可

### 7. 类型系统：把“错误的使用方式”尽量挡在编译期

既然是一个强依赖 `async/await` 的库，类型系统就非常关键，尤其是：

- `asyncModalRender` / `render` 的返回值类型应该能自动推导自组件的 `onOk` 入参
- `persistent` + `openField` 的组合要有一定的约束，避免传错字段名
- `renderPersistent` 这类 API 应该在类型层面强制要求参数完整

这部分主要通过一系列类型体操来完成：

- 利用条件类型从 `D['onOk']` 中提取返回值 `R`，自动推导 Promise 的 `resolve` 类型
- 用 `ExtractBooleanKeys<D>` 拿到所有 boolean 类型的 prop 名，约束 `openField`
- 在 Quiet 模式下通过 `ComputeQuiet<Quiet, R>` 把返回值包装成 `R | undefined`

可见的效果是：

- 业务侧几乎不需要手写泛型，IDE 就能给出正确的返回值提示
- 很多“潜在的误用”在写代码时就会被 TS 报出来，而不是等到运行时踩坑

### 8. 文档与测试：让“库”和“业务项目”都心里有数

为了让这个库在真实项目里可用，而不是“我自己能看懂”，当时专门做了两件事：

- 文档系统选了 dumi 2：既能承载 markdown 文档，又能跑 demo 组件
- 测试框架选 vitest 4：和 Vite 生态相对契合，性能也足够

围绕核心能力写了一整套用例，包括但不限于：

- `asyncModalRender` 的基本行为（挂载、卸载、resolve/reject）
- Hook 模式的 `render` / `renderFactory` / `destroy` 以及幂等性
- 持久化模式下的状态保留、按 key 销毁、数字和 symbol Key 支持
- Context 模式下的 Provider 生命周期、销毁策略、错误提示
- `withAsyncModalPropsMapper` 的行为和缓存策略

这些用例并不追求“形式上的 100% 覆盖率”，而是尽量覆盖所有分支和边界条件，让库的行为在不同 React 版本、不同调用路径下都保持一致。

## 实现过程：从 0.0.1 到 0.0.6 之前

回顾 0.0.6 之前的版本，大致可以分成几步。

### 0.0.1：最小可用版本

- 抽出统一的“回调 → Promise” 实现，提供 `asyncModalRender` 静态函数
- 定义最小的 `AsyncModalProps` 接口，只约定 `onOk` / `onCancel`
- 把几个典型业务弹窗迁移到 Promise 链路上，验证写法与边界行为

### 0.0.2：适配存量组件

- 发现业务里回调命名五花八门（如 `onFinished` / `onClose` 等）
- 抽象出 `withAsyncModalPropsMapper`，以 HOC 方式统一映射到 `onOk` / `onCancel`
- 顺带整理了相关文档和类型导出，作为这一版的核心改动

### 0.0.3：补齐测试与静态渲染

- 解决 `asyncModalRender` 卸载不干净、残留 DOM 的问题
- 为 React 18/19 重写 `staticRender`，加入版本探测与 `createRoot` 复用
- 补齐从挂载到卸载的集成测试，让静态渲染行为收敛、可验证

### 0.0.4：工具链与类型体验

- 处理 dumi 2 携带的 React 版本与项目依赖冲突，修正文档构建问题
- 调整构建和文档配置，优化类型导出与导入方式

### 0.0.5 及之后：持久化能力与细节打磨

- 引入 `persistent` / `openField` 与 `destroy` API，将持久化能力变成一等特性
- 补充测试：验证多次打开状态保留、不同 key 的隔离，以及各种销毁组合
- 为持久化场景增加 `PersistentComponentConflictError`，防止相同 key 绑定不同组件
- 在文档中补充与 NiceModal、传统写法的对比说明，讲清楚设计取舍

## 后知后觉：遇见 NiceModal 之后

做到这一步之后，我才后知后觉地发现：社区里其实已经有了一个类似的库——`@ebay/nice-modal-react`。

第一次看 NiceModal 的文档时，心情大概是：

- 一方面“啊，原来大家都在为弹窗这件事头疼”
- 另一方面“还好我走的路线跟它不完全一样”

更重要的是，NiceModal 确实给了我不少启发，尤其是在两个点上：

### 1. 持久化：让弹窗更像“页面的一部分”

NiceModal 里很早就有“隐藏而不卸载”的设计，这和我后来做的 `persistent` 能力在理念上非常契合：**弹窗不一定是一次性的，它可以像页面一样长期存在，只是偶尔被展示出来**。

这也从侧面印证了当初在业务里感受到的那种“不想每次都重置状态”的痛点是普遍存在的。于是我也更加坚定地把：

- `persistent` / `openField`
- `destroy` API
- 以及相关的错误保护

当成库的一等公民来维护，而不是“某个高级用法”。

### 2. 取消不一定是错误：Quiet 模式的诞生

另一个被 NiceModal 强化的直觉是：**onCancel 不一定非得走 `reject`**。

很多时候，“用户取消”只是业务流程里的一个正常分支：

- 用户点了“关闭”按钮
- 用户按了 ESC
- 用户在某一步操作中选择“算了”

如果统一走 `reject`，调用方就不得不在 `catch` 里区分“正常取消”和“真正的错误”，不仅增加了心智负担，还容易在不小心的时候吞掉异常。

因此在 async-modal-render 里我引入了 Quiet 模式：

- 通过 `renderQuiet` / `renderQuietFactory`，把“取消”转化为 `resolve(undefined)`
- 调用方只需要写：

  ```ts
  const result = await renderQuiet(MyModal, props)
  if (result === undefined) {
    // 用户取消
  } else {
    // 用户确认，拿着 result 继续走
  }
  ```

这种写法在语义上更贴近“分支逻辑”，也减少了对异常通道的滥用。

### 3. 保持“零侵入”的坚持

NiceModal 带来的另一个重要思考是：**如何在借鉴功能的同时，保持自己的设计哲学**。

NiceModal 的一个取舍是：UI 组件内部需要显式引入 `useModal`、依赖自身的全局状态管理。这在很多场景下很方便，但同时也让组件和库之间形成了强耦合。

而 async-modal-render 从一开始就坚持：

- 弹窗组件不需要知道自己是被谁调用的
- 最终导出的组件仍然是一个“普通的 React 组件”
- 如果哪天不用这个库了，组件本身不需要重写

所以在借鉴 NiceModal 的同时，我没有改变这条原则，而是把：

- 持久化
- Quiet 模式
- 上下文渲染

等能力全部放在调用层来实现，尽量让业务组件保持“纯净”。

## 尾声：从“谁难受谁解决”到“让别人不再难受”

回头看 async-modal-render 的这段演进，其实就是从一个很朴素的动机出发：

- 一开始只是因为自己被“N个 useXxxxModal”恶心到了
- 然后想把这套模式抽象出来，至少先让自己不再重复造轮子
- 接着在项目里试用、打磨、填坑，把行为收敛成一个稳定的库
- 最后再参考社区方案（比如 NiceModal），把一些成熟的思路吸收进来

如果你现在也正被“到处都是回调的弹窗逻辑”困扰，希望这篇文章能给你一点启发：

- 把弹窗当成一个“可 await 的过程”，而不是一个“到处都是回调的组件”
- 把通用的部分交给库，业务代码只关注“用户点了确定之后要做什么”
- 在设计自己的基础库时，从真实的痛点出发，再结合社区现有方案，会走得更稳

而对我来说，async-modal-render 也还在继续演进中：React 自己的更新、UI 库的变化、业务场景的新需求，都会推动这个库不断调整设计。但至少有一点不会变——**让写弹窗这件事，尽量不要再让人难受**。

## 规划

- 先在业务项目小组内推广试用，等到线上项目稳定运行并获得足够的正向反馈后，再以“新增一个 Hook 能力”的方式集成到统一组件库中。
- 持续根据业务和实际使用情况修复、扩展功能，同时保持测试用例同步跟进，尽量维持核心逻辑 100% 覆盖率。
