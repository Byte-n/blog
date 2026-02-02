---
title: Antd-ext Sheet 组件的来源与创建历程
published: 2025-11-10
tags: ['ant-design', 'react', 'antd-ext']
category: 开源
draft: false
---
## 1. 背景

在开发订单创建页面时，我们需要处理商品条目的录入。这是一个典型的“大量数据录入”场景，表格列中包含了多种输入组件（Input、Select、Picker 等）。

业务与产品团队提出了以下核心需求：

- **类 Excel 体验**：界面要尽量简洁，减少嵌套层级和边框噪音。
- **交互流畅**：单元格点击即可激活选中，再次点击进入编辑状态。
- **视觉一致性**：整体视觉风格需与现有的 Ant Design 系统保持高度一致。

## 2. 技术选型

在实现方案上，我们主要对比了两种方向：

- **方案一：引入类 Excel 库（如 x-data-spreadsheet）**
    - *优点*：天然具备 Excel 的交互体验和丰富功能。
    - *缺点*：UI 定制成本极高，所有输入框样式都需要重写以匹配 Ant Design 的设计语言；维护成本较大。
- **方案二：基于 Ant Design Table 模拟**
    - *优点*：完全复用 Ant Design 的组件生态和视觉风格；易于集成。
    - *缺点*：需要自行实现“选中/编辑”切换的交互逻辑和样式去噪。

**最终选择**：基于 Table 进行模拟。我们的目标是打造一个“看上去像 Excel”的录入表格，而不是实现一个完整的在线 Excel。利用 Table 的现有能力，配合精细的样式控制和逻辑封装，能以最低成本达成目标。

## 3. 设计思路

为了实现上述目标，我们在设计上做出了以下关键决策，并在每一步都进行了方案对比：

### 3.1 渲染模型：Render Props vs Component Injection

在如何定义单元格渲染逻辑上，我们考虑了两种方式：

- **方案一：传统 Render Props (Ant Design Table 默认方式)**
    - *优势*：极其灵活，开发者可以在 `render` 函数中返回任意 JSX，逻辑完全掌控。
    - *缺点*：对于大量输入组件，需要手动绑定 `value` 和 `onChange`，样板代码冗余；最关键的是，**无法通过 TypeScript 自动推导组件的 Props 类型**，开发者容易传错属性。
- **方案二：Component + componentProps 注入 (最终选择)**
    - *优势*：
        1. **类型安全**：可以利用 TypeScript 推导，根据传入的 `Component` 自动提示对应的 `componentProps`（并排除 `value`/`onChange`）。
        2. **代码简洁**：Sheet 内部负责实例化组件并注入受控属性，开发者只需关注配置。
    - *缺点*：灵活性稍逊，需要组件遵循 `value/onChange` 的受控规范。

**决策**：采用 **Component + componentProps** 模式，优先保证开发效率和类型安全。底层沿用 Table 的 `columns` 模型（列配置 -> 渲染单元格），保证开发者上手的低门槛。

### 3.2 样式策略：全局覆盖 vs 局部隔离

为了模拟 Excel 的无边框视觉：

- **方案一：全局 CSS 覆盖 (Global Overrides)**
    - *优势*：实现简单，通过 CSS 选择器强行覆盖 Input 样式。
    - *缺点*：极易造成样式污染。例如，修改了 Input 的边框，可能会意外影响到 Select 下拉框中的搜索框或 Modal 中的输入框。
- **方案二：局部样式注入 + ConfigProvider (最终选择)**
    - *优势*：
        1. **样式隔离**：通过 `useStyle` 生成唯一的 hashId，在单元格内层统一去除边框、背景，并根据 `layout`（`block`/`inline`）和 `size` 派生出 `w-full`、`h-full` 等布局类。
    - *缺点*：实现复杂度略高，需处理 CSS-in-JS 的优先级问题。

**决策**：采用 **局部样式注入**，确保组件的封装性和安全性。

### 3.3 交互设计：状态切换 vs 始终渲染

在实现“点击编辑”的交互时：

- **方案一：查看态/编辑态切换 (Switching Mode)**
    - *优势*：查看态仅渲染文本，DOM 节点少，性能较好。
    - *缺点*：**列宽抖动**严重。文本节点和输入框节点的默认宽度、内边距不同，切换瞬间表格列宽会发生跳变，体验极差。
