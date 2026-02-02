---
title: Antd-ext Select 组件的来源与创建历程
published: 2025-11-10
tags: ['ant-design', 'react', 'antd-ext']
category: 开源
draft: false
---
## 1. 背景

在实际项目中，我们几乎所有页面都会用到 `Select`：

- 简单场景下，它只是一个 key/value 下拉框；
- 复杂场景下，它需要承载 **业务数据结构**、**自定义标签展示**、**下拉内容扩展** 等能力。

在这些复杂场景里，直接使用 Ant Design 自带的 `Select`，会遇到几个典型问题：

- **类型不够友好**：
    - 多数时候我们写的是 `Select<string>`，但真正的数据结构远不止一个字符串；
    - `onChange` 回调里的 `option` 类型要么是 `any`，要么需要手动补充复杂的泛型。
- **业务数据难以跟随 option 走**：
    - 真实场景里，一个 option 往往需要附带额外的业务数据（如 `id`、`name`、`category` 等）；
    - 开发者常常在 `options` 外再维护一份 Map，自行做映射和查找。
- **自定义标签渲染不够顺手**：
    - 比如在选中项里展示一个 `Tag`、或者附加其他字段，需要和 `labelInValue`、`tagRender` 等组合使用，心智成本较高。
- **下拉内容扩展的能力分散**：
    - 想在下拉面板底部加一个“新建选项”的区域，需要结合 `dropdownRender`、`open`、`onDropdownVisibleChange` 等多个 API，一旦处理不好就会出现“点外面关不掉”的体验问题。

为了解决这些在业务里高频出现、却在原生 `Select` 中需要大量样板代码才能覆盖的场景，我们在 antd-ext 中设计了一个增强版选择器：**EnhancedSelect**。

---

## 2. 设计目标

EnhancedSelect 的目标很明确：

- **在 API 形态上尽量保持与 Ant Design Select 一致**；
- **在类型与扩展能力上，覆盖一线业务开发中最常见的痛点**；
- 让大部分场景下，开发者只需要引入 EnhancedSelect，就可以在“几乎不改写代码”的前提下获得：
    - 更强的 TypeScript 类型推导；
    - 更好用的标签渲染能力；
    - 更自然的下拉扩展体验；
    - 更合理的 options 管理与去重机制；
    - 对多选场景下 tag 展示的更好控制。

因此，我们在设计上遵循了两条原则：

- **不破坏原有 Select 的心智模型**：`options` 仍然是数组，`onChange` 仍然是“值 + 选项”；
- **尽量通过类型与轻量封装来解决问题**，避免再堆出一个“巨大新组件”。

---

## 3. 类型设计：用泛型约束值与选项

EnhancedSelect 最核心的差异其实体现在类型层面。

```tsx
export type Val = string | number | boolean;
export type Model = undefined | 'multiple' | 'tags';
export type ComputeValByModel<Model, V> = Model extends undefined ? V : V[];

export interface OptionType<Value extends Val, Data = unknown> extends ValueType<Value> {
  data: Data;
}

interface ValueType<Value extends Val> {
  key?: React.Key;
  label: React.ReactNode;
  value: Value;
}

export type ComputeOptionType<Value extends Val, Data> = Data extends undefined
  ? ValueType<Value>
  : OptionType<Value, Data>;

export interface EnhancedSelectProps<V extends Val, D = undefined, M extends Model = undefined>
  extends Omit<
    SelectProps<ComputeValByModel<M, V>, ComputeOptionType<V, D>>,
    | 'labelRender'
    | 'labelInValue'
    | 'onChange'
    | 'dropdownRender'
    | 'onDropdownVisibleChange'
    | 'popupRender'
    | 'classNames'
    | 'styles'
    | 'maxTagCount'
  > {
  onChange?: (value: ComputeValByModel<M, V>, option?: ComputeValByModel<M, ComputeOptionType<V, D>>) => void;
  mode?: M;
  labelRender?: (props: OptionType<Val, D | undefined>) => React.ReactNode;
  popupRender?: (menu: React.ReactElement, opt: { close: VoidFunction }) => React.ReactElement;
  classNames?: SelectProps['classNames'] & { popupProxy?: string };
  styles?: SelectProps['styles'] & { popupProxy?: React.CSSProperties };
  maxTagCount?: SelectProps['maxTagCount'] | 'scroll';
}

```

