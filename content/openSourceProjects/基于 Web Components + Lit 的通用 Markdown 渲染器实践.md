---
title: 基于 Web Components + Lit 的通用 Markdown 渲染器实践
published: 2026-01-17
tags: ['web component', 'markdown', 'lit']
category: 开源
draft: false
---

在过去的几年里，我们和 AI 打交道的方式发生了明显变化：  
从最早的「一段纯文本回复」，到今天随处可见的代码块、高亮片段、数学公式、图片、表格、列表、引用块，甚至是渐进式的流式输出。  

一个朴素但不简单的问题：

> 「如何把接口返回的流式 Markdown 数据，高效、稳定地渲染成一套跨框架可复用的富文本 UI 组件？」

`wc-renderer-markdown` 便是在这样的背景下诞生的，它试图用 **Web Components + Lit** 打开一条新路径：  

- 既不被 React / Vue 等框架强绑定  
- 又不用在原生 DOM 上手写 diff  
- 还能在流式渲染场景中保证已渲染的部位稳定，光标不乱跳、选区不丢失  

---

## 1. 项目背景：从框架割裂到「一次实现，多端复用」

### 1.1 多模态 AI 带来的新需求

在日常使用 AI 的过程中，你可能已经习惯了这样的交互：

- 一段 Markdown 文本流式返回  
- 其中夹杂代码、列表、表格、图片、公式、提示块（admonition）等  
- 回复内容还可能随着上下文不断追加，用户一边阅读、一边选择、一边复制代码  

这与传统「一次性输出完整 HTML」完全不同：

- **内容是流式的（Streaming）**：分段到达，需要**增量渲染**  
- **结构是富文本的（Rich Text）**：需要细粒度的语义化渲染，而不仅仅是 `innerHTML`  
- **交互是实时的**：用户正在选择、滚动、聚焦输入框时，渲染不能打断体验  

### 1.2 现有方案的局限

在调研过程中可以发现几个典型方案：