- **方案二：始终渲染输入控件 (最终选择)**
    - *优势*：**零视觉跳变**。通过样式将输入框伪装成文本（去边框、背景），配合点击计数逻辑（`cellClickCount`：一次点击选中，二次点击编辑），激活时仅需添加高亮样式，列宽保持绝对稳定。
    - *缺点*：DOM 节点数量较多，对 React 渲染性能有挑战（通过 `React.memo` 和 `componentProps` 缓存优化）。

**决策**：采用 **始终渲染输入控件** 策略，以空间换取极致的交互体验。同时，在双击进入编辑时，如果存在 `selectionStart`，将光标自动置于末尾，避免误选文本。

### 3.4 校验管理：Form.List vs 独立校验

- **方案一：复用 Ant Design Form.List**
    - *优势*：直接复用 Form 的验证体系，无需额外代码。
    - *缺点*：Ant Design Form 在处理数百行深层嵌套数据时性能瓶颈明显；且强绑定 Form 上下文，无法独立使用。
- **方案二：独立状态管理 + async-validator (最终选择)**
    - *优势*：
        1. **独立性**：组件可独立运行，不依赖 Form Context。
        2. **性能可控**：采用“列-行”维度的精细化更新，避免全表重渲染。`cellStatus` 存储“列-行”维度的错误信息，通过 `classNames` 渲染红色边框，并利用 Tooltip 展示具体错误文案。
    - *缺点*：需自行维护校验状态和集成 `async-validator`。

**决策**：采用 **独立状态管理**，提供更灵活的校验 UI 和更好的性能，同时支持受控（`value`）与非受控模式。

## 4. 列映射（convertColumn）

`convertColumn` 是连接 Sheet 列配置与 Ant Design `Table` 列配置的桥梁，它做了三件事：

- **把 Sheet 自己的列描述（`ColumnType`）转换成 Table 能识别的 `columns`**
- **在列级别挂上表头状态（例如是否有错误）**
- **在单元格级别接管交互与样式（通过 `onCell` 与 `render`）**

下面是核心实现的精简版本（有删减）：