几个关键点：

- **值类型 `V`**：被限制为 `string | number | boolean`，与原生 `Select` 保持一致；
- **模式 `M`**：根据 `mode`（单选 / 多选 / tags），自动推导 `value` 是 `V` 还是 `V[]`；
- **数据类型 `D`**：通过 `OptionType<V, D>` 把业务数据挂在 `data` 字段上；
- **options 类型**：
    - 当 `D` 是 `undefined` 时，`options` 的元素就是简单的 `ValueType<V>`；
    - 当 `D` 有实际类型时，`options` 的元素就是带 `data` 的业务对象。
- **onChange 类型**：
    - 单选时 `value` 是 `V`，`option` 是 `OptionType<V, D>`；
    - 多选时 `value` 是 `V[]`，`option` 是 `OptionType<V, D>[]`；

从使用者的视角来看，只要在引入时声明好 `V` 和 `D`，之后的 `options` / `onChange` / `labelRender` 等都能获得完整的类型提示，无需手写任何复杂泛型。

---

## 4. 选项管理与 labelRender：让业务数据自然跟随选项

在标准 `Select` 里，如果你想在选中项上展示额外信息（比如给每个选项显示一个 `category` 标签），通常有两种写法：

- 在 `label` 里直接拼接展示逻辑（但这样选中项也只能显示这段 label）；
- 结合 `labelInValue`、`tagRender` 等 API，自行维护一个“值到业务数据”的 Map。

EnhancedSelect 希望解决的是：**既保留“干净的 label 文案”，又能在选中项里拿到完整数据结构**。

### 4.1 allOptionsRef：统一管理 options 与 data

内部实现里，我们用一个 `allOptionsRef` 把“所有出现过的 options”统一存起来，并用 `unionBy` 按 `value` 去重：

```tsx
const allOptionsRef = useRef<ComputeOptionType<V, D>[]>([]);
if (options?.length) {
  allOptionsRef.current = unionBy(allOptionsRef.current.concat(options), (v) => v.value);
}

```

这样做有两个目的：

- **合并与去重**：支持 options 变化的场景（比如分页加载选项），但始终能拿到完整的 options 数据；
- **为 labelRender 提供 data 数据源**：即使当前渲染的 label 只给了 `value` 和 `label`，我们也能从 `allOptionsRef` 里把 `data` 补全回来。

### 4.2 realLabelRender：自动补齐 data 的标签渲染

```tsx
const realLabelRender = useMemo<SelectProps['labelRender']>(() => {
  if (!labelRender) {
    return;
  }
  return (opt) => {
    const option = allOptionsRef.current.find((v) => v.value === opt.value) as OptionType<Val, D>;
    return labelRender?.({ ...opt, data: option?.data });
  };
}, [labelRender]);

```

EnhancedSelect 对外暴露的 `labelRender` 类型是：

```tsx
(props: OptionType<Val, D | undefined>) => React.ReactNode

```

也就是说，业务侧拿到的是“带 data 的完整 Option 对象”。

典型使用示例：

```tsx
const options = [
  { label: '选项1', value: '1', data: { id: 1, name: '选项1', category: 'A' } },
  // ...
];

const labelRender: EnhancedSelectProps<string, typeof options[number]['data']>['labelRender'] = (option) => {
  return (
    <span>
      {option.label}
      <Tag color="blue" style={{ marginLeft: 4 }}>
        {option.data?.category}
      </Tag>
    </span>
  );
};

<EnhancedSelect
  mode="multiple"
  placeholder="请选择"
  options={options}
  value={value}
  onChange={setValue}
  labelRender={labelRender}
/>

```

这让“在标签上展示数据”的需求变得非常自然，无需再单独维护一份 `Map<value, data>`。

---

## 5. 搜索行为：默认对 label 做匹配

原生 `Select` 在开启 `showSearch` 时，默认是通过 `optionFilterProp` 来指定过滤依据。业务里绝大部分情况下，我们是按 `label` 搜索的。

为避免在每个使用处都重复配置，EnhancedSelect 在内部对 `showSearch` 做了一层包装：

