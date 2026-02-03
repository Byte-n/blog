---
title: React 性能优化实战：解决低配设备上大列表渲染卡顿问题
published: 2025-11-02
tags: ['性能优化']
category: react
draft: false
---
## 一、背景

### 1.1 硬件环境

在工位屏嵌入式平板设备（供应商定制一体机）上运行的第一版分拣系统在测试阶段发现存在严重的性能问题：
小霸王都比这机器流畅。

- **CPU**：未知型号（性能较弱）
- **内存**：4GB 总内存，实际可用约 2GB
- **WebView 内核**：腾讯 X5

### 1.2 问题描述

当分拣任务列表中的卡片数量较多时（≥121 个），界面出现明显的响应延迟：

- **场景 1**：点击左侧订单 Tab 后，右侧分拣区域的卡片渲染耗时 **>3 秒**
- **场景 2**：打开批量操作弹窗加载所有项时，同样存在 **>3 秒左右**的卡顿
- **用户体验**：点击后响应缓慢，严重影响分拣效率

## 二、问题分析

---

### 2.1 性能瓶颈定位

问题：

1. **全量渲染**：所有卡片（121+ 个）同时渲染，大量 DOM 节点创建
2. **重复渲染**：组件更新 3 次才完成（理想情况应为 1 次）
3. **函数重建**：每次渲染都创建新的回调函数，导致子组件无效更新
4. **状态依赖过度**：组件监听了整个 Store 而非具体字段

### 2.2 根本原因

- **缺少虚拟化**：未使用虚拟列表技术，可视区外的元素也被渲染
- **缺少 Memoization**：未使用 `React.memo`、`useMemo`、`useCallback` 优化
- **Props 不稳定**：内联函数和对象导致 props 引用变化
- **全局状态滥用**：不必要的全局状态订阅导致级联更新

---

## 三、优化方案

### 3.1 引入虚拟列表/虚拟网格

### 3.1.1 使用的库

- **react-window**：轻量级虚拟滚动库，支持固定和可变尺寸的列表/网格
- **react-virtualized-auto-sizer**：自动计算容器尺寸，适配不同屏幕

```bash
pnpm add react-window react-virtualized-auto-sizer

```

### 3.1.2 左侧订单列表优化

使用 `VariableSizeList` 实现可变高度的虚拟列表：

```tsx
import { VariableSizeList } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

const LeftTaskList = () => {
  const itemSize = useCallback((index) => {
    return 120 // 根据实际卡片高度计算
  }, [])

  const renderRow = useCallback(({ index, style }) => (
    <div style={style}>
      <OrderCard value={data[index]} />
    </div>
  ), [data])

  return (
    <AutoSizer>
      {({ height, width }) => (
        <VariableSizeList
          height={height}
          width={width}
          itemCount={data.length}
          itemSize={itemSize}
        >
          {renderRow}
        </VariableSizeList>
      )}
    </AutoSizer>
  )
}

```

**优化效果**：仅渲染可见区域的 6-8 个卡片，而非全部 121 个。

### 3.1.3 右侧分拣网格优化

使用 `FixedSizeGrid` 实现二维虚拟网格：

```tsx
import { FixedSizeGrid } from 'react-window'

const TaskCategoryGrid = ({ items }) => {
  const columnCount = 3 // 每行 3 列
  const rowCount = Math.ceil(items.length / columnCount)

  const renderCell = useCallback(({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * columnCount + columnIndex
    if (index >= items.length) return null

    return (
      <div style={style}>
        <TaskCard value={items[index]} />
      </div>
    )
  }, [items, columnCount])

  return (
    <AutoSizer>
      {({ height, width }) => (
        <FixedSizeGrid
          height={height}
          width={width}
          columnCount={columnCount}
          rowCount={rowCount}
          columnWidth={width / columnCount}
          rowHeight={200}
        >
          {renderCell}
        </FixedSizeGrid>
      )}
    </AutoSizer>
  )
}

```

**关键点**：

- 避免在 `VariableSizeList` 的 `renderItem` 中嵌套 `AutoSizer` + `FixedSizeGrid`
- 这会导致滚动时频繁重新计算布局，引发严重性能问题
- 推荐将二维网格结构扁平化为一维列表

### 3.1.4 优化滚动时的白屏现象

使用虚拟列表后，滚动时用户可能先看到空白区域，然后卡片才出现。这是因为虚拟列表默认仅渲染可见区域。为了优化这个体验，可以使用 `overscanCount` 参数增加提前渲染的行数：

```tsx
// ✅ 预渲染更多行，消除滚动白屏
<VariableSizeList
  height={height}
  width={width}
  itemCount={items.length}
  itemSize={itemSize}
  overscanCount={2}
>
  {renderItem}
</VariableSizeList>

```