```tsx
const convertColumn = useCallback(
  (column: ColumnType<RecordType>, columnIndex: number): TableColumnType<RecordType> => {
    const { Component, componentProps, type, align, layout, ...rest } = column;
    const isDataCell = type === 'data' || isNil(type);

    // 1. 解析布局：inline / w-full / h-full
    let layouts: (typeof layout)[] = [];
    let isInlineLayout = false;
    if (!Component && !layout) {
      layouts = ['inline'];
      isInlineLayout = true;
    } else {
      layouts = layout === 'block' || !layout ? ['w-full', 'h-full'] : [layout];
      isInlineLayout = layouts.includes('inline');
    }

    const dataIndex = isDataCell
      ? (column as DataColumnType<RecordType, keyof RecordType>).dataIndex
      : rowKey;

    return {
      ...rest,
      dataIndex: dataIndex as string,

      // 2. 头部单元格：如果这一列有任意单元格报错，则给表头加错误样式
      onHeaderCell: () => ({
        className: classNames({ [`${prefixCls}-th-status-error`]: Boolean(cellStatus[columnIndex]) }),
      }),

      // 3. 表体单元格 onCell：负责行为 + 样式
      onCell: (record: RecordType, rowIndex) => {
        if (!record || isNil(rowIndex)) return {};
        if (isDataCell) {
          // 计算当前单元格的状态：是否编辑 / 是否有错误 / 点击次数
          const { edited, errorMessage, clickCount } = computeStatus(rowIndex, columnIndex);

          // 组装单元格 className：状态 + 布局
          const cns = classNames(`${prefixCls}-cell-data`, {
            [`${prefixCls}-cell-error`]: errorMessage,
            [`${prefixCls}-cell-active`]: edited,
            [`${prefixCls}-cell-no-selection`]: clickCount === 1,
            [`${prefixCls}-cell-layout-w-full`]: layouts.includes('w-full'),
            [`${prefixCls}-cell-layout-h-full`]: layouts.includes('h-full'),
            [`${prefixCls}-cell-layout-inline`]: isInlineLayout,
          });

          return {
            className: cns,
            onClick: (e) => {
              // 维护点击计数：第一次点击只选中，第二次点击进入编辑
              const newCellClickCount: typeof cellClickCount =
                [columnIndex, rowIndex, edited ? clickCount + 1 : 1];
              setCellClickCount(newCellClickCount);

              // 第二次点击时，如果目标是 input 等，可把光标移到末尾，避免整段选中
              if (edited) {
                const target = e.target as HTMLInputElement;
                if (newCellClickCount[2] === 2 && typeof target.selectionStart === 'number') {
                  target.selectionStart = target.selectionEnd;
                }
              }
            },
          };
        }
        // 操作列：只挂上操作列样式
        return { className: `${prefixCls}-cell-operator` };
      },

      // 4. render：真正渲染单元格内容，并把受控能力注入进去
      render: (_: any, record: RecordType, rowIndex: number) => {
        if (isDataCell) {
          const { edited, errorMessage } = computeStatus(rowIndex, dataIndex as any);
          return (
            <Cell<RecordType>
              // 来自列配置的 componentProps：业务侧写的 props
              componentProps={componentProps}
              // 真正渲染的组件：列没指定时默认用 Sheet.Text
              Component={(Component ?? Weigets.Text) as React.ComponentType<DataCellComponentProps>}
              // 受控 value：从当前行数据里取对应 dataIndex 的值
              value={record[dataIndex]}
              // 定位信息：用于更新与校验
              rowIndex={rowIndex}
              dataIndex={dataIndex}
              // 校验相关：是否展示 tooltip、错误信息
              validateTooltip={Component ? validateTooltip : false}
              edited={edited}
              errorMessage={errorMessage}
              // 视觉与布局
              prefixCls={prefixCls}
              align={align}
              className={isInlineLayout ? undefined : `${prefixCls}-cell-inner-layout`}
              // 更新回调：让单元格在内部调用时，能只更新自己这一格
              onUpdateCellByKey={updateCellByKey}
            />
          );
        }

        // 操作列的渲染：把当前行记录与一组操作回调注入进去
        return (
          <OperatorCell<RecordType>
            Component={Component as React.ComponentType<OperatorCellComponentProps<RecordType>>}
            value={record}
            index={rowIndex}
            prefixCls={prefixCls}
            componentProps={componentProps}
            onInsertRow={insertRow}
            onDeleteRow={deleteRow}
            onUpdateCell={updateCell}
            align={align}
            className={isInlineLayout ? undefined : `${prefixCls}-cell-inner-layout`}
          />
        );
      },
    };
  },
  [computeStatus, prefixCls, updateCellByKey, validateTooltip, updateCell],
);

```

### 4.1 Table `onCell` 在 Sheet 里的作用

- 在 Ant Design Table 中，`onCell` 的本质作用是：**为某一列的每一个单元格（`<td>`）动态注入 props**，这些 props 会和 Table 自己生成的属性合并，最终作用在真实 DOM 上。
- 在 Sheet 中，我们利用 `onCell` 做了几件关键的事情：
    - 通过 `className` 控制**单元格的状态样式**：是否处于编辑态（`cell-active`）、是否有错误（`cell-error`）、是否只是被选中但未进入编辑（`cell-no-selection`）；
    - 根据列的 `layout` 决定布局类（`cell-layout-inline / -cell-layout-w-full / -cell-layout-h-full`），从而统一内边距和宽高；
    - 在 `onClick` 中维护 `cellClickCount`，实现“第一次点击选中、第二次点击进入编辑态”的 Excel 风格交互，并修正双击时的光标位置。

可以理解为：**`onCell` 负责“外壳”的行为和状态，决定这个 `<td>` 看起来和“点起来”是什么感觉。**

### 4.2 列 `render` 在 Sheet 里的作用

- 在 Ant Design Table 中，列的 `render` 决定了**单元格内部内容**怎么渲染，它拿到当前行数据与索引后，返回一段 JSX。
- 在 Sheet 中，我们统一用 `render` 去渲染封装好的 `Cell` / `OperatorCell`，并在这里把所有“受控能力”注入进去：
    - 对于数据列：
        - 把当前行的字段值 `record[dataIndex]` 作为受控 `value` 传给 `Cell`，再由 `Cell` 传给真正的输入组件；
        - 把 `rowIndex`、`dataIndex` 传进去，`Cell` 在触发 `onChange` 时会通过 `onUpdateCellByKey` 精确更新这一格的数据；
        - 把 `edited`、`errorMessage`、`validateTooltip` 等状态注入，让单元格知道当前是否处于编辑态、是否需要展示错误提示；
        - 把 `componentProps` 注入，让业务侧配置的 `placeholder`、`min`、`options` 等都能透传到具体输入组件上。
    - 对于操作列：
        - 把整行记录 `record` 作为 `value` 传给 `OperatorCell`，让操作列可以基于整行信息做事情（比如复制、删除）；
        - 注入 `onInsertRow`、`onDeleteRow`、`onUpdateCell` 等行级操作方法。

