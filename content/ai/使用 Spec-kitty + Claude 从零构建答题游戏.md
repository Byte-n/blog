---
title: 使用 Spec-kitty + Claude 从零构建答题游戏
published: 2026-02-26
tags: []
category: AI
draft: false
---
::github{repo="Priivacy-ai/spec-kitty"}

 `spec-kitty` 则是由社区（Priivacy-ai）在`spec-kit` 基础上进行的二次开发，加入了更多针对**复杂项目**和**多 AI 代理协作**的实战功能。

**spec-kitty** 是在原版的基础上，增加了一套 “**AI 自动打工”的工程系统**：

- **物理隔离**：用 Git Worktree 开辟独立空间，AI 随便改，不弄乱你的主代码。
- **自动闭环**：不仅会写代码，还会**自动运行、自动改错、自动测试**。
- **可视化**：提供 **Web 看板**，像管理员工一样点点鼠标就能监控 AI 进度。
- **精准控制**：通过“宪法”和“任务拆解”大幅降低 AI 乱写代码（幻觉）的概率。

spec-kitty 支持的 Agent 如下：

| [Claude Code](https://www.anthropic.com/claude-code) |
| --- |
| [GitHub Copilot](https://code.visualstudio.com/) |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) |
| [Cursor](https://cursor.sh/) |
| [Qwen Code](https://github.com/QwenLM/qwen-code) |
| [opencode](https://opencode.ai/) |
| [Windsurf](https://windsurf.com/) |
| [Kilo Code](https://github.com/Kilo-Org/kilocode) |
| [Auggie CLI](https://docs.augmentcode.com/cli/overview) |
| [Roo Code](https://roocode.com/) |
| [Codex CLI](https://github.com/openai/codex) |

使用步骤：

1. `spec-kitty init`  — 在项目中初始化 spec-kitty
2. 切换到 Agent 中
    1. `/spec-kitty.constitution` — 定义项目的技术栈、编码约束、严禁事项
    2. `/spec-kitty.specify` — 明确需求
    3. `/spec-kitty.clarify` — 进一步细化规格中的模糊点
    4. `/spec-kitty.plan` — 生成实现计划和设计文档
    5. `/spec-kitty.research`— 可行性研究
    6. `/spec-kitty.tasks` — 生成工作包和可执行任务
    7. 执行任务，依次完成所有任务
        1. `/spec-kitty.implement` — 实现需求
        2. `/spec-kitty.review` — 检查代码
    8. `/spec-kitty.merge` — 合并所有分支

## 初始化

在项目中执行命令 `spec-kitty init .` 完成项目的初始化。这里选择的 Agent 是 claude code

```bash
╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│                                                                                                                                                                                                                                                                                                                             │
│  Specify Project Setup                                                                                                                                                                                                                                                                                                      │
│                                                                                                                                                                                                                                                                                                                             │
│  Project         test-card-mey                                                                                                                                                                                                                                                                                              │
│  Working Path    /Users/xzl/Desktop/test-card-mey                                                                                                                                                                                                                                                                           │
│                                                                                                                                                                                                                                                                                                                             │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

✓ git detected - will be used for version control

Agent Selection Strategy
This determines how agents are chosen for implementation and review tasks.

Single agent mode: Claude Code will do both implementation and review
Auto-detected script type: POSIX Shell (bash/zsh)
Selected AI assistant(s): Claude Code
Selected script type: sh
Selected mission: Software Dev Kitty
Initialize Specify Project
├── ● Check required tools (ok)
├── ● Select AI assistant(s) (Claude Code)
├── ● Select script type (sh)
├── ● Select mission (Software Dev Kitty)
├── ● Activate mission (Software Dev Kitty (per-feature selection))
├── ● Claude Code: fetch latest release (packaged data)
├── ● Claude Code: download template (local files)
├── ● Claude Code: extract template (commands generated)
├── ● Claude Code: archive contents (templates ready)
├── ● Claude Code: extraction summary (commands ready)
├── ● Claude Code: cleanup (done)
├── ● Ensure scripts executable (0 updated)
├── ● Initialize git repository (existing repo detected)
├── ● Finalize (project ready)
└── ● Install git hooks (3 hook(s) installed)

Project ready.

╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── Agent Folder Security ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│                                                                                                                                                                                                                                                                                                                             │
│  Some agents may store credentials, auth tokens, or other identifying and private artifacts in the agent folder within your project.                                                                                                                                                                                        │
│  Consider adding the following folders (or subsets) to .gitignore:                                                                                                                                                                                                                                                          │
│                                                                                                                                                                                                                                                                                                                             │
│  - Claude Code: .claude/                                                                                                                                                                                                                                                                                                    │
│                                                                                                                                                                                                                                                                                                                             │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── Next Steps ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│                                                                                                                                                                                                                                                                                                                             │
│  1. You're already in the project directory!                                                                                                                                                                                                                                                                                │
│  2. Available missions: software-dev, research (selected per-feature during /spec-kitty.specify)                                                                                                                                                                                                                            │
│  3. Start using slash commands with your AI agent (in workflow order):                                                                                                                                                                                                                                                      │
│     - /spec-kitty.dashboard - Open the real-time kanban dashboard                                                                                                                                                                                                                                                           │
│     - /spec-kitty.constitution - Establish project principles                                                                                                                                                                                                                                                               │
│     - /spec-kitty.specify - Create baseline specification                                                                                                                                                                                                                                                                   │
│     - /spec-kitty.plan - Create implementation plan                                                                                                                                                                                                                                                                         │
│     - /spec-kitty.research - Run mission-specific Phase 0 research scaffolding                                                                                                                                                                                                                                              │
│     - /spec-kitty.tasks - Generate tasks and kanban-ready prompt files                                                                                                                                                                                                                                                      │
│     - /spec-kitty.implement - Execute implementation from /tasks/doing/                                                                                                                                                                                                                                                     │
│     - /spec-kitty.review - Review prompts and move them to /tasks/done/                                                                                                                                                                                                                                                     │
│     - /spec-kitty.accept - Run acceptance checks and verify feature complete                                                                                                                                                                                                                                                │
│     - /spec-kitty.merge - Merge feature into main and cleanup worktree                                                                                                                                                                                                                                                      │
│                                                                                                                                                                                                                                                                                                                             │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── Enhancement Commands ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│                                                                                                                                                                                                                                                                                                                             │
│  Optional commands that you can use for your specs (improve quality & confidence)                                                                                                                                                                                                                                           │
│                                                                                                                                                                                                                                                                                                                             │
│  ○ /spec-kitty.clarify (optional) - Ask structured questions to de-risk ambiguous areas before planning (run before /spec-kitty.plan if used)                                                                                                                                                                               │
│  ○ /spec-kitty.analyze (optional) - Cross-artifact consistency & alignment report (after /spec-kitty.tasks, before /spec-kitty.implement)                                                                                                                                                                                   │
│  ○ /spec-kitty.checklist (optional) - Generate quality checklists to validate requirements completeness, clarity, and consistency (after /spec-kitty.plan)                                                                                                                                                                  │
│                                                                                                                                                                                                                                                                                                                             │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── Spec Kitty Dashboard Started ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│                                                                                                                                                                                                                                                                                                                             │
│  Dashboard URL: http://127.0.0.1:9237                                                                                                                                                                                                                                                                                       │
│  Port: 9237                                                                                                                                                                                                                                                                                                                 │
│                                                                                                                                                                                                                                                                                                                             │
│  The dashboard is running in the background and will continue even after                                                                                                                                                                                                                                                    │
│  this command exits. It will automatically update as you work.                                                                                                                                                                                                                                                              │
│                                                                                                                                                                                                                                                                                                                             │
│  Tip: Run /spec-kitty.dashboard or spec-kitty dashboard to open it in your browser                                                                                                                                                                                                                                          │
│                                                                                                                                                                                                                                                                                                                             │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

Updated .gitignore to exclude AI agent directories:
  • .claude/
  • .codex/
  • .opencode/
  • .windsurf/
  • .gemini/
  • .cursor/
  • .qwen/
  • .kilocode/
  • .augment/
  • .roo/
  • .amazonq/
  • .github/copilot/
  • .kittify/.dashboard
Created .claudeignore to optimize AI assistant scanning
Saved agent configuration (preferred strategy)
```

在初始化完成后，进入 claude code. 输入 `/spec-kitty`  就能看见相关的指令了。也可以使用 `spec-kitty verify-setup`  验证初始化是否正确。

## 定义项目规章 spec-kitty.constitution

在项目中切换到 claude code，执行指令 `/spec-kitty.constitution`  定义项目的技术栈、代码风格、严禁事项。

听着是不是与 skills 中对项目组件、样式的定义有重叠？这里可以直接引用 skills，例如：

```bash
## H5 Mobile Styling Standards

Applies to all mobile/H5 views. Reference the `h5-style-guide` skill for full details.
```

这里可以说吗项目的技术栈，引用 skils / mcp / 提示词 / 任意文件 来约束、补充说明。这里就是一个大纲，说明项目相关的内容。

```bash
❯ /spec-kitty.constitution

⏺ Searched for 1 pattern (ctrl+o to expand)

⏺ User answered Claude's questions:
  ⎿  · Do you want to establish a project constitution? → Minimal

⏺ Phase 1: Technical Standards
  These are the non-negotiable technical requirements that all features must follow.

  ---

⏺ User answered Claude's questions:
  ⎿  · What languages and frameworks are required for this project? → TypeScript + React (Frontend)

⏺ User answered Claude's questions:
  ⎿  · What testing framework and coverage requirements apply? → Jest + Vitest, coverage optional

⏺ User answered Claude's questions:
  ⎿  · What are the performance and scale expectations? → Standard web app

⏺ User answered Claude's questions:
  ⎿  · What are the deployment constraints or platform requirements? → Docker + Kubernetes

⏺ Constitution Summary

  ---
  Technical Standards:
  - Languages: TypeScript + React (Frontend)
  - Testing: Jest + Vitest, tests required but no strict coverage target
  - Performance: Standard web app — page load < 3s, smooth 60fps interactions
  - Deployment: Docker + Kubernetes

  Governance: Defaults (PR-based amendments, review-time compliance)

  Estimated length: ~50-60 lines

⏺ User answered Claude's questions:
  ⎿  · Proceed with writing the constitution? → /Users/xzl/Desktop/test-card-mey/.agents/skills/vercel-react-best-practices 与 /Users/xzl/Desktop/test-card-mey/.agents/skills/h5-style-guide

⏺ It looks like you want to incorporate your existing skill files into the constitution. Let me read them.

⏺ Searched for 2 patterns, read 4 files (ctrl+o to expand)

⏺ Got it — I'll bake the key standards from both skills into the constitution. Writing now.

⏺ Bash(mkdir -p /Users/xzl/Desktop/test-card-mey/.kittify/memory)
  ⎿  Done

⏺ Write(.kittify/memory/constitution.md)
  ⎿  Wrote 114 lines to .kittify/memory/constitution.md
       1 # test-card-mey Constitution
       2
       3 > Auto-generated by spec-kitty constitution command
       4 > Created: 2026-02-25
       5 > Version: 1.0.0
       6
       7 ## Purpose
       8
       9 This constitution captures the technical standards and coding conventions for
      10 test-card-mey. All features and pull requests should align with these principles.
     … +104 lines (ctrl+o to expand)

⏺ Constitution written to .kittify/memory/constitution.md.

  What was captured:

  - Technical Standards — TypeScript + React, Jest/Vitest, standard web perf targets, Docker + Kubernetes
  - React Performance — References the vercel-react-best-practices skill with the full 8-category priority ordering (from CRITICAL waterfalls/bundle to LOW advanced patterns)
  - H5 Styling Standards — Full rules from the h5-style-guide skill: style solution priority, unit conventions (rem/px via postcss-pxtorem, 750px base), camelCase naming, CSS property order, and the complete code review checklist

  Next steps:
  - Run /spec-kitty.specify to create a feature spec (constitution will automatically guide it)
  - Share .kittify/memory/constitution.md with your team for review
  - Run /spec-kitty.constitution anytime to update it
```

## 明确需求 spec-kitty.specify

这一步需要说明的内容是需要实现什么样的需求，从产品经理的角度描述需求，不参杂任何技术角度的问题。

例如 “帮我实现一个可以在PC与手机端与平板端使用的答题游戏网页。” 而不是“帮我实现几个基于React + Nextjs + TaildWin……”，然后 claude code 会向你确认需求，后续都是交互式的回答与修改即可，最终确认没问题即可自动生成需求规格说明等记录文档。

```bash
❯ /spec-kitty.specify

⏺ What feature would you like to build? Describe it in a sentence or two — what it does and who it's for.

  WAITING_FOR_DISCOVERY_INPUT

❯ 帮我实现一个可以在PC与手机端与平板端使用的答题游戏网页。

⏺ 好的！这是一个答题游戏网页，跨 PC / 手机 / 平板使用。让我了解一下核心玩法。

  问题 1 / 3

  答题游戏的核心模式是什么？

  - 单人闯关 — 玩家独自答题，通关/计分，类似知识竞赛
  - 多人实时对战 — 多个玩家同时在线抢答，房间制（类似 Kahoot）
  - 多人轮流答题 — 同一设备/房间轮流作答，适合聚会场景
  - 练习/刷题模式 — 无时间压力，用于学习复习

  WAITING_FOR_DISCOVERY_INPUT

❯ 帮我实现一个可以在PC与手机端与平板端使用的答题游戏网页。

⏺ 好的！这是一个答题游戏网页，跨 PC / 手机 / 平板使用。让我了解一下核心玩法。

  问题 1 / 3

  答题游戏的核心模式是什么？

  - 单人闯关 — 玩家独自答题，通关/计分，类似知识竞赛
  - 多人实时对战 — 多个玩家同时在线抢答，房间制（类似 Kahoot）
  - 多人轮流答题 — 同一设备/房间轮流作答，适合聚会场景
  - 练习/刷题模式 — 无时间压力，用于学习复习

  WAITING_FOR_DISCOVERY_INPUT

❯ 多人轮流答题，在一个网页上进行

⏺ 明白了！同一页面上多人轮流作答，聚会/桌游风格。

  问题 2 / 3

  题目内容怎么来？

  - 内置题库 — 预设好一批题目，开箱即用
  - 主持人/管理员自定义 — 游戏开始前手动输入题目和答案
  - 两者都要 — 有默认题库，也支持自定义

  WAITING_FOR_DISCOVERY_INPUT

❯ 两者都要 — 有默认题库，也支持自定义

⏺ 问题 3 / 3

  游戏规则细节是什么？（可多选，没有要求就选默认）

  - 计时答题 — 每题有倒计时，超时算错
  - 计分制 — 答对得分，可有速度加成
  - 答错扣分 — 答错会扣分
  - 纯娱乐 — 不计分，只看对错，重在参与

  你期望玩家人数范围大概是多少？（比如 2-8 人）

  WAITING_FOR_DISCOVERY_INPUT

❯ 1～12人

⏺ 完美。我已经有足够的上下文了。

  ---
  Intent Summary — 多人轮流答题游戏

  功能标题: Multiplayer Turn-Based Quiz Game

  一个响应式答题游戏网页，支持 1-12 名玩家在同一页面上轮流作答。

  核心功能：
  - 玩家设置 — 游戏开始前输入玩家数量（1-12）和名字
  - 题目来源 — 内置默认题库 + 主持人可在游戏前自定义题目/答案
  - 轮流机制 — 每轮显示当前玩家，展示题目，等待作答
  - 题型 — 单选题（多选项，含正确答案）
  - 计分 — 答对得分，答错不扣分，最终展示排行榜
  - 计时 — 每题有倒计时（默认合理秒数）
  - 结束 — 所有题目完成后显示最终排行榜
  - 设备适配 — PC / 平板 / 手机全端响应式布局

  Mission: software-dev

  这个理解准确吗？有需要调整的地方吗？

❯ 题目来源 — 内置默认题库 + 自定义的题库 （可自定义新增题库）多个题库合并

⏺ 明白了，更新理解：

  题目来源（更新）：
  - 内置默认题库 — 预设题目，开箱可用
  - 自定义题库 — 可新建多个独立题库，每个题库有名称和题目列表
  - 题库合并 — 开始游戏前，可勾选多个题库（内置 + 自定义任意组合），合并后随机抽题

  所以游戏流程大概是：选择题库 → 设置玩家 → 开始答题 → 排行榜

  这个理解对吗？确认后我就开始生成规格说明。

❯ 对的

⏺ Bash(spec-kitty agent feature create-feature "multiplayer-turn-based-quiz-game" --json)
	 ...
   ...

⏺ 规格说明已生成并提交。

  ---
  Feature 001-multiplayer-turn-based-quiz-game — 完成

  文件位置:
  - kitty-specs/001-multiplayer-turn-based-quiz-game/spec.md — 主规格说明
  - kitty-specs/001-multiplayer-turn-based-quiz-game/meta.json — 元数据
  - kitty-specs/001-multiplayer-turn-based-quiz-game/checklists/requirements.md — 质量检查清单（全部通过）

  规格摘要:

  ┌──────────┬──────────────────────────────────────────────────────────────────┐
  │   项目   │                               内容                               │
  ├──────────┼──────────────────────────────────────────────────────────────────┤
  │ 用户故事 │ 4 个（P1 核心游戏流程 → P4 响应式适配）                          │
  ├──────────┼──────────────────────────────────────────────────────────────────┤
  │ 功能需求 │ 22 条（FR-001 ~ FR-022）                                         │
  ├──────────┼──────────────────────────────────────────────────────────────────┤
  │ 成功标准 │ 6 条可量化指标                                                   │
  ├──────────┼──────────────────────────────────────────────────────────────────┤
  │ 边界情况 │ 6 个已定义                                                       │
  ├──────────┼──────────────────────────────────────────────────────────────────┤
  │ 关键实体 │ 5 个（QuestionBank、Question、Player、GameSession、Leaderboard） │
  └──────────┴──────────────────────────────────────────────────────────────────┘

  核心假设（已记录在 spec）:
  - 纯客户端，localStorage 持久化，无需后端
  - 单设备共享屏幕，无网络多人
  - 仅支持单选题，中文内置题库，答对得 1 分

  ---
  下一步:
  - /spec-kitty.clarify — 进一步细化规格中的模糊点
  - /spec-kitty.plan — 生成实现计划和设计文档
  - /spec-kitty.tasks — 生成工作包和可执行任务
```

这里可以看见已经自动给出了下一步的操作说明 `/spec-kitty.clarify`，`/spec-kitty.plan`，`/spec-kitty.tasks`

## 细化需求 spec-kitty.clarify

在 Claude code 中输入 `/spec-kitty.clarify` ，等待 AI 验证和抛出问题。

```bash
❯ /spec-kitty.clarify

⏺ Bash(spec-kitty agent feature check-prerequisites --json --paths-only)

⏺ Read 1 file (ctrl+o to expand)

⏺ 已加载规格说明并完成覆盖度扫描。发现以下几个需要澄清的关键点，我将逐一提问。

  ---
  问题 1 / 5 — 答题后的推进方式

  玩家答完一题（或超时）后，系统如何进入下一题？

  Options: (A) 自动推进 — 显示答案结果约 3 秒后自动进入下一轮 · (B) 手动推进 — 显示答案结果后，需有人点击"下一题"按钮才推进 · (C) 短暂展示后需确认 — 先显示对错，再出现一个"继续"按钮，所有人确认后才推进

  WAITING_FOR_DISCOVERY_INPUT

❯ C

⏺ ✓ 答案记录：答题结果先展示，然后由人点击"继续"推进。正在更新规格说明……

⏺ Update(kitty-specs/001-multiplayer-turn-based-quiz-game/spec.md)

⏺ ---
  问题 2 / 5 — 换人过渡屏

  每位玩家答完题、点击"继续"后，切换到下一位玩家时，是否需要一个过渡屏（例如："轮到 [玩家名] 了 — 请接过设备，点击开始"）？

  Options: (A) 需要 — 每次换人都有过渡屏，防止上一位玩家看到下一题 · (B) 不需要 — 直接显示下一题，玩家名在题目页面上方展示即可

  WAITING_FOR_DISCOVERY_INPUT

✻ Baked for 36s

❯ B

⏺ ✓ 答案记录：换人无过渡屏，直接展示下一题，当前玩家名显示在题目页顶部。正在更新规格说明……

⏺ Update(kitty-specs/001-multiplayer-turn-based-quiz-game/spec.md)

⏺ ---
  问题 3 / 5 — 每局题目数量

  开始游戏时，是否可以设定本局要答的题目数量（而不是默认使用所选题库的全部题目）？

  Options: (A) 固定全部 — 永远使用所选题库中的全部题目，无需设置 · (B) 可自定义 — 主持人可在开始前设置本局题目数量上限（如"只答 20 题"）

  WAITING_FOR_DISCOVERY_INPUT

❯ 设定游戏的轮数

⏺ ✓ 答案记录："轮数"作为游戏配置项 — 主持人在开始前设定本局要进行几轮，一轮 = 每位玩家各答一题。正在更新规格说明……

⏺ Update(kitty-specs/001-multiplayer-turn-based-quiz-game/spec.md)

⏺ ---
  问题 4 / 5 — 自定义题库的导入/导出

  用户能否将自定义题库导出为文件（方便分享或备份），或从文件导入题库？

  Options: (A) 不需要 — 题库仅存本设备，无导入/导出功能 · (B) 仅导出 — 可将题库导出为文件（如 JSON），方便备份 · (C) 导入+导出 — 可导出也可从文件导入，支持跨设备共享

  WAITING_FOR_DISCOVERY_INPUT

✻ Sautéed for 1m 8s

❯ C

⏺ ✓ 答案记录：支持题库导出（JSON 文件）和从文件导入，实现跨设备共享。正在更新规格说明……

⏺ Update(kitty-specs/001-multiplayer-turn-based-quiz-game/spec.md)

⏺ ---
  问题 5 / 5 — 排行榜同分处理

  游戏结束时，若多名玩家得分相同，排行榜如何排列？

  Options: (A) 相同排名 — 同分玩家并列同一名次（如并列第 2） · (B) 按答题顺序 — 同分时轮次靠前的玩家排名更高 · (C) 按名字字母序排列同分玩家

  WAITING_FOR_DISCOVERY_INPUT

✻ Crunched for 30s

❯ A

⏺ ✓ 答案记录：同分玩家并列相同名次。正在写入并完成最终验证……

⏺ Update(kitty-specs/001-multiplayer-turn-based-quiz-game/spec.md)

⏺ ---
  澄清完成 — 5 / 5 问题已回答

  规格说明已更新并提交：kitty-specs/001-multiplayer-turn-based-quiz-game/spec.md

  修改的章节：
  - Clarifications / Session 2026-02-25 — 新增，记录 5 条问答
  - Functional Requirements / Gameplay — FR-006、FR-008、FR-009 更新
  - Functional Requirements / Game Setup — 新增 FR-005b（轮数设置）
  - Functional Requirements / Question Bank Management — 新增 FR-017b、FR-017c（导入/导出）
  - Functional Requirements / End of Game — FR-019 更新（同分并列）
  - Key Entities — GameSession 更新（含轮数字段）
  - Edge Cases — 问题池不足时的提示说明更新

  覆盖度总结：
  - 功能范围与行为 — Resolved
  - 领域与数据模型 — Resolved
  - 交互与 UX 流程 — Resolved（答题推进方式、换人方式均已明确）
  - 非功能质量属性 — Clear（性能指标已在规格中定义）
  - 集成与外部依赖 — Resolved（JSON 导入/导出格式已明确）
  - 边界情况与错误处理 — Clear
  - 约束与取舍 — Clear
  - 术语一致性 — Clear
  - 完成信号 — Clear

  下一步：执行 /spec-kitty.plan 生成实现计划和设计文档。

✻ Worked for 46s
```

## 生成实现计划和设计文档 spec-kitty.plan

```bash
❯ /spec-kitty.plan

⏺ 已加载规格说明。这是一个中高复杂度功能（多屏幕状态机 + 本地持久化 + 导入/导出），需要确认几个架构决策。

  ---
  规划问题 1 / 4 — 项目起点

  当前 test-card-mey 是全新项目还是已有代码基础？

  Options: (A) 全新项目 — 从零搭建，需要初始化脚手架 · (B) 已有 React/TypeScript 项目 — 在现有代码库中新增此功能 · (C) 有框架但无业务代码 — 已初始化脚手架（如 Vite + React），但业务代码为空

  WAITING_FOR_PLANNING_INPUT

❯ C

⏺ Read 1 file (ctrl+o to expand)

⏺ 已确认：Vite + React 19 + TypeScript + Ant Design v6 + Tailwind + Less，完全符合宪法。

  ---
  规划问题 2 / 4 — 状态管理

  游戏会话有复杂状态（当前玩家、轮次、分数、题目池等），选用哪种状态管理方案？

  Options: (A) Zustand — 轻量全局状态库，适合游戏状态机，推荐 · (B) React Context + useReducer — 纯内置方案，无额外依赖 · (C) Redux Toolkit — 功能完整但相对重量级

  WAITING_FOR_PLANNING_INPUT

✻ Cooked for 39s

❯ A

⏺ ---
  规划问题 3 / 4 — 页面导航

  游戏有多个视图（设置 → 答题 → 结果 → 题库管理），如何处理视图切换？

  Options: (A) React Router — URL 路由，支持浏览器前进/后退，可直接分享特定页面链接 · (B) 条件渲染 — 用状态控制视图切换，无 URL 变化，更简单

  WAITING_FOR_PLANNING_INPUT

❯ A

⏺ ---
  规划问题 4 / 4 — 测试策略

  游戏逻辑（轮次推进、计分、题库合并等）如何测试？

  Options: (A) Vitest 单元测试覆盖核心游戏逻辑 + React Testing Library 覆盖关键交互 · (B) 仅 Vitest 单元测试覆盖纯函数逻辑，组件不写测试 · (C) 暂不写测试，先实现功能

  WAITING_FOR_PLANNING_INPUT

❯ B

⏺ 工程对齐确认：
  - 脚手架：Vite + React 19 + TypeScript（现有）
  - 状态管理：Zustand
  - 路由：React Router
  - 测试：Vitest（纯函数/游戏逻辑）
  - UI：Ant Design v6 + Tailwind + Less（宪法规定）
  - 持久化：localStorage + Browser File API（导入/导出）

  确认后我将开始生成计划文档。没问题的话直接回复确认即可。

  WAITING_FOR_PLANNING_INPUT

❯ 确认

⏺ Bash(git rev-parse --abbrev-ref HEAD)
  ...

⏺ 规划阶段完成。

  ---
  生成的文档

  ┌────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────┐
  │                                      文件                                      │                                          内容                                          │
  ├────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ kitty-specs/001-multiplayer-turn-based-quiz-game/plan.md                       │ 完整实现计划（技术上下文、宪法检查、项目结构、屏幕流程、状态机）                       │
  ├────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ kitty-specs/001-multiplayer-turn-based-quiz-game/research.md                   │ 9 个架构决策（Zustand、React Router、File API、密集排名、计时器、pxtorem、题库格式等） │
  ├────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ kitty-specs/001-multiplayer-turn-based-quiz-game/data-model.md                 │ TypeScript 接口定义、状态机、验证规则、localStorage 布局、派生值公式                   │
  ├────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ kitty-specs/001-multiplayer-turn-based-quiz-game/contracts/state-contracts.ts  │ Zustand Store 接口契约                                                                 │
  ├────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ kitty-specs/001-multiplayer-turn-based-quiz-game/contracts/storage-schema.json │ localStorage + 导入/导出 JSON Schema                                                   │
  ├────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ kitty-specs/001-multiplayer-turn-based-quiz-game/quickstart.md                 │ 安装步骤、路由表、工作包顺序（WP-01 ~ WP-09）                                          │
  └────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────┘

  宪法检查：全部通过 — 无违规项。

  覆盖度：
  - 功能范围 — Clear
  - 数据模型 — Resolved（含完整 TS 类型）
  - 交互/UX 流程 — Resolved（状态机 + 屏幕流）
  - 非功能属性 — Clear（性能目标已在 plan.md 记录）
  - 集成与依赖 — Resolved（Zustand persist、File API、JSON schema）
  - 边界情况 — Clear

  ---
  下一步：执行 /spec-kitty.tasks 生成工作包和可执行任务。

✻ Baked for 4m 35s
```

## 生成可执行任务 spec-kitty.tasks

```bash
❯ /spec-kitty.tasks

⏺ Bash(spec-kitty agent feature check-prerequisites --json --paths-only --include-tasks)

⏺ Read 3 files (ctrl+o to expand)

⏺ 正在推导完整子任务列表并分组……生成 9 个工作包。

⏺ Write(kitty-specs/001-multiplayer-turn-based-quiz-game/tasks.md)

⏺ Now generate all 9 WP prompt files in parallel batches:

⏺ Write(kitty-specs/001-multiplayer-turn-based-quiz-game/tasks/WP01-project-setup-and-foundation.md)

⏺ Write(kitty-specs/001-multiplayer-turn-based-quiz-game/tasks/WP02-bank-store-and-persistence.md)

⏺ Write(kitty-specs/001-multiplayer-turn-based-quiz-game/tasks/WP03-game-engine-and-store.md)

⏺ Write(kitty-specs/001-multiplayer-turn-based-quiz-game/tasks/WP04-setup-page.md)

⏺ Write(kitty-specs/001-multiplayer-turn-based-quiz-game/tasks/WP05-game-page-and-result-page.md)

⏺ Write(kitty-specs/001-multiplayer-turn-based-quiz-game/tasks/WP06-leaderboard-page.md)
  
⏺ Write(kitty-specs/001-multiplayer-turn-based-quiz-game/tasks/WP07-bank-manager-page.md)
 
⏺ Write(kitty-specs/001-multiplayer-turn-based-quiz-game/tasks/WP08-responsive-design-and-polish.md)

⏺ Write(kitty-specs/001-multiplayer-turn-based-quiz-game/tasks/WP09-unit-tests.md)

⏺ Now run finalize-tasks:

⏺ Bash(spec-kitty agent feature finalize-tasks --json)

⏺ ✅ 已提交（fe01bb5）。任务生成完毕。

  ---
  工作包汇总 — 9 个 WP，46 个子任务

  ┌──────┬────────────────────────────┬──────────┬──────────┬───────────┐
  │  WP  │            标题            │ 子任务数 │ 预估行数 │   依赖    │
  ├──────┼────────────────────────────┼──────────┼──────────┼───────────┤
  │ WP01 │ Project Setup & Foundation │ 6        │ ~350     │ 无        │
  ├──────┼────────────────────────────┼──────────┼──────────┼───────────┤
  │ WP02 │ Bank Store & Persistence   │ 5        │ ~380     │ WP01      │
  ├──────┼────────────────────────────┼──────────┼──────────┼───────────┤
  │ WP03 │ Game Engine & Game Store   │ 6        │ ~400     │ WP01      │
  ├──────┼────────────────────────────┼──────────┼──────────┼───────────┤
  │ WP04 │ Setup Page                 │ 5        │ ~370     │ WP02+WP03 │
  ├──────┼────────────────────────────┼──────────┼──────────┼───────────┤
  │ WP05 │ Game Page & Result Page    │ 5        │ ~420     │ WP03      │
  ├──────┼────────────────────────────┼──────────┼──────────┼───────────┤
  │ WP06 │ Leaderboard Page           │ 4        │ ~280     │ WP03      │
  ├──────┼────────────────────────────┼──────────┼──────────┼───────────┤
  │ WP07 │ Bank Manager Page          │ 6        │ ~450     │ WP02      │
  ├──────┼────────────────────────────┼──────────┼──────────┼───────────┤
  │ WP08 │ Responsive Design & Polish │ 6        │ ~380     │ WP04-07   │
  ├──────┼────────────────────────────┼──────────┼──────────┼───────────┤
  │ WP09 │ Unit Tests                 │ 3        │ ~300     │ WP02+WP03 │
  └──────┴────────────────────────────┴──────────┴──────────┴───────────┘

  大小验证: ✓ 所有 WP 在 280–450 行范围内，均在理想区间（200–500 行）

  并行化机会:
  WP01
   ├── WP02 ──┬── WP04 ──┐
   └── WP03 ──┤           ├── WP08
              ├── WP05 ──┤
              ├── WP06 ──┤
              └── WP07 ──┘   WP09（可与 WP08 并行）

  MVP 范围: WP01 + WP02 + WP03 + WP04 + WP05 + WP06 — 可完整运行游戏，含内置题库

  下一步: 执行 /spec-kitty.implement WP01 开始实现第一个工作包。

✻ Cooked for 14m 10s
```

## 执行任务

轮流执行 `/spec-kitty.implement` 、`/spec-kitty.review` 直至所有的任务都为待合并状态，再执行 `/spec-kitty.merge`

## 监控面板 spec-kitty dashboard

执行命令 `spec-kitty dashboard` 即可启动监控面板服务

```bash
xzl@xzldeMac-mini test-card-mey % spec-kitty dashboard

Spec Kitty Dashboard
============================================================

  Project Root: /Users/xzl/Desktop/test-card-mey
  URL: http://127.0.0.1:9237
  Port: 9237

  ✅ Status: Dashboard already running on port 9237

============================================================

✅ Opening dashboard in your browser...
```

在 Implement 界面中查看任务进度

![image.png](attachment:8b2318e8-8e9e-46a8-b37d-7450bb14a26d:image.png)

一个小时后，这期间需要不断手动 `/spec-kitty.implement` 、`/spec-kitty.review`。可以

![image.png](attachment:b3f5f4d4-498a-478c-a0ca-44e5d603bc54:image.png)

## 结果

claude code 成本统计。AI 工作耗时 2h 2m 48s

```bash
❯ /cost
  ⎿  Total cost:            $36.45
     Total duration (API):  2h 2m 48s
     Total duration (wall): 13h 56m 49s
     Total code changes:    7581 lines added, 161 lines removed
     Usage by model:
         claude-haiku-4-5:  106.4k input, 9.3k output, 0 cache read, 65.9k cache write ($0.2353)
        claude-sonnet-4-6:  21.7k input, 213.7k output, 39.5m cache read, 1.8m cache write ($36.22)
```

在开发完成后，因为 Agent 使用超出时间窗口限制，手动修复了两个全局状态使用错误。

从界面效果来看需求描述中的功能都实现了。H5 与 移动端的适配也还可以。界面样式美观程度一般，因为没有补充对应的要求说明，若搭配上对应的 skill 应该就能生成更美观的界面（例如 https://github.com/nextlevelbuilder/ui-ux-pro-max-skill 或 https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md）

界面效果：https://byte-n.github.io/spec-kitty-test-question-game/

![image.png](attachment:2a6067c5-bcec-4039-acfc-c800a2073542:image.png)