**参数说明**：

- `overscanCount`：在可见区域上下各预渲染的行数
- 默认值为 `1`，增大该值可以减少滚动白屏，但会增加渲染负担

**优化效果**：

- ✅ 快速滚动时无白屏
- ✅ 列表响应流畅，体验更好
- ⚠️ 多渲染 5-10 个额外的 DOM 节点，但仍远小于全量渲染

---

### 3.2 优化状态管理

### 3.2.1 使用 `useCallback` 包裹回调函数

**问题代码**：

```tsx
// ❌ 每次渲染都创建新函数
<TaskCard
  onClick={() => handleClick(item)}
  onAction={(val) => handleAction(val)}
/>

```

**优化后**：

```tsx
// ✅ 使用 useCallback 缓存函数引用
const handleClick = useCallback((item) => {
  // ...
}, [])

const handleAction = useCallback((val) => {
  // ...
}, [])

<TaskCard
  onClick={handleClick}
  onAction={handleAction}
/>

```

### 3.2.2 使用 `useMemo` 缓存计算结果

**问题代码**：

```tsx
// ❌ 每次渲染都重新计算
const filteredItems = items.filter(item => item.status === 'active')

```

**优化后**：

```tsx
// ✅ 仅在依赖变化时重新计算
const filteredItems = useMemo(
  () => items.filter(item => item.status === 'active'),
  [items]
)

```

### 3.2.3 最小化全局状态依赖

**问题代码**：

```tsx
// ❌ 监听整个 Store，任何字段变化都会触发更新
const settings = useStore(settingsStore)
const rowCount = settings.rowCount

```

**优化后**：

```tsx
// ✅ 仅订阅需要的字段
const rowCount = useStore(settingsStore, state => state.rowCount)

```

---

### 3.3 使用 `React.memo` 优化子组件

### 3.3.1 包裹纯展示组件

```tsx
// ❌ 未优化的组件
const TaskCard = ({ value, onClick }) => {
  return <div onClick={() => onClick(value)}>...</div>
}

// ✅ 使用 React.memo + 自定义比较函数
const TaskCard = React.memo(({ value, onClick }) => {
  return <div onClick={() => onClick(value)}>...</div>
}, (prevProps, nextProps) => {
  // 仅在 value.id 和 value.status 变化时重新渲染
  return prevProps.value.id === nextProps.value.id &&
         prevProps.value.status === nextProps.value.status
})

```

### 3.3.2 配合 `useCallback` 稳定 props

```tsx
const ParentComponent = () => {
  // ✅ 确保 onClick 引用稳定
  const handleCardClick = useCallback((item) => {
    console.log(item)
  }, [])

  return <TaskCard value={item} onClick={handleCardClick} />
}

```

---

### 3.4 使用 `why-did-you-render` 诊断无效渲染

### 3.4.1 安装和配置

```bash
pnpm add @welldone-software/why-did-you-render

```

在项目入口文件（如 `src/wdyr.ts`）中配置：

```tsx
import React from 'react'

if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render')
  whyDidYouRender(React, {
    trackAllPureComponents: true, // 追踪所有 memo 组件
    trackHooks: true, // 追踪 Hooks
    logOnDifferentValues: true, // 记录不同值
    collapseGroups: true, // 折叠日志组
  })
}

```

在主入口文件（`src/index.tsx`）最顶部引入：

```tsx
import './wdyr' // ⚠️ 必须在 React 引入之前
import React from 'react'
import ReactDOM from 'react-dom'
// ...

```

### 3.4.2 标记需要监控的组件

```tsx
const TaskCard = React.memo(({ value, onClick }) => {
  // ...
})

// 标记组件以便 WDYR 追踪
TaskCard.whyDidYouRender = true

```

### 3.4.3 控制台日志格式解读

WDYR 会在控制台输出以下格式的日志：

```
TaskCard:
  Re-rendered because of props changes:

  different objects that are equal by value:
    onClick: {
      prev: function() {}
      next: function() {}
    } (functions)

  different objects that are equal by value:
    value: {
      prev: { id: 1, name: '商品A', status: 'active' }
      next: { id: 1, name: '商品A', status: 'active' }
    }

```

**日志解读**：

- **Re-rendered because of props changes**：因为 props 变化而重新渲染
- **different objects that are equal by value**：虽然值相同，但引用不同（需要优化）
- **onClick: prev/next**：回调函数引用变化（需要用 `useCallback` 包裹）
- **value: prev/next**：对象引用变化但内容相同（可能需要 `useMemo` 或自定义 `memo` 比较函数）

### 3.4.4 实战案例

**问题发现**：点击左侧订单 Tab 时，右侧分拣区域更新了 **3 次**，而理想情况应为 **1 次**。

