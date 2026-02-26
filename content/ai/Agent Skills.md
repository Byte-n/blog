---
title: Agent Skills
published: 2026-02-25
tags: ['skills']
category: AI
draft: false
---

Agent Skills 就是把“干活工具”和“操作说明书”打包成一个插件，让 AI 知道在什么时候、按什么步骤去完成一件具体的专业杂事。

Agent Skills 与 MCP 的差异及优势：
* 功能差异（角色不同）：
    * MCP 是“通电插座”：它是一套通用的技术标准，负责把 AI 和外部世界（如 GitHub、数据库、Slack）连起来。它解决的是“能不能拿得到数据”的问题。
    * Agent Skills 是“专业说明书”：它是一套本地的指令包，负责教 AI 针对特定任务怎么干活。它解决的是“拿到了数据后怎么处理”的问题。
* 核心优点（为什么更省 Token）：
  * MCP 比较“费话”：当你连接 MCP 工具时，它通常需要预先将所有工具的复杂定义（JSON Schema）全部塞进 AI 的记忆里（Context Window），即使还没开始用，就已经占用了大量 Token。
  * Skills 更加“聪明”：它采用延迟加载。平时只在 AI 脑子里占几个 Token 的“标题”与“职能说明”，只有当 AI 确定要用这个技能时，才会临时翻开对应的说明书（加载几百个 Token 的具体指令），从而大幅降低了基础成本。 
  > 例如在让 AI 读取浏览器界面信息的场景下 [agent-browser](https://github.com/vercel-labs/agent-browser) 比 [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) 要节省 90% 的 token

## Skills 规范

规范文档见：[Agent Skills](https://agentskills.io/home)

一个 skill 的组成部分如下所示。

```
my-skill/
├── SKILL.md          # Required: instructions + metadata
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
└── assets/           # Optional: templates, resources
```

除此之外，还可以包含任意自定义的目录，例如 [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) 的目录结构中还包含 agents、eval-viewer。

`SKILL.md` 为入口文件，该文件包含元数据（至少包含 **`name`** 和 **`description`**  ），当任务描述匹配 **`description`** 时，则将完整的 **`SKILL.md`** 指令读入上下文。在 **`SKILL.md`**  中可以引用上述文件夹中的内容或让 AI 执行 `scripts`  中的脚本。

一个最简单的 skil 可以仅包含 `SKILL.md` 文件，例如官网示例中的 pdf-processing：

```markdown
---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents.
---

# PDF Processing

## When to use this skill
Use this skill when the user needs to work with PDF files...

## How to extract text
1. Use pdfplumber for text extraction...

## How to fill forms
...
```

## Skills cli

[Skills cli](https://www.npmjs.com/package/skills)  是一个管理 AI Agent Skills 的 npm 工具库，支持 **OpenCode，ClaudeCode，Codex，Cursor** 等 [**37**](https://www.npmjs.com/package/skills#available-agents) 种不同的 Agent。使用此工具可以方便的管理项目或全局中所有 Agent 的 skills。

skills cli 支持从 git 仓库、npm、 本地磁盘安装 skills：

```
# GitHub shorthand (owner/repo)
npx skills add vercel-labs/agent-skills

# Full GitHub URL
npx skills add https://github.com/vercel-labs/agent-skills

# Direct path to a skill in a repo
npx skills add https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines

# GitLab URL
npx skills add https://gitlab.com/org/repo

# Any git URL
npx skills add git@github.com:vercel-labs/agent-skills.git

# Local path
npx skills add ./my-local-skills
```

实际安装使用：`npx skills add vercel-labs/agent-skills` 。这里选择了vercel-react-best-practices 、web-design-guidelines 两个 skil，Agent 选择的是 Claude Code，安装方式选择的是 Symlink

```markdown
┌   skills
│
◇  Source: https://github.com/vercel-labs/agent-skills.git
│
◇  Repository cloned
│
◇  Found 4 skills
│
◇  Select skills to install (space to toggle)
│  vercel-react-best-practices, web-design-guidelines
│
◇  41 agents
◇  Which agents do you want to install to?
│  Amp, Codex, Cursor, Gemini CLI, GitHub Copilot, Kimi Code CLI, OpenCode, Claude Code
│
◇  Installation scope
│  Project
│
◇  Installation method
│  Symlink (Recommended)
│
◇  Installation Summary ────────────────────────────────────────────────╮
│                                                                       │
│  ~/Desktop/skill1/.agents/skills/vercel-react-best-practices          │
│    universal: Amp, Codex, Cursor, Gemini CLI, GitHub Copilot +2 more  │
│    symlink → Claude Code                                              │
│                                                                       │
│  ~/Desktop/skill1/.agents/skills/web-design-guidelines                │
│    universal: Amp, Codex, Cursor, Gemini CLI, GitHub Copilot +2 more  │
│    symlink → Claude Code                                              │
│                                                                       │
├───────────────────────────────────────────────────────────────────────╯
│
◇  Security Risk Assessments ─────────────────────────────────────────────────╮
│                                                                             │
│                               Gen               Socket            Snyk      │
│  vercel-react-best-practices  Safe              0 alerts          Low Risk  │
│  web-design-guidelines        Safe              0 alerts          Med Risk  │
│                                                                             │
│  Details: https://skills.sh/vercel-labs/agent-skills                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────╯
│
◇  Proceed with installation?
│  Yes
│
◇  Installation complete
│
◇  Installed 2 skills ──────────────────────────────────────────────────╮
│                                                                       │
│  ✓ ~/Desktop/skill1/.agents/skills/vercel-react-best-practices        │
│    universal: Amp, Codex, Cursor, Gemini CLI, GitHub Copilot +2 more  │
│    symlinked: Claude Code                                             │
│  ✓ ~/Desktop/skill1/.agents/skills/web-design-guidelines              │
│    universal: Amp, Codex, Cursor, Gemini CLI, GitHub Copilot +2 more  │
│    symlinked: Claude Code                                             │
│                                                                       │
├───────────────────────────────────────────────────────────────────────╯
│
└  Done!  Review skills before use; they run with full agent permissions.
```

skills 都会存储在 `.agents/skills` 目录下，部分 Agent 的 skills 目录不是此目录。例如 claude code 对应的是 `.claude/skills` ，通过 Symlink 的方式安装，则会通过软连接的方式映射文件夹。安装后的目录结构如下：

```markdown
.
├── skills-lock.json
├── .agents
│   └── skills
│       ├── web-design-guidelines
│       │   └── SKILL.md
│       └── vercel-react-best-practices
│           ├── README.md
│           ├── SKILL.md
│           ├── rules
│           │   ├── js-cache-storage.md
│           │   ├── ....
│           │   ├── bundle-preload.md
│           └── AGENTS.md
└── .claude
    └── skills
        ├── web-design-guidelines
        └── vercel-react-best-practices
```

另外一个问题，什么样的仓库或目录结构才能被 skills cli 所安装呢？

skills cli 会在多个目录下查找符合条件的 **`SKILL.md` 文件，**例如以下目录：

```markdown
- Root directory (根目录 SKILL.md)
- skills/
- skills/.curated/
- skills/.experimental/
- skills/.system/
- .agents/skills/
- .agent/skills/
- .augment/skills/
- .claude/skills/
- .cline/skills/
- .codebuddy/skills/
- .commandcode/skills/
- .continue/skills/
- .cortex/skills/
- .crush/skills/
- .factory/skills/
- .goose/skills/
- .junie/skills/
- .iflow/skills/
- .kilocode/skills/
- .kiro/skills/
- .kode/skills/
- .mcpjam/skills/
- .vibe/skills/
- .mux/skills/
- .openhands/skills/
- .pi/skills/
- .qoder/skills/
- .qwen/skills/
- .roo/skills/
- .trae/skills/
- .windsurf/skills/
- .zencoder/skills/
- .neovate/skills/
- .pochi/skills/
- .adal/skills/
```

除此之外还支持 claude code 的清单文件：`.claude-plugin/marketplace.json` 或 `.claude-plugin/plugin.json` 。例如 [anthropics/skills](https://github.com/anthropics/skills)。

至此可以通过 skills cli 这个工具来管理团队的 skills。可以创建一个 git 仓库管理团队 skills：

```markdown
.
├── skills-lock.json
├── .agents
│   └── skills
│       ├── 组件编写规范
│       ├── H5样式编写规范
│       ├── ...
```

## Skill 创建

### 按 skill 的规范创建

根据第一章中的 sill 规范 新建对应的项目目录文件，放入对应 Agent 的目录即可。根据

### skill-creator 交互式创建

`skill-creator` 本身就是一个 skill。可以通过下面的命令直接安装到当前项目的 claude code 中：

```bash
npx skills add https://github.com/anthropics/skills/tree/main/skills/skill-creator -a claude-code -y
```

安装完成后就可以在 claude code 的对话中通过指令 `/skill-creator` 进入交互式的 skill 创建过程。例如创建一个 “H5项目的样式编写规范” 的 skill。借助交互式的对话也可以让 Agent 分析已有的代码生成规范以及追加修改要求等。

```
❯ /skill-creator H5项目的样式编写规范

⏺ Read 1 file (ctrl+o to expand)

⏺ 在开始创建 skill 之前，我需要了解一些具体细节。

⏺ User answered Claude's questions:
  ⎿  · 你的 H5 项目通常使用哪种样式方案？ → 多种方案混合
     · H5 适配方案使用哪种？ → rem 适配
     · 这个 skill 主要用于哪些场景？ → 编写新组件样式, 重构旧样式, Code Review, 修改组件

⏺ 了解了。再问几个关键问题来确保规范的完整性。

⏺ User answered Claude's questions:
  ⎿  · 项目的设计稿基准宽度是多少？ → 750px
     · 命名规范选用哪种？ → camelCase

⏺ 很好，现在我有足够的信息来创建这个 skill 了。让我先规划内容结构，然后初始化 skill。

  规划内容：
  - SKILL.md — 核心规范概览 + 触发条件
  - references/naming.md — camelCase 命名规范详情
  - references/adaptation.md — rem 适配方案（750px 设计稿）
  - references/properties-order.md — CSS 属性书写顺序
  - references/common-patterns.md — 常用样式模式

  初始化 skill：

⏺ Bash(cd /Users/xzl/Desktop/test-card-mey/.claude/skills/skill-creator && python3 scripts/init_skill.py h5-style-guide
      --path /Users/xzl/Desktop/test-card-mey/.claude…)
  ⎿  Initializing skill: h5-style-guide
       Location: /Users/xzl/Desktop/test-card-mey/.claude/skills/
     … +13 lines (ctrl+o to expand)

⏺ Bash(rm /Users/xzl/Desktop/test-card-mey/.claude/skills/h5-style-guide/scripts/example.py
      /Users/xzl/Desktop/test-card-mey/.claude/skills/h5-style-guide/assets/examp…)
  ⎿  Done

⏺ 现在写 SKILL.md 和各个 references 文件：

⏺ Write(~/Desktop/test-card-mey/.claude/skills/h5-style-guide/SKILL.md)
  ⎿  Error writing file

⏺ Read 1 file (ctrl+o to expand)

⏺ Write(~/Desktop/test-card-mey/.claude/skills/h5-style-guide/SKILL.md)
  ⎿  Added 79 lines, removed 54 lines
        1  ---
        2  name: h5-style-guide
        ...
      110 +- [ ] 颜色、间距使用变量，无魔法数字

⏺ 现在创建 references 文件：

⏺ Write(~/Desktop/test-card-mey/.claude/skills/h5-style-guide/references/naming.md)
  ⎿  Wrote 202 lines to ../../../.claude/skills/h5-style-guide/references/naming.md
      1 # 命名规范详细指南
      ...
     … +192 lines (ctrl+o to expand)

⏺ Write(~/Desktop/test-card-mey/.claude/skills/h5-style-guide/references/adaptation.md)
  ⎿  Wrote 132 lines to ../../../.claude/skills/h5-style-guide/references/adaptation.md
      1 # rem 适配方案详细说明
      ...
     … +122 lines (ctrl+o to expand)

⏺ Write(~/Desktop/test-card-mey/.claude/skills/h5-style-guide/references/properties-order.md)
  ⎿  Wrote 215 lines to ../../../.claude/skills/h5-style-guide/references/properties-order.md
      1 # CSS 属性书写顺序规范
      ...
     … +205 lines (ctrl+o to expand)

⏺ Write(~/Desktop/test-card-mey/.claude/skills/h5-style-guide/references/common-patterns.md)
  ⎿  Wrote 393 lines to ../../../.claude/skills/h5-style-guide/references/common-patterns.md
       1 # 常用样式模式
       ...
     … +383 lines (ctrl+o to expand)

⏺ 现在打包 skill：

⏺ Bash(cd /Users/xzl/Desktop/test-card-mey/.claude/skills/skill-creator && python3 scripts/package_skill.py
      /Users/xzl/Desktop/test-card-mey/.claude/skills/h5-style-gu…)
  ⎿  Packaging skill: /Users/xzl/Desktop/test-card-mey/.claude/skills/h5-style-guide

     Validating skill...
     … +10 lines (ctrl+o to expand)

⏺ h5-style-guide skill 已创建并打包成功。

  ---
  Skill 结构概览：

  h5-style-guide/
  ├── SKILL.md                        # 核心规范速查 + Code Review 检查项
  └── references/
      ├── naming.md                   # camelCase 命名规范详细示例
      ├── adaptation.md               # rem 适配方案配置与换算规则
      ├── properties-order.md         # CSS 属性书写顺序（5 组）
      └── common-patterns.md          # 常用样式模式（文本截断、1px线、安全区等）

  触发场景： 当你说"帮我写这个组件的样式"、"检查这段 CSS 是否规范"、"rem 怎么配置"等，该 skill 会自动激活并按规范指导编写。

  如果有需要补充的规范内容（比如 SCSS 变量约定、颜色 token、特定组件库用法等），随时可以告知我更新。

✻ Baked for 4m 27s

❯ 布局的情况下优先使用Ant提供的Flex Grid等布局组件。其他情况下优先使用tailwindcss，其次再是less module 再次
  style。样式主题
  ⎿  Interrupted · What should Claude do instead?

❯ 布局的情况下优先使用Ant提供的Flex Grid等布局组件。其他情况下优先使用tailwindcss，其次再是less module 再次
    style

⏺ 明白了，需要更新 skill 加入样式方案优先级规则。让我先读取当前文件再修改。

...
```

综上生成后的目录结构为：

```
  .claude/skills/h5-style-guide/
  ├── SKILL.md                        # 核心规范速查 + Code Review 检查项
  └── references/
      ├── naming.md                   # camelCase 命名规范详细示例
      ├── adaptation.md               # rem 适配方案配置与换算规则
      ├── properties-order.md         # CSS 属性书写顺序（5 组）
      └── common-patterns.md          # 常用样式模式（文本截断、1px线、安全区等）
```

在 claude code 中使用 `skill-creator` 生成后文件会默认放在 `.claude/skills` 下。如果需要在不同 Agent 中共享最好使用 skills cli 本地路径的安装方式导入到 `.agents/skills` 下，团队贡献也可以发布到 git 仓库中。

## Skills 仓库 与常用 skill

- 仓库：https://skills.sh/ 或 npm 上检索

- 常用 skills
    - 查找 skill ： https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md
