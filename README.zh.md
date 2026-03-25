<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

# Role OS

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/role-os/readme.png" alt="Role OS" width="400">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/role-os/actions"><img src="https://github.com/mcp-tool-shop-org/role-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/role-os"><img src="https://img.shields.io/npm/v/role-os" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
  <a href="https://mcp-tool-shop-org.github.io/role-os/"><img src="https://img.shields.io/badge/Landing_Page-live-brightgreen" alt="Landing Page"></a>
</p>

一个多 Claude 操作系统，它通过 31 个专业角色，进行人员配置、任务分配、验证和执行。它创建任务包，根据角色匹配度组建合适的团队，在执行前检测潜在问题，当任务被阻塞或拒绝时自动进行恢复，并且要求在每个决策中提供结构化的证据。

## 其作用

Role OS 是使用多 Claude 的专业方式。它避免了通用 AI 工作流程中可能出现的特定问题：

- **偏差 (Drift)**：每个角色都专注于其职责范围。产品不会被重新设计。前端不会重新定义范围。后端不会自行决定产品方向。
- **虚报完成 (False completion)**：完成的标准是明确的。隐藏缺陷、跳过验证或解决不同问题的成果会被拒绝。
- **污染 (Contamination)**：分叉或继承的项目可能包含身份残留。Role OS 可以检测并拒绝跨项目的术语、视觉和思维模式上的偏差。
- **基于主观感受的进度 (Vibes-based progress)**：每个交接环节都是结构化的。每个结论都必须基于证据。 “感觉完成了” 并不是一个有效的状态。

## 工作原理

描述您的任务。Role OS 会自动决定合适的执行级别。

```bash
roleos start "fix the crash in save handler"
# → MISSION: Bugfix & Diagnosis (70% confidence)
#   Chain: Repo Researcher → Backend Engineer → Test Engineer → Critic Reviewer

roleos start "add a new export command"
# → PACK: Feature Build (50% confidence)
#   Roles: Orchestrator, Product Strategist, Spec Writer, Backend Engineer, Test Engineer, Critic Reviewer

roleos start "something completely novel"
# → FREE-ROUTING (10% confidence)
#   Hint: Create a packet and run `roleos route` for role-level routing
```

**备用方案：**

1. **任务 (Mission)** — 当任务符合已验证的重复工作流程时（例如：bug 修复、功能完善、文档编写、安全检查、研究）。已知角色链、流程、升级路径以及清晰的定义。
2. **任务包 (Pack)** — 当任务属于已知的任务类型，但不是完整的任务流程时。有 7 个经过校准的团队包，具有自动选择功能和防止不匹配的机制。
3. **自由路由 (Free routing)** — 当任务是全新的、混合的或不确定的时。它会根据任务内容对所有 31 个角色进行评分，并组装一个动态的角色链。

该系统永远不会将任务强制执行到错误的抽象层。它会解释为什么选择每个级别，并提供替代方案。

**任务执行后：**

1. **每个角色都会产生一个交接 (handoff)** — 结构化的输出，包含证据，以减少下一个角色的理解歧义。
2. **评审员 (Critic) 根据合同进行审查** — 根据结构化的证据，接受、拒绝或阻止任务，而不是主观判断。
3. **自动进行恢复 (Recovery routes automatically)** — 被阻塞或拒绝的任务会被路由到合适的处理者，并提供原因、恢复类型和所需的资源。

## 组织部署状态