因此可以总结为：

- **`onCell` 负责 `<td>` 外层：交互状态 + 布局 + 点击行为**
- **`render` 负责 `<td>` 内层：真正渲染什么组件，以及组件如何拿到受控值与更新回调**

这两个能力叠加在一起，使得 Sheet 在保持 `Table` 心智模型的同时，又能实现类 Excel 的高密度录入体验。

## 5. 类型推导

为了提供极致的开发体验，我们设计了辅助函数 `Sheet.col`。它利用 TypeScript 的泛型推导，实现了 `componentProps` 的智能提示。

```tsx
// 开发者无需手动定义复杂的泛型
Sheet.col(Sheet.InputNumber<number>, {
  title: '价格',
  dataIndex: 'price',
  //这里的 componentProps 会被自动推导为 InputNumberProps，且排除了 value/onChange
  componentProps: {
    min: 0,
    precision: 2
  },
})

```

这一设计极大地降低了 TypeScript 的使用门槛，同时保证了类型安全。

## 6. 扩展能力

Sheet 组件设计了良好的扩展性：

- **内置组件 (Widgets)**：我们封装了 `Sheet.Input`、`Sheet.InputNumber`、`Sheet.CheckBox` 等常用组件，它们默认实现了无边框样式和受控接口。
- **Form 集成**：通过 `Sheet.FormItem`，可以将 Sheet 作为一个普通的表单项嵌入到 Ant Design 的 Form 中，复用 Form 的验证体系，同时保留 Sheet 内部的列级校验。
- **自定义组件**：任何支持 `value` / `onChange` 的组件都可以直接作为 `Component` 传入。利用 `extractInnerLayoutClasses` 工具，自定义组件也能轻松适配 Sheet 的布局系统。

## 7. 使用示例

以下是一个完整的商品录入示例：

```tsx
import Sheet, { SheetRef } from '@byte.n/antd-ext/Sheet';
import React, { useRef } from 'react';

const App = () => {
  const ref = useRef<SheetRef<any>>(null);

  const columns = [
    // 使用辅助函数定义列
    Sheet.col(Sheet.Input, {
      title: '商品名称',
      dataIndex: 'name',
      rule: { required: true, message: '必填' }, // 列级校验
    }),
    Sheet.col(Sheet.InputNumber, {
      title: '数量',
      dataIndex: 'count',
      componentProps: { min: 1 },
    }),
    // 自定义操作列
    Sheet.operatorCol(Sheet.Text, {
      title: '操作',
      width: 80
    }),
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => ref.current?.insertRow(0)}>新增一行</button>
        <button onClick={() => ref.current?.validate()}>提交验证</button>
      </div>

      <Sheet
        ref={ref}
        rowKey="id"
        // 生成唯一键的策略
        createNewKey={({ index }) => `row_${Date.now()}_${index}`}
        columns={columns}
        defaultValue={[{ id: '1', name: '示例商品', count: 10 }]}
      />
    </div>
  );
};

```

## 8. 总结与实践提示

Sheet 组件通过复用 Table 的底层能力，以较低的成本实现了类 Excel 的交互体验。

**何时使用 Sheet？**

- 当需要在一个表格中密集录入数据时（如采购单、参数配置）。
- 需要“即点即改”的交互，而非传统的“点击编辑按钮 -> 弹窗/行编辑”模式。
- 表单中包含数组结构的数据。

**实践提示：**

1. **性能优化**：虽然 Sheet 做了大量优化，但面对数百行数据时，React 的重渲染仍是瓶颈。建议结合分页或虚拟滚动（如有必要）使用。
2. **校验时机**：Sheet 默认在 `change` 时触发校验。如果数据量极大，可考虑防抖或仅在提交时调用 `ref.current.validate()`。
3. **样式定制**：尽量使用 `layout` 属性（`w-full`, `inline`）来控制组件宽度，避免写硬编码的 style，以保持响应式能力。
