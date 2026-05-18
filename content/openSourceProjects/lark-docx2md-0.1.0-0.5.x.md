---
title: lark-docx2md 0.5.x
published: 2026-05-17
tags: ['lark-docx2md']
category: 开源
draft: false
---

从飞书文档到 Markdown 的全链路转换之旅。
回顾 0.3.0 版本以来的核心功能演进、架构变化与问题修复。

---

## 一、项目简介

`lark-docx2md` 是一个将飞书 Wiki 文档和电子表格转换为标准 Markdown 的命令行工具与编程库。基于 Parser → Transformer → Serializer 三阶段 AST 管线架构，支持 20+ 种块类型、画板渲染、电子表格解析。

```bash
npx -y lark-docx2md@latest dl https://xxx.feishu.cn/wiki/xxx --app-id cli_xxx --app-secret xxxx
```

---

## 二、架构演进（0.3.0 ~ 0.5.3）

随着功能扩展，代码逐步从 `converter.ts` 拆分为多个独立模块：

- `src/sheet/index.ts`：电子表格解析（`cellToMd`、`expandMerges`、`trimTrailingEmpty` 等）
- `src/get-titles.ts`：标题提取与树构建
- `src/url.ts`：URL 解析逻辑
- `src/title-filter.ts`：标题过滤逻辑
- `src/core/registry.ts`：块类型注册中心

---

## 三、核心功能里程碑

### 3.1 电子表格（Sheet）支持 — 0.3.0

新增独立电子表格链接（`https://*.feishu.cn/sheets/*`）和文档内嵌电子表格块的解析：

- 自动读取所有工作表并输出为 GFM 表格
- 合并单元格自动展开
- Client API 扩展：`getSpreadsheetInfo`、`listSheets`、`getSheetMeta`、`readSheetValues`

### 3.2 指定子表 — 0.3.1

支持 `?sheet=<sheetId>` 查询参数，仅处理指定的单个工作表：

```bash
larkDocx2md dl "https://xxx.feishu.cn/sheets/xxx?sheet=MJ9I17" ...
```

### 3.3 按标题过滤 — 0.5.0

`--filter-title` 参数仅输出指定标题及其下级内容，无需下载整篇文档：

```bash
larkDocx2md dl <url> --filter-title "API 设计"
```

### 3.4 精确标题过滤与 get-titles 子命令 — 0.5.3

针对同名标题歧义问题，引入 **blockId 精确过滤** + **get-titles 辅助查询**的二步式工作流：

```bash
# 1. 列出全部标题及 blockId
larkDocx2md get-titles <url> --format yaml

# 2. 用 blockId 精确过滤
larkDocx2md dl <url> --filter-title-block-id doxcnXXXXXX
```

`get-titles` 支持 `yaml` / `yaml-tree` / `json` / `tree` / `text` 五种输出格式与 `--max-level` 限级。

命中深层标题时，自动注入父级标题（仅 heading 块本身），保留章节层级上下文。

### 3.5 Agent local 模式 — 0.3.0

`--agent` 参数新增 `local` 值，图片/画板/Markdown 均落盘，stdout 输出引导 AI 读取的提示词，适配本地 Agent 场景：

- **`--agent`（stdout）**：Markdown 直接输出到 stdout，`image-mode=online`，`wb-format=yaml`
- **`--agent local`**：文件全部落盘，stdout 输出引导 AI 读取的 Markdown 格式提示词

### 3.6 docx 表格改为 GFM 管道格式 — 0.5.3

原 `<table>` HTML 输出改为标准 GFM 管道表格，合并单元格按「复制顶格值」策略展开，`Table` 与 `Sheet` 共用 `renderMarkdownTable` 实现。

---

## 四、Bug 修复

| 版本 | 问题 | 修复 |
|------|------|------|
| 0.5.0 | `filterTitle` 含前后空格时匹配失败 | 对入参 `trim()` |
| 0.5.2 | 图片下载失败时错误信息模糊 | 401 / 403 分别给出不同提示（接口权限 vs 文档下载权限） |
| 0.5.3 | 表格 `row_span` / `col_span` 为 `undefined` 时崩溃 | 兜底为 1 |

---

## 五、Breaking Changes 速查

| 版本 | 变更 |
|------|------|
| 0.3.0 | `ConvertOptions.agent` 类型由 `boolean` 扩展为 `boolean \| 'local'` |
| 0.5.3 | 环境变量 `LARK_DOCX2MD_AGENT=true` 不再支持，需改为 `=stdout` 或 `=local` |
| 0.5.3 | docx 表格输出从 HTML `<table>` 改为 GFM 管道格式 |

---

## 六、性能优化

- **请求限速放宽（0.5.3）**：`getDocxBlocks` 分页间隔 100 → 50ms、图片下载间隔 600 → 300ms，大文档转换速度约提升一倍。

---

## 七、快速开始

### CLI 安装使用

```bash
# 下载飞书文档
npx -y lark-docx2md@latest dl <feishu-wiki-url> --app-id <id> --app-secret <secret>

# 下载电子表格
npx -y lark-docx2md@latest dl "https://xxx.feishu.cn/sheets/xxx?sheet=ABC"

# 列出标题
npx -y lark-docx2md@latest get-titles <url> --format yaml-tree
```

### 作为库使用

```typescript
import { convert } from 'lark-docx2md'

const md = await convert('https://xxx.feishu.cn/wiki/xxx', {
  appId: process.env.LARK_DOCX2MD_APP_ID!,
  appSecret: process.env.LARK_DOCX2MD_APP_SECRET!,
  agent: 'stdout', // Markdown 通过返回值获取
})
```

---

## 八、总结

从 0.3.0 到 0.5.3，`lark-docx2md` 完成了从「能用」到「好用」的蜕变：

1. **架构清晰**：AST 三阶段管线 + 模块化拆分，扩展新块类型零成本
2. **格式全覆盖**：文档 / 画板 / 电子表格三大场景全部支持
3. **AI 友好**：Agent 模式 + YAML 画板 + get-titles 子命令，形成完整的 AI 消费闭环
4. **精细过滤**：标题文本 / blockId 双通道过滤 + 父级标题自动注入，按需提取任意章节

欢迎通过 [GitHub Issues](https://github.com/Byte-n/larkDocx2md/issues) 反馈问题或建议。