- [`react-markdown`](https://github.com/remarkjs/react-markdown)：专为 React 设计  
- [`markstream-vue`](https://github.com/Simon-He95/markstream-vue)：专为 Vue 设计  

它们在各自生态内非常好用，但有两个现实问题：

- **强框架绑定**：React 项目用 React 方案，Vue 项目用 Vue 方案，每套都有自己的插件体系和扩展方式  
- **缺乏通用性**：如果你既维护 React 应用，又维护 Vue 应用，甚至还有一部分原生页面，就不得不在多个渲染方案之间来回切换

一个自然的发问是：

> 有没有一个「跨框架」的 Markdown 渲染器？  
> 不管是 Vue、React、Angular、Svelte，甚至纯 HTML，都能用同一套渲染内核？

### 1.3 原生 JS 的瓶颈

既然想做「跨框架」，直觉上最通用的方案是：

- 用 **原生 JS** 写一个 Markdown 渲染器  
- 输入 AST / 文本，输出 HTML DOM  

但在 AI 的流式场景下，单纯操作原生 DOM 很容易踩坑：

- 需要自己实现 **DOM diff**，否则每次更新都全量重绘，性能和能耗都会吃不消  
- 更致命的是：  
  - 全量重绘意味着原来的 DOM 被替换  
  - 用户此时的光标、选区、滚动位置都可能被打断  
  - 在流式响应过程中，用户几乎无法稳定选择/复制已生成内容  

这类问题，在很多「简单粗暴的流式渲染 demo」里都很常见。

### 1.4 Web Components + Lit 的破局思路

`wc-renderer-markdown` 选择了一条折中却优雅的路线：

- 使用 **Web Components** 作为跨框架的基础组件模型  
- 使用 **Lit** 提供的声明式模板和高效 diff，不再手写 DOM 操作  

这样带来几个非常重要的收益：

- **跨框架复用**：  
  - 只要浏览器支持 Web Components（Custom Elements + Shadow DOM），就能在任何框架中使用  
  - 无论是 Vue、React、Angular、Svelte，还是纯 HTML，都可以直接引用 `<wc-markdown>`  

- **渲染稳定性**：  
  - Lit 内置高效的 diff 过程  
  - 在流式追加内容时，只会对必要的节点做最小更新  
  - 已经渲染的部分尽可能稳定，避免光标丢失、选区闪烁  

- **开发体验**：  
  - 使用 `lit-html` 模板语法书写组件，而不是手写 `document.createElement`  
  - 利用响应式属性和状态系统，组件逻辑更清晰  

可以把它理解成：  

> 「用 Web Components 做跨框架 UI 的壳，用 Lit 做高效渲染的核。」

---

## 2. Monorepo 架构：解析与渲染各司其职

为了让这个渲染器既可复用、又便于扩展，`wc-renderer-markdown` 采用了 pnpm 的 Monorepo 结构，将不同职责拆分到多个子包中：

- **`markdown-parser`**  
  - 基于社区项目 [`stream-markdown-parser`](https://github.com/Simon-He95/vue-markdown-renderer/tree/main/packages/markdown-parser) 深度定制  
  - 负责把 Markdown 文本解析为 **结构化 AST**，而不是 HTML 字符串  
  - 定义了多种节点类型：`HeadingNode`、`ParagraphNode`、`ListNode`、`CodeBlockNode`、`ImageNode` 等  

- **`wc`**（核心渲染层）  
  - 名字即 `wc-renderer-markdown` 主包  
  - 输入：`markdown-parser` 解析后的 AST  
  - 输出：基于 Lit 的 Web Components 树  
  - 核心入口组件是 `<wc-markdown>`（即 `MarkdownElement`）

- **`wc-react`** / **`wc-vue`**  
  - 针对 React / Vue 的封装层  
  - 负责解决 Props vs Attributes、事件桥接等兼容性问题  
  - 最终在 React / Vue 里可以像使用普通组件那样使用 `<Markdown />`  

- **Playground：`playground/html`、`playground/react`、`playground/vue`**  
  - 提供原生 HTML、React、Vue 的使用示例  
  - 可以直观看到渲染效果和交互体验  

- **`doc`**  
  - 基于 VitePress 的文档站点  
  - 内部也是用 `<wc-markdown>` 渲染自己的文档 Markdown

这种设计有几个好处：

- Markdown 解析逻辑完全**独立于任何 UI 框架**  
- 渲染层专注于 AST → UI 的映射  
- 适配层专注于框架集成逻辑（React/Vue）  

你可以选择：

- 只使用 `markdown-parser` 做 AST 解析，然后自定义自己的渲染逻辑  
- 直接使用 `wc-renderer-markdown` + `wc-renderer-markdown-react`/`wc-renderer-markdown-vue` 完整方案  

---

## 3. 核心实现：从 AST 到可扩展的 Web Components

这一部分，我们深入到三个关键点：

1. 声明式组件注册与 AST 节点映射  
2. Shadow DOM + CSS Variables 的主题系统  
3. React / Vue 适配层如何与 Web Components 协同

### 3.1 统一的 Markdown 节点抽象

在渲染逻辑进入到具体组件之前，`wc-renderer-markdown` 先做了一层统一抽象：  
所有从 `markdown-parser` 解析出来的节点，都会被映射到两类基类之一：

- 面向 Markdown AST 的 `NodeElement<T extends BaseNode>`  
- 面向原生 HTML 节点的 `HtmlNodeElement<Props>`  

可以简单理解为：

- `NodeElement` 负责承载「语义化 Markdown 节点」，暴露 `node`、`props` 和 `markdownRoot` 三个核心属性  
- `HtmlNodeElement` 则面向「原生 HTML / 自定义标签」，只有 `props` 和 `markdownRoot`

两者内部都维护了一张静态映射表 `components`：

- 对于 `NodeElement`，key 是 Markdown 节点类型（如 `heading`、`paragraph`）  
- 对于 `HtmlNodeElement`，key 是 HTML 标签名（如 `div`、`details` 或自定义标签）

渲染时，`renderComponents` / `renderComponent` 会根据节点类型或标签名，从对应的映射表里找到真正的 Web Component 标签并完成挂载。  
这样一来，渲染层只需要「遍历节点并调用渲染函数」，而不必关心每一种节点的具体实现，新的语法或自定义标签也只需要继承这两个基类即可接入整套管线。


### 3.2 声明式组件注册：`@customElement` 装饰器

在 Web Components 中，通常需要手动调用：

```ts
customElements.define('wc-heading', HeadingElement)
```

在 `wc-renderer-markdown` 里，希望做到两件事：

1. **统一组件前缀**，避免全局命名冲突  
2. **自动维护「Markdown 节点类型 → Web Component 标签」的映射表**，从而可以根据 AST 动态渲染组件树  

因此基于 `lit/decorators.js` 的 `customElement` 实现了一个增强版装饰器：

```ts
import { unsafeStatic } from 'lit/static-html.js';
import { config } from '@/config';
import { customElement as _customElement } from 'lit/decorators.js';
import NodeElement from '@/node/NodeElement';
import HtmlNodeElement from '@/node/HtmlNodeElement';

export function customElement (name: string, elementName?: string) {
  elementName = elementName ?? name.replace(/_/g, '-');
  if (!/^[a-z-]+$/.test(elementName)) {
    throw new Error(`elementName must only contain lowercase letters and hyphens, got: ${elementName}`);
  }

  const realName = `${config.componentPrefix}-${elementName}`;
  return <T extends CustomElementConstructor> (target: T) => {
    if (target.prototype instanceof HtmlNodeElement) {
      HtmlNodeElement.components[name] = unsafeStatic(realName);
    } else {
      NodeElement.components[name] = unsafeStatic(realName);
    }
    return _customElement(realName)(target);
  };
}

```

这个装饰器做了几件事：

- **自动补全前缀**：  
  - 项目通过 `config.componentPrefix` 统一定义组件前缀，例如 `wc`  
  - 只要写 `@customElement('heading')`，真实注册的标签就是 `<wc-heading>`  

- **自动维护 Node → Tag 映射**：  
  - 如果组件继承自 `NodeElement`，则将 `NodeElement.components[name]` 指向对应标签名  
  - 如果组件继承自 `HtmlNodeElement`，则存入 `HtmlNodeElement.components`  

这样，在定义组件时，开发者只需要关注「这个组件对应哪种 Markdown 节点」即可：

```ts
// packages/wc/src/components/Heading/index.ts
@customElement('heading') // 注册为 <wc-heading>，并映射 markdown 节点类型 "heading"
export default class extends NodeElement<HeadingNode> {
  // ...
}
```

在渲染时，则通过 `renderComponents` 动态计算组件标签：

```ts
export function renderComponent (node: ParsedNode, props: object) {
  const tag = computeTag(node);
  if (node.loading) {
    const loadingTag = unsafeStatic(`${config.componentPrefix}-loading`);
    return staticHtml`<${loadingTag}/>`;
  }
  return staticHtml`<${tag} .node="${node}" .renderComponents="${renderComponents}" .renderComponent="${renderComponent}" .props="${props}"/>`;
}
```

`computeTag` 内部会根据 `node.type` 在 `NodeElement.components` 中查找对应的 Web Component 标签。  
如果未注册，会 fallback 到一个默认的文本组件，并在控制台给出 `tag not register` 的警告，方便调试。

从使用体验上，你只需要做两件事：

1. 在 `markdown-parser` 中定义新的节点类型  
2. 在 `wc` 包中写一个对应的 `NodeElement` 实现，并用 `@customElement('your_node_type')` 标注  

就能在整个渲染管线中无缝接入新的 Markdown 语法。

### 3.3 从 AST 到 UI：`<wc-markdown>` 的渲染流程

核心入口组件 `MarkdownElement` 的职责非常清晰：

1. 接收外部传入的 `content`（Markdown 字符串）  
2. 使用 `stream-markdown-parser` 将其解析为 AST  
3. 调用 `renderComponents(nodes)` 将 AST 转换为组件树  
4. 处理一些 UX 相关的能力（例如自动滚动到底部）

简化后的渲染逻辑如下：

```ts
@customElement('markdown')
export default class MarkdownElement extends LitElement {
  static styles = [cssvar, style];

  @property({ attribute: 'content' })
  content?: string = '';

  @property({ attribute: 'dark', reflect: true, type: Boolean })
  dark = false;

  @property({ attribute: 'auto-scroll-2-end', reflect: true, type: Boolean })
  autoScroll2End = false;

  render () {
    const md = getMarkdown();
    const nodes = parseMarkdownToStructure(this.content, md);
    return html`
      <div class="box">${renderComponents(nodes)}</div>
      ${this.autoScroll2End ? html`<span/>` : null}
    `;
  }
}
```

关于这套渲染流程，有几个细节值得注意：

- **解析与渲染解耦**：  
  - `getMarkdown` / `parseMarkdownToStructure` 来自 `stream-markdown-parser`  
  - `wc-renderer-markdown` 只关心「如何根据 AST 渲染 Lit 组件」  

- **上下文传递**：  
  - 通过 `@provide` + `markdownRootContext` 将 `MarkdownElement` 作为上下文提供给所有子节点  
  - 子组件通过 `@consume` 获取当前的 Markdown 根节点实例（如在 `NodeElement`、`HtmlNodeElement` 中）  
  - 这为后续实现诸如「节点间联动」「外部控制滚动/高亮某一段」打下基础  

- **流式渲染友好**：  
  - 当 `content` 属性不断更新追加内容时，Lit 会对模板进行增量 diff  
  - 已渲染部分不会被整体替换，从而保证了选区和光标的稳定性  


### 3.4 Shadow DOM + CSS 变量：构建可主题化的 Markdown UI

Markdown 渲染器的另一个常见痛点是：**样式很容易被全局 CSS 污染**。

- 页面全局有一份 `p { margin: 0 }`，可能会影响 Markdown 段落  
- 外部的 `code`、`pre` 样式可能与 Markdown 渲染器的预期冲突  

在 `wc-renderer-markdown` 里，借助 Web Components 的 Shadow DOM 能力，将每个组件的样式和结构封装在一起：

- 每个 Markdown 元素组件都有自己的 `index.lit.css`：  
  - 如代码块组件 `CodeBlock`、提示块 `Admonition`、表格 `Table` 等  
  - 外部样式无法直接影响内部结构  

在此基础上，通过 **CSS Variables（自定义属性）** 把主题能力暴露出来：

- 每个组件可以定义自己的 `var.lit.css`，声明一组可配置变量  
- 这些变量在 `packages/wc/src/markdown/var.ts` 中被聚合：

```ts
import AdmonitionCssVar from '@/components/Admonition/var.lit.css';
// ...

export default [
  AdmonitionCssVar,
  ...
] as CSSResult[];
```

然后在 `MarkdownElement` 中统一挂载：

```ts
@customElement('markdown')
export default class MarkdownElement extends LitElement {
  static styles = [cssvar, style];
  // ...
}
```

每个具体组件内部，则通过 `:host` 和 `:host([dark])` 等选择器实现主题切换，例如在 `Admonition` 的 `var.lit.css` 中：

```css
:host {
  --admonition-bg: #f8f8f8;
}
:host([dark]) {
  --admonition-bg: #0b1220; /* 暗黑模式自动适配 */
}
```

搭配 `<wc-markdown dark>` 这一属性，就可以在整个 Markdown 渲染树内统一切换暗色主题。

这种方式的优点是：

- **样式隔离**：Shadow DOM 隔离内部实现，避免被外部 CSS 意外影响  
- **主题可配置**：通过 CSS 变量向外暴露可调节参数，用户可以在全局层面覆写  
- **暗黑模式友好**：`[dark]` 属性 + CSS 变量，使得暗色主题的维护成本大幅降低


### 3.5 框架适配层：在 React / Vue 里像用原生组件一样用它

虽然 Web Components 理论上可以直接在任何框架中使用，但在实际落地时，仍然存在几个细节问题：

- Props / Attributes 的映射规则不同  
- 事件机制不完全一致  
- 在 React / Vue 世界中，我们更希望以「组件」的方式导入和使用  

因此 `wc-renderer-markdown` 为 React / Vue 提供了友好的封装。

#### 3.4.1 React 封装：`wc-renderer-markdown-react`

这里使用 `@lit/react` 提供的能力（不然也可以使用原生的方式），将 `MarkdownElement` 封装为 React 组件 `Markdown`：

```ts
import React from 'react';
import { createComponent } from '@lit/react';
import MarkdownElement, { config } from 'wc-renderer-markdown';

const Markdown = createComponent<MarkdownElement>({
  tagName: `${config.componentPrefix}-markdown`,
  elementClass: MarkdownElement,
  react: React,
  displayName: 'Markdown',
});

export default Markdown;
```

使用时非常直观：

```tsx
import Markdown from 'wc-renderer-markdown-react'
<Markdown content={markdown} />
```

更进一步，针对「自定义节点使用 React 组件渲染」的场景，库还提供了 `use` 辅助方法和 `customElement` 装饰器：

- 内部会创建一个继承自 `NodeElement` / `HtmlNodeElement` 的自定义元素  
- 在其 `shadowRoot` 内挂载 React 组件（支持 React 16 / 18 的双实现）  
- 从而实现「Markdown AST 节点 → Web Component → React 组件」链路上的无缝打通

#### 3.4.2 Vue 封装：`wc-renderer-markdown-vue`

Vue 这侧的封装类似：

```ts
import { defineComponent, h } from 'vue-demi';
import { config } from 'wc-renderer-markdown';

const Markdown = defineComponent({
  name: 'Markdown',
  props: {
    content: String,
    dark: Boolean,
    autoScroll2End: Boolean,
  },
  setup (props, { attrs, slots }) {
    return () => h(
      `${config.componentPrefix}-markdown`,
      {
        ...attrs,
        ...props,
      },
      slots.default?.(),
    );
  },
});

export default Markdown;
```

配合 `playground/vue/src/App.vue`，使用方式非常接近普通 Vue 组件：

```vue
<template>
  <Markdown :content="markdown" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Markdown from 'wc-renderer-markdown-vue'

const markdown = ref(`# Welcome to WC Markdown Renderer`)
</script>
```

同样，Vue 这侧也有一套 `use` 帮助方法，用于把 Vue 组件包装成可被 Markdown AST 节点复用的 Web Component。

---
 
## 4. 未来规划

当前版本的 `wc-renderer-markdown` 已经支持：

- 基于 Lit 的 Web Components 渲染  
- KaTeX 数学公式  
- Shiki 代码高亮与主题切换  
- Vue / React 封装与自定义节点扩展  
- 流式 Markdown 解析与渲染  

- ** 更高效的流式解析 **: 
  - 引入 web worker 的能力：在单独的线程中完成解析 Markdown 内容为 ast 的过程，避免渲染线程卡顿
  - 流失解析能力：新增 `MarkdownStreamParser` 类，提供但不限与以下接口：
    - `on('data', (data) => {})`：当解析到新的 AST 节点时触发  
    - `on('end', () => {})`：当解析完成时触发  
    - `on('error', (err) => {})`：当解析过程中出错时触发  
    - `append`: 追加 Markdown 内容到解析器内部，并继续解析
    - `clear`: 清空解析器内部缓存，准备解析新的内容
    - `nodes`: 获取当前解析完成的 AST 节点列表

- **服务端渲染（SSR）**：  
  - Lit 本身提供 SSR 能力  
  - 未来可以在服务端完成部分 Shadow DOM 渲染，提升首屏性能  
  - 对 SEO 要求较高的内容型页面尤为友好  

- **更丰富的主题与样式扩展**：  
  - 基于现有 CSS Variables 体系，沉淀更多内置主题（如文档风、博客风、笔记风）  
  - 为代码块、公式、提示块等组件提供更细颗粒度的自定义入口  

- **与Markdown编辑器集成**：
  如何与现有的 Markdown 编辑器（如 VS Code、Typora 等）集成，实现实时预览？  

- **更多框架生态集成**：  
  - 虽然 Web Components 已经天然支持在各种框架中使用  
  - 但针对 Angular、Svelte 等生态，可以进一步提供「更贴近框架习惯」的封装层  

---