通过 WDYR 日志发现：

1. **第 1 次更新**：`data` 状态变化（正常）
2. **第 2 次更新**：`renderCard` 函数引用变化（需要 `useCallback`）
3. **第 3 次更新**：`categoryOptions` 对象引用变化（需要 `useMemo`）

**解决方案**：

```tsx
// 使用 useCallback 稳定 renderCard
const renderCard = useCallback(({ task, onAction }) => (
  <TaskCard value={task} onAction={onAction} />
), [])

// 使用 useMemo 稳定 categoryOptions
const categoryOptions = useMemo(
  () => categories.map(c => ({ label: c.name, value: c.code })),
  [categories]
)

```

**优化后**：仅更新 **1 次**，减少了 66% 的无效渲染。

---

## 四、其他优化技巧

### 4.1 延迟加载非关键内容

```tsx
const HeavyComponent = React.lazy(() => import('./HeavyComponent'))

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>

```

### 4.2 使用 `key` 优化列表渲染

```tsx
// ❌ 使用 index 作为 key
items.map((item, index) => <Card key={index} {...item} />)

// ✅ 使用唯一 ID 作为 key
items.map(item => <Card key={item.id} {...item} />)

```

### 4.3 避免在渲染函数中创建对象/数组

```tsx
// ❌ 每次渲染都创建新对象
<Component style={{ padding: 10 }} />

// ✅ 提取到常量
const cardStyle = { padding: 10 }
<Component style={cardStyle} />

```

### 4.4 使用 `useTransition` 降低优先级

```tsx
import { useTransition } from 'react'

const [isPending, startTransition] = useTransition()

const handleTabClick = (tab) => {
  startTransition(() => {
    setActiveTab(tab) // 低优先级更新，不阻塞用户交互
  })
}

```

---

## 五、优化效果

### 5.1 性能指标对比

| 指标 | 优化前 | 优化后 | 提升 |
| --- | --- | --- | --- |
| **首次渲染时间** | ~3000ms | ~200ms | **93%** ↓ |
| **DOM 节点数量** | 121+ 个卡片 | 6-8 个可见卡片 | **95%** ↓ |
| **组件更新次数** | 3 次 | 1 次 | **66%** ↓ |
| **内存占用** | ~180MB | ~80MB | **55%** ↓ |
| **点击响应延迟** | 明显卡顿 | 无感知 | **流畅** ✓ |

### 5.2 用户体验提升

- ✅ 点击订单 Tab 后，分拣区域 **立即响应**（<200ms）
- ✅ 批量操作弹窗打开 **无卡顿**
- ✅ 滚动列表 **丝滑流畅**，无掉帧
- ✅ 低配设备上运行 **稳定可靠**

---

## 六、总结与最佳实践

### 6.1 核心优化原则

1. **虚拟化优先**：大列表必须使用虚拟滚动（react-window）
2. **Memoization 三件套**：`React.memo` + `useMemo` + `useCallback`
3. **最小化依赖**：仅订阅需要的状态字段
4. **稳定引用**：避免内联函数和对象
5. **工具辅助**：使用 WDYR、React DevTools 持续监控

### 6.2 性能优化 Checklist

- [ ]  大列表（>20 项）是否使用虚拟滚动？
- [ ]  回调函数是否用 `useCallback` 包裹？
- [ ]  计算结果是否用 `useMemo` 缓存？
- [ ]  纯展示组件是否用 `React.memo` 包裹？
- [ ]  全局状态订阅是否最小化？
- [ ]  列表 `key` 是否使用唯一 ID？
- [ ]  是否避免在渲染时创建新对象/数组？
- [ ]  是否使用 WDYR 检测无效渲染？

### 6.3 注意事项

⚠️ **避免过度优化**：

- 不是所有组件都需要 `React.memo`
- 小列表（<20 项）不必使用虚拟滚动
- 简单组件的 `useMemo` 可能得不偿失

⚠️ **虚拟列表陷阱**：

- 不要在 `VariableSizeList` 的 `renderItem` 中嵌套 `AutoSizer` + `FixedSizeGrid`
- 确保 `renderItem` 用 `useCallback` 包裹
- `itemSize` 函数需要稳定引用

⚠️ **WDYR 使用建议**：

- 仅在开发环境启用
- 聚焦关键性能瓶颈组件
- 修复后及时移除 `whyDidYouRender` 标记

---

## 七、参考资源

- [react-window 官方文档](https://react-window.vercel.app/)
- [why-did-you-render GitHub](https://github.com/welldone-software/why-did-you-render)
- [React 性能优化指南](https://react.dev/learn/render-and-commit)
- [React DevTools Profiler 使用教程](https://react.dev/learn/react-developer-tools)

---
