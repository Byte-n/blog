---
title: 基于文件系统的自动路由（哈希）AutoRouter
published: 2025-11-10
tags: [路由]
category: React
draft: false
---

获取pages目录结构动态构造路由

 `const req = require.context('@/pages', true, __AUTO_ROUTER_REG__, 'lazy')`

路由组件都动态导入，路由的`component` 设置为`Loadable({ loader, loading: Loading })`

- `loading`：自定义的加载提示组件
- `loader` 的签名为

```tsx
Promise<React.ComponentType<Props> | { default: React.ComponentType<Props> }>
```

借助req可以轻松实现这一点`() => Promise.resolve(req(key))` ，`key` 是`req.keys()` 的项。

`Loadable` 是一个高阶组件，它会返回一个新的组件，此组件内部会调用`loader` 加载异步导入的组件(`import(xxx)`)。在加载完成前，会展示`loading` 对应的组件。

`Loadable` 来自`'react-loadable'` 库。
也可以使用`React.lazy` + `Suspense` 来实现：

```tsx
// React 官方方案示例
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyComponent />
    </Suspense>
  );
}
```