```tsx
const realShowSearch = useMemo(() => {
  if (showSearch === false || isNil(showSearch)) {
    return false;
  }
  if (showSearch === true) {
    return { optionFilterProp: 'label' };
  }
  return {
    optionFilterProp: 'label',
    ...showSearch,
  };
}, [showSearch]);

```

- 当 `showSearch` 未配置或为 `false` 时：关闭搜索；
- 当 `showSearch` 为 `true` 时：开启搜索，并默认按 `label` 过滤；
- 当传入对象时：自动补齐 `optionFilterProp: 'label'`，同时允许自定义其他搜索行为。

这是一种典型的“带默认值的增强”：不改变原有 API，但减少业务层的重复配置。

---

## 6. popupRender：安全地扩展下拉内容

许多产品场景需要“在下拉里直接新建选项”，比如：

- 在城市选择器底部增加“新增地址”按钮；
- 在标签选择器里直接创建新的标签。

原生 `Select` 可以通过 `dropdownRender` / `popupRender` 实现类似能力，但往往需要业务侧自己管理 `open` 状态、点击外部关闭等逻辑，一不小心就会出现“下拉关不上”的问题。

尤其是在 **Ant Design 6** 中，下拉的事件处理相比 v5 更加“严格、正确”：对于 `blur`、点击外部等场景的收起逻辑收紧后，如果开发者在下拉面板中自由扩展内容，很容易出现和社区问题 [#56033](https://github.com/ant-design/ant-design/issues/56033) 类似的情况——点击扩展区域也会意外触发下拉收起，或者行为前后版本不一致。EnhancedSelect 在这里做了一层统一封装，屏蔽掉底层版本差异，让你可以用更直观的 `popupRender` 形态来描述“下拉 + 扩展区域”，而不用反复调试各种事件细节。

EnhancedSelect 在这块做了三件事：

### 6.1 内部接管 open 状态

```tsx
const openIsControlled = open !== undefined;
const [internalOpen, setInternalOpen] = useState(defaultOpen);
const realOpen = openIsControlled ? open : internalOpen;

const changeOpen = useCallback(
  (v: boolean) => {
    if (!openIsControlled) {
      setInternalOpen(v);
    }
    onOpenChange?.(v);
  },
  [onOpenChange, openIsControlled],
);

```

- 当业务侧传入 `open` 时，EnhancedSelect 按受控模式工作；
- 当仅使用 `popupRender` 而不显式控制 `open` 时，组件内部自己管理打开/关闭状态，并同步通知外部的 `onOpenChange`。

### 6.2 useClickAway：点击下拉外部自动关闭

```tsx
const popupProxyDivRef = useRef<HTMLDivElement>(null);
useClickAway(
  () => changeOpen(false),
  [
    () => {
      if (!popupRender) {
        return null;
      }
      return selectRef.current?.nativeElement;
    },
    () => {
      if (!popupRender) {
        return null;
      }
      return popupProxyDivRef.current!;
    },
  ],
);

```

这段逻辑的含义是：

- 当使用了 `popupRender` 时，我们把“点击外部”的范围定义为：
    - 原始 Select 的下拉区域；
    - 我们包裹 `popupRender` 的代理容器 `popupProxyDivRef`；
- 只要点击发生在这两个区域之外，就自动执行 `changeOpen(false)` 关闭下拉。

这样，业务在 `popupRender` 中随意添加输入框、按钮、说明文字，都不会破坏“点击外部关闭”的基础体验。

从实现原理上看，`useClickAway`（详见 [useClickAway 文档](https://ahooks.js.org/hooks/use-click-away/)）做的事情其实很“朴素”：

- 在 `useEffect` 中通过 `document.addEventListener` 绑定全局事件监听（默认是 `mousedown` 和 `touchstart`，也可以自定义）；
- 每次事件触发时，拿到 `event.target`，然后遍历传入的目标节点（可以是 `ref.current` 或返回 DOM 的函数），用 `node && node.contains(event.target as Node)` 来判断“这次点击是否发生在任一目标内部”；
- 如果所有目标节点都不存在，或者都不包含当前事件目标，就认为这是一场“点击外部”的行为，调用开发者提供的回调函数；
- 在组件卸载或依赖变更时，再用 `document.removeEventListener` 解除监听，避免内存泄漏或重复绑定。

换句话说，`useClickAway` 就是基于浏览器最基础的 **全局事件监听 + `Node.contains` 判断** 搭了一层轻量 Hook，既兼容了多节点场景，又帮我们把注册/清理这些 `document` 级别事件的细节封装了起来。

### 6.3 proxyPopupRender：为业务侧提供 close 能力

```tsx
const proxyPopupRender = useCallback<Exclude<SelectProps['popupRender'], undefined>>(
  (nodes) => (
    <div ref={popupProxyDivRef} className={cns?.popupProxy} style={styles?.popupProxy}>
      {popupRender!(nodes, { close: changeOpen.bind(null, false) })}
    </div>
  ),
  [popupRender, cns?.popupProxy, styles?.popupProxy, changeOpen],
);

```

EnhancedSelect 对业务暴露的 `popupRender` 形态略有增强：

```tsx
(menu: React.ReactElement, opt: { close: VoidFunction }) => React.ReactElement

```

这意味着业务可以非常自然地在内部调用 `close()` 来关闭下拉，例如：

```tsx
<EnhancedSelect
  options={options}
  popupRender={(menu, { close }) => (
    <>
      <div onClick={close}>{menu}</div>
      <Divider style={{ margin: '4px 0' }} />
      <Space>
        <Input
          placeholder="输入新选项"
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onPressEnter={handleAddOption}
        />
        <Button type="primary" onClick={handleAddOption}>
          添加
        </Button>
      </Space>
    </>
  )}
/>

```

这一模式在实际业务里非常常见：

- 下拉展开 → 输入新内容 → 点击“保存并选中” → 自动关闭下拉 → 更新选中值。

EnhancedSelect 把“关闭逻辑”的实现细节都包在内部，业务只需关心什么时候调用 `close()` 即可。

---

## 7. maxTagCount 与已选项展示策略

多选场景下，标签展示一直是一个 UX 难点：

- 选项一多，就会把输入框撑得很高；
- 即便用了 `maxTagCount`，还需要考虑“滚动 vs 响应式 vs 省略号”。

EnhancedSelect 对 `maxTagCount` 做了一个轻量级扩展：

```tsx
maxTagCount?: SelectProps['maxTagCount'] | 'scroll';

<Select
  {...}
  maxTagCount={maxTagCount === 'scroll' ? undefined : maxTagCount}
  className={classNames(prefixCls, hashId, cssVarCls, { scroll: maxTagCount === 'scroll' }, props.className)}
/>

```

- 当 `maxTagCount` 为数字（如 `3`）或 `'responsive'` 时，行为与原生 Select 完全一致；
- 当 `maxTagCount` 为 `'scroll'` 时：
    - EnhancedSelect 不再把这个值传给底层 Select，而是仅通过类名 `scroll` 控制样式；
    - 你可以在外层通过 CSS 限制高度，超出的标签走滚动条。

配合 demo 中的写法：

```tsx
<EnhancedSelect
  mode="multiple"
  maxTagCount="scroll"
  options={options}
  value={value}
  onChange={setValue}
  style={{ width: '100%', maxHeight: 120 }}
/>

```

可以非常直观地对比：

- `maxTagCount="responsive"`：根据宽度自动调整展示数量，超出部分显示省略号；
- `maxTagCount="scroll"`：限制整体高度，通过滚动展示全部标签；
- `maxTagCount={3}`：只展示固定数量标签，超出部分显示 `+N`。

---

## 8. 使用示例

### 8.1 自定义标签 + 业务数据

```tsx
import React, { useState } from 'react';
import { EnhancedSelect, EnhancedSelectProps } from '@byte.n/antd-ext';
import { Tag } from 'antd';

const options = [
  { label: '选项1', value: '1', data: { id: 1, name: '选项1', category: 'A' } },
  { label: '选项2', value: '2', data: { id: 2, name: '选项2', category: 'B' } },
  // ...
];

const CustomLabelDemo: React.FC = () => {
  const [value, setValue] = useState<string[]>([]);

  const labelRender: EnhancedSelectProps<
    string,
    (typeof options)[number]['data']
  >['labelRender'] = (option) => (
    <span>
      {option.label}
      <Tag color="blue" style={{ marginLeft: 4 }}>
        {option.data?.category}
      </Tag>
    </span>
  );

  return (
    <EnhancedSelect
      mode="multiple"
      placeholder="请选择"
      options={options}
      value={value}
      onChange={setValue}
      labelRender={labelRender}
      style={{ width: 300 }}
    />
  );
};

```

### 8.2 在下拉中扩展“新建选项”区域

```tsx
import { EnhancedSelect } from '@byte.n/antd-ext';
import { Button, Divider, Input, Space } from 'antd';
import React, { useState } from 'react';

export default function PopupRenderDemo() {
  const [options, setOptions] = useState([
    { label: '选项1', value: '1' },
    { label: '选项2', value: '2' },
    { label: '选项3', value: '3' },
  ]);

  const [newOption, setNewOption] = useState('');

  const handleAddOption = () => {
    if (newOption.trim()) {
      const value = `option-${Date.now()}`;
      setOptions([...options, { label: newOption, value }]);
      setNewOption('');
    }
  };

  return (
    <EnhancedSelect
      style={{ width: 240 }}
      options={options}
      placeholder="请选择"
      popupRender={(menu, { close }) => (
        <>
          <div onClick={close}>{menu}</div>
          <Divider style={{ margin: '4px 0' }} />
          <Space>
            <Input
              placeholder="输入新选项"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onPressEnter={handleAddOption}
            />
            <Button type="primary" onClick={handleAddOption}>
              添加
            </Button>
          </Space>
        </>
      )}
    />
  );
}

```

### 8.3 多选 + 标签展示策略对比

```tsx
import React, { useState } from 'react';
import { Space, Card, Typography } from 'antd';
import { EnhancedSelect } from '@byte.n/antd-ext';

const { Title, Text } = Typography;

const options = Array.from({ length: 100 }, (_, index) => ({
  label: `选项${index + 1}`,
  value: `${index + 1}`,
}));

const ResponsiveDemo: React.FC = () => {
  const [value, setValue] = useState<string[]>(Array.from({ length: 50 }, (_, index) => `${index + 1}`));

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={4}>maxTagCount 不同取值效果对比</Title>

      <Card title="maxTagCount='responsive'" size="small">
        <EnhancedSelect
          mode="multiple"
          placeholder="请选择多个选项"
          options={options}
          value={value}
          onChange={setValue}
          maxTagCount="responsive"
          style={{ width: '100%' }}
        />
      </Card>

      <Card title="maxTagCount='scroll' + 限制高度" size="small">
        <EnhancedSelect
          mode="multiple"
          maxTagCount="scroll"
          placeholder="请选择多个选项"
          options={options}
          value={value}
          onChange={setValue}
          style={{ width: '100%', maxHeight: 120 }}
        />
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">选中: {value.length} 项</Text>
        </div>
      </Card>
    </Space>
  );
};

```

---

## 9. 总结与实践建议

EnhancedSelect 的核心理念是：**在不改变 Select 使用习惯的前提下，把复杂场景里最常见的痛点都“顺便”解决掉**：

- 通过类型系统，让 `value`、`options`、`onChange` 在单选/多选/标签模式下都拥有准确的类型推导；
- 通过 `OptionType` 与 `labelRender`，让业务数据自然跟随选项流转，不再需要额外维护映射表；
- 通过 `popupRender` + 内部 open 管理 + `useClickAway`，提供了“好用且安全”的下拉扩展能力；
- 通过 `maxTagCount` 的小扩展，覆盖了高密度多选场景下标签展示的常见需求。

**建议的使用姿势：**

- 在需要自定义标签、携带业务数据、复杂下拉扩展时，优先考虑使用 EnhancedSelect 替代原生 Select；
- 结合 TypeScript 的泛型参数（`V`/`D`/`M`），在定义组件时就把值类型与业务数据结构声明清楚，可以显著减少后续 bug；
- 下拉扩展时，尽量把“新增/编辑”操作放在 `popupRender` 中完成，并在操作结束后调用 `close()`，保持交互的一致性。