组织范围的部署状态（队列、决策、审计记录、每个仓库的锁定任务包）存储在一个独立的私有仓库中：[`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout)。 该仓库是产品，而该仓库是运行状态。

## 内存与连续性

Role OS 不拥有或复制内存层。如果 Claude 项目中存在内存，它就是标准的连续性系统，代码仓库的事实、决策、未解决的问题和处理历史都存储在那里。

Role OS 与 Claude 项目的内存集成，而不是替代它。

## 完整的处理流程和发布检查

完整的处理流程是一个由 7 个阶段组成的规范流程，定义在 Claude 项目的内存中（`memory/full-treatment.md`）。Role OS 使用角色合约、交接和评审环节来处理流程，而不是重新定义该流程。

**发布检查 (Shipcheck)** 是在完整处理流程之前执行的 31 个项目质量检查。在开始任何处理之前，必须通过 A 到 D 这四个关键检查。参考文档：`memory/shipcheck.md`。

顺序：首先进行发布检查，然后进行完整的处理流程。在通过所有关键检查之前，不能发布 v1.0.0 版本。

## 31 个角色，分布在 8 个任务包中

| 任务包 | 角色 |
|------|-------|
| **Core** (3) | 协调员、产品策略师、评审员 |
| **Engineering** (7) | 前端开发工程师、后端工程师、测试工程师、重构工程师、性能工程师、依赖性审计员、安全审查员 |
| **Design** (2) | UI 设计师、品牌管理员 |
| **Marketing** (1) | 发布文案撰写员 |
| **Treatment** (7) | 仓库研究员、仓库翻译员、文档架构师、元数据管理员、覆盖率审计员、部署验证员、发布工程师 |
| **Product** (3) | 反馈综合员、路线图优先级排序员、规范撰写员 |
| **Research** (4) | 用户体验研究员、竞争分析师、趋势研究员、用户访谈综合员 |
| **Growth** (4) | 发布策略师、内容策略师、社区管理员、支持问题处理负责人 |

每个角色都有完整的合同：任务描述、适用场景、不适用场景、预期输入、所需输出、质量标准以及升级触发条件。 每一个角色都可以被路由——`roleos route` 可以根据任务内容推荐任何一个角色。

## 快速入门

```bash
npx role-os init

# Describe what you need — Role OS picks the right level:
roleos start "fix the crash in save handler"

# Or go manual:
roleos packet new feature
roleos route .claude/packets/my-feature.md
roleos review .claude/packets/my-feature.md accept
roleos status

# Explore missions and packs:
roleos mission list
roleos mission show bugfix
roleos packs list
roleos packs show feature
```

## 何时不应使用 Role OS

- 单行修复、拼写错误或明显错误
- 没有明确输出的探索性研究
- 任务可以在 5 分钟内由一个人完成
- 需要在审查链完成之前发布的紧急修复
- 优先考虑速度而不是结构的开发项目

## 证据

Role OS 已在两个结构不同的代码仓库中的三个试验项目中得到验证：

**试验 001 — 功能开发 (Feature work)** (Crew Screen, Star Freight)
- 7 个角色链，45 个测试场景，0 个角色冲突
- 避免了从父代码仓库的污染，发现了代码中的即兴创作，并暴露了真实的障碍。

**试验 002 — 集成 (Integration work)** (CampaignState wiring, Star Freight)
- 5 个角色链，解决了架构接口问题，避免了虚假的回滚。
- 抗回滚测试证明了当前路径是真实的，而不是占位符。

**试验 003 — 身份验证 (Identity work)** (Contamination purge, Star Freight)
- 6 个角色链，51 个测试场景，包括持久的 CI 污染防御
- 在修复继承的错误偏差时，避免了对整个产品的重新设计。

**可移植性试验**（角色一致性，传感器幽默）
- 相同的核心，不同的语言/领域/技术栈
- 仅在上下文发生变化的情况下采用，不进行核心合同的修改。

**完整流程 FT-001** (portlight-desktop)
- 包含 7 个阶段的、由 Treatment Pack 角色组成的流程
- 经过验证的 Shipcheck 机制，无角色冲突

**完整流程 FT-002** (studioflow)
- 相同的任务包，但结构上不同的仓库（创意工作区与游戏）
- Treatment Pack 具有可移植性，无需修改合同

## 核心特性

这些是不可谈判的。如果任何一项特性被削弱，则应拒绝该更改。

- 角色边界保持不变
- 审查具有实际效力
- 升级流程保持诚实
- 测试用例保持可测试性
- 可移植性需要根据上下文进行调整，而不是进行核心修改。

## 项目结构

```
role-os/
  bin/roleos.mjs               ← CLI entrypoint
  src/
    entry.mjs                  ← Unified entry: mission → pack → free routing
    entry-cmd.mjs              ← `roleos start` CLI command
    mission.mjs                ← 6 named mission types (feature, bugfix, treatment, docs, security, research)
    mission-run.mjs            ← Mission runner: create → step → complete → report
    mission-cmd.mjs            ← `roleos mission` CLI commands
    route.mjs                  ← 31-role routing + dynamic chain builder
    packs.mjs                  ← 7 calibrated team packs + auto-selection
    conflicts.mjs              ← 4-pass conflict detection
    escalation.mjs             ← Auto-routing for blocked/rejected/split
    evidence.mjs               ← Structured evidence + role-aware requirements
    dispatch.mjs               ← Runtime dispatch manifests for multi-claude
    artifacts.mjs              ← 20 per-role artifact contracts + 7 pack handoffs
    decompose.mjs              ← Composite task detection + splitting
    composite.mjs              ← Dependency-ordered execution + recovery
    replan.mjs                 ← Mid-run adaptive replanning
    calibration.mjs            ← Outcome recording + weight tuning
    hooks.mjs                  ← 5 lifecycle hooks for runtime enforcement
    session.mjs                ← Session scaffolding + doctor
  test/                        ← 527 tests across 20 test files
  starter-pack/                ← Drop-in role contracts, policies, schemas, workflows
```

## 安全性

角色操作系统仅在本地运行。它复制 Markdown 模板，并将数据包/判决文件写入到您仓库的 `.claude/` 目录中。它不访问网络，不处理敏感信息，也不收集遥测数据。没有危险操作——所有文件写入默认使用“如果存在则跳过”的方式。请参阅 [SECURITY.md](SECURITY.md) 以获取完整策略。

## 该操作系统

| 层 | 其作用 | 状态 |
|-------|-------------|--------|
| **Routing** | 根据任务内容对所有 31 个角色进行评分，解释推荐，评估置信度。 | ✓ 已发布 |
| **Chain builder** | 从评分结果中组装出按阶段排列的任务链，支持基于包类型的偏好，但不依赖于模板。 | ✓ 已发布 |
| **Conflict detection** | 进行四次验证：检查冲突、序列、冗余和覆盖范围。提供修复建议。 | ✓ 已发布 |
| **Escalation** | 自动将受阻、被拒绝或拆分的工作分配给合适的处理模块，并提供原因和所需的资源。 | ✓ 已发布 |
| **Evidence** | 在结果中提供结构化的、与角色相关的证据。进行充分性检查。包含12种类型的证据。 | ✓ 已发布 |
| **Dispatch** | 为多任务生成执行清单。每个角色都有独立的工具配置、系统提示和预算。 | ✓ 已发布 |
| **Trials** | 所有任务已完成：30个黄金任务和5个负面测试用例均通过。7个测试包已完成。 | ✓ 完成 |
| **Team Packs** | 7个经过校准的测试包，具有自动选择、不匹配保护和自由路由回退功能。 | ✓ 已发布 |
| **Outcome calibration** | 记录运行结果，根据结果调整测试包和角色的权重，并调整置信度阈值。 | ✓ 已发布 |
| **Mixed-task decomposition** | 检测复合任务，将其拆分为子任务，分配测试包，并保留依赖关系。 | ✓ 已发布 |
| **Composite execution** | 按照依赖关系顺序运行子任务，传递资源，进行分支恢复和合成。 | ✓ 已发布 |
| **Adaptive replanning** | 在运行过程中，范围变更、发现或新的需求可以更新计划，而无需重新启动。 | ✓ 已发布 |
| **Session spine** | `roleos init claude` 命令会创建 CLAUDE.md、/roleos-route、/roleos-review 和 /roleos-status 文件。`roleos doctor` 命令用于验证配置。路由卡用于证明参与情况。 | ✓ 已发布 |
| **Hook spine** | 5个生命周期钩子（SessionStart、PromptSubmit、PreToolUse、SubagentStart、Stop）。强制执行建议：路由卡提醒、工具使用限制、子任务角色注入、完成审计。 | ✓ 已发布 |
| **Artifact spine** | 20个与角色相关的资源合同。7个测试包的交接合同。进行结构验证。检查任务链的完整性。下游角色永远无法猜测他们收到的内容。 | ✓ 已发布 |
| **Mission library** | 6个命名任务（功能发布、Bug修复、优化、文档发布、安全加固、研究启动）。每个任务都声明了测试包、角色链、资源流程、升级分支和诚实的部分定义。所有6个任务都经过试运行和强化。 | ✓ 已发布 |
| **Mission runner** | 创建运行，逐步执行并跟踪状态，完成或失败时提供诚实报告。传播受阻步骤，发出链外升级警告，允许重新打开最后一步。 | ✓ 已发布 |
| **Unified entry** | `roleos start` 命令可以自动决定是执行任务、测试包还是自由路由。提供回退机制，包括置信度评分、备选方案和复合任务检测。 | ✓ 已发布 |

## 6个任务

| 任务 | 任务包 | 角色 | 使用场景 |
|---------|------|-------|-------------|
| `feature-ship` | 功能 | 5 | 完整功能交付：范围定义 → 规格制定 → 实现 → 测试 → 评审 |
| `bugfix` | Bug修复 | 4 | 诊断根本原因，修复，测试，验证 |
| `treatment` | 优化 | 4 | 发布检查 + 优化 + 文档 + CI验证 + 评审 |
| `docs-release` | 文档 | 2 | 编写/更新文档、发布说明 |
| `security-hardening` | 安全性 | 4 | 威胁模型、审计、修复漏洞、重新审计、验证 |
| `research-launch` | 研究 | 4 | 提出问题、研究、记录发现、决策 |

每个任务都包含诚实的部分定义——当工作停滞时，系统会记录已完成的内容和剩余的内容，而不是虚报完成情况。

## 状态

- v0.1–v0.4：基础版本——测试、采用、治疗方案包、入门包。
- v1.0.0：32个角色，完整的命令行界面，经过验证的治疗方案，支持多仓库移植。
- v1.0.2：角色操作系统锁定（修复引导启动问题，使用 --force 参数）。
- v1.1.0：31个角色，完整的路由核心，冲突检测，升级机制，证据收集，任务分发，7个经过验证的团队方案包。35次执行测试。212个测试用例。
- v1.2.0：经过校准的方案包被设置为默认选项。自动选择，不匹配检测，备选方案建议，自由路由回退。246个测试用例。
- v1.3.0：结果校准，混合任务分解，组合执行，自适应重新规划。317个测试用例。
- v1.4.0：会话核心——`roleos init claude`，`roleos doctor`，路由卡片，/roleos-route + /roleos-review + /roleos-status 命令。335个测试用例。
- v1.5.0：钩子核心——5个生命周期钩子，用于运行时强制执行。358个测试用例。
- v1.6.0：构件核心——20个角色相关的构件协议，7个方案包交付协议，结构验证。385个测试用例。
- v1.7.0：完成证明——真实任务通过整个系统运行。`roleos artifacts` 命令行界面。对结构性问题的诚实反馈。398个测试用例。
- v1.8.0：任务库（阶段S）——6个命名任务，运行引擎，完成报告。经过6次真实测试的强化版本。481个测试用例。
- **v1.9.0**：统一入口路径（阶段T）——`roleos start` 自动决定是任务、方案包还是自由路由。回退机制，组合检测，入口路径比较测试。527个测试用例。

## 许可证

MIT

---

由 <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a> 构建。
