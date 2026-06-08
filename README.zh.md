<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/role-os/readme.png" alt="Role OS" width="600">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/role-os/actions"><img src="https://github.com/mcp-tool-shop-org/role-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/role-os"><img src="https://img.shields.io/npm/v/role-os" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
  <a href="https://mcp-tool-shop-org.github.io/role-os/"><img src="https://img.shields.io/badge/Landing_Page-live-brightgreen" alt="Landing Page"></a>
</p>

一种多 Claude 操作系统的解决方案，它对员工进行管理、分配任务、验证结果并执行工作，通过 61 个专门的角色合同来完成。它创建任务包，从经过评分的角色匹配中组建合适的团队，在执行之前检测出流程中的问题，当工作被阻止或拒绝时自动调整恢复方案，并且要求在每次决策中提供结构化的证据。它包括动态调度功能，可用于处理大规模的任务——一个包含 10 个组件的仓库会自动扩展到 28 个审核步骤，而不是 6 个。

## 它的作用是什么？

角色操作系统是使用多 Claude 的专业方法。它可以防止通用 AI 工作流程中出现的一些特定问题：

- **偏离**——各个角色各司其职。产品不会重新设计。前端不会重新定义范围。后端不会决定产品的方向。
- **虚假完成**——“完成”的定义是明确的。那些掩盖漏洞、跳过验证或解决不同问题的任务将被拒绝。
- **污染**——分叉或继承的项目会带有身份残留。角色操作系统检测并拒绝项目中术语、视觉效果和思维模式方面的差异。
- **基于感觉的进度**——每次交接都有结构化的流程。每个决策都与证据相关联。“感觉完成了”不是一个有效状态。

## 它的工作原理

描述您的任务。角色操作系统会自动决定合适的协调级别。

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

1. **任务**——当任务与经过验证的重复性工作流程（bug 修复、治疗、功能发布、文档、安全、研究、头脑风暴、深度审核、内部测试）匹配时。已知的角色链、工件流程、升级分支和明确的部分定义。
2. **包**——当任务属于已知类别，但不是完整的任务形式时。10 个经过校准的团队包，具有自动选择和不匹配保护功能。
3. **自由路由**——当任务是新的、混合的或不确定的。对 61 个角色中的所有角色根据任务内容进行评分，并组建一个动态链。

该系统绝不会强行将工作通过错误的抽象层执行。它会解释为什么选择每个级别，并提供替代方案。

**只需一条命令即可开始执行：**

```bash
roleos run "fix the crash in save handler"
# → Created run: run-1234
# → Entry: MISSION (bugfix)
# → Started step 0: Repo Researcher → diagnosis-report
# → Guidance: Required sections: entrypoints, module-map, build-test-commands

roleos next                    # Start the next step
roleos complete diagnosis.md   # Complete the active step with artifact
roleos explain                 # Show full run state and guidance
roleos resume                  # Continue an interrupted run
roleos report                  # Generate completion report
roleos friction                # Measure operator touches
```

**当出现问题时采取的措施：**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

运行结果会持久保存到磁盘（`.claude/runs/`），因此中断的会话可以干净地恢复。每个步骤都包含操作员指导：需要生成的内容、必需的部分和停止条件。

**在路由完成后：**

1. **每个角色都会产生一个交接结果**——结构化的输出，其中包含证据项目，以减少下一个角色的歧义。
2. **审核者根据合同进行审查**——基于结构化证据（而非印象），接受、拒绝或阻止。
3. **恢复路由自动进行**——被阻止或拒绝的工作会被路由到正确的解决者处，并附带原因、恢复类型和所需的工件。

## 考虑预算的调度

角色操作系统可以在每个调度步骤中咨询本地“令牌预算分析师”，并将建议的支出预测附加到清单中——可以选择启用（`ROLEOS_BUDGET_CONSULT`），为建议性功能（它绝不会阻止调度），并且在默认情况下会回退到确定性的基线。默认禁用；预测是本地的，并且可以免费运行。请参阅[手册](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/)。

## 工具调用监督

角色操作系统会在 `PreToolUse` 阶段验证并控制工具调用——以确定性的方式进行，并且不会在关键路径上使用模型：

- **一致性观察器**（建议性，允许失败）——一个确定性的模式 + 可计算的合同下限，检查提出的调用是否符合其编目的工具合同，并附加关于*已证明*不一致调用的建议性结果；它绝不会阻止。可选的 LLM 上限（`ROLEOS_CONFORMANCE_CONSULT`）处理真正具有语义残留的情况。
- **能力门控**（失败时关闭，可选 `ROLEOS_CAPABILITY_GATE`，默认关闭）——对*不可逆*操作进行确定性的最小权限控制（npm/PyPI 发布、`gh release`、`git push`、仓库编辑、Pages 部署）。除非主管在 `.claude/role-os/capabilities.json` 中授予了该操作的能力，否则会拒绝已门控的操作，因此错误的步骤——无论是诚实的错误还是注入的错误——都无法触发未经授权的不可逆操作。这是命名补偿规则的预防性补充。请参阅[手册](https://mcp-tool-shop-org.github.io/role-os/handbook/)。

## 组织推广状态

整个组织的推广状态（队列、决策、审核记录、每个仓库的锁定包）都存储在一个单独的私有仓库中：[`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout)。这个仓库是产品；那个仓库是运行状态。

## 内存和连续性

角色操作系统不拥有或复制内存层。在 Claude 项目的内存存在的地方，它就是规范的连续性系统——仓库事实、决策、未完成的任务和治疗历史都存储在那里。

角色操作系统与 Claude 项目的内存集成。它不会取代它。

## 完整的治疗和发布检查

完整的治疗是 Claude 项目内存中定义的规范的 7 个阶段协议（`memory/full-treatment.md`）。角色操作系统使用角色合同、交接和审核门控来路由和审查治疗过程——它不会重新定义该协议。

**发布检查**是在进行完整治疗之前运行的包含 31 个项目的质量闸。在开始任何治疗之前，必须通过 A-D 这四个硬性闸。规范参考：`memory/shipcheck.md`。

顺序：首先进行发布检查，然后进行完整的治疗。如果没有通过硬性闸，则不能发布 v1.0.0 版本。

## 10 个包中的 61 个角色

| 包 | 角色 |
|------|-------|
| **Core** (3) | 协调员、产品战略家、审核者 |
| **Engineering** (7) | 前端开发人员、后端工程师、测试工程师、重构工程师、性能工程师、依赖关系审计员、安全审查员 |
| **Design** (2) | UI 设计师，品牌守护者 |
| **Marketing** (1) | 发布文案撰写员 |
| **Treatment** (7) | 仓库研究员、仓库翻译员、文档架构师、元数据管理员、覆盖审计员、部署验证员、发布工程师 |
| **Product** (3) | 反馈综合分析员、路线图优先级排序者、规范编写者 |
| **Research** (4) | 用户体验研究员、竞争对手分析师、趋势研究员、用户访谈结果综合分析员 |
| **Growth** (4) | 发布策略制定者、内容策略制定者、社区经理、支持问题分流负责人 |
| **Deep Audit** (4) | 组件审计员、测试真实性审计员、接口审计员、审计综合分析员 |
| **Swarm** (7) | 蜂群协调员、蜂群后端代理、蜂群桥接代理、蜂群测试代理、蜂群基础设施代理、蜂群前端代理、蜂群综合分析员 |

每个角色都有完整的合同：任务、适用时机、不适用时机、预期输入、所需输出、质量标准和升级触发条件。每个角色都可以通过 `roleos route` 命令进行路由，系统可以根据数据包内容推荐任何一个角色。

## 快速入门

```bash
npx role-os init

# Describe what you need — Role OS picks the right level:
roleos run "fix the crash in save handler"
# → Creates run, picks bugfix mission, starts first step with guidance

# Step through:
roleos next                    # Start next step
roleos complete artifact.md    # Complete with artifact
roleos explain                 # Show full state
roleos report                  # Completion report

# Deep audit:
roleos audit manifest --generate   # Create audit-manifest.json
roleos audit                       # Start component-level deep audit
roleos audit status                # Check audit progress
roleos audit verify                # Verify manifest and outputs

# Dogfood swarm:
roleos swarm manifest --generate   # Auto-detect domains from repo structure
roleos swarm                       # Start multi-pass convergence swarm
roleos swarm status                # Check swarm progress by stage
roleos swarm findings              # List findings by severity
roleos swarm approve               # Approve feature gate

# Or go manual:
roleos start "fix the crash"   # Entry decision only (no run)
roleos packet new feature
roleos route .claude/packets/my-feature.md
roleos review .claude/packets/my-feature.md accept

# Explore missions and packs:
roleos mission list
roleos packs list
```

## 何时不使用 Role OS

- 单行修复、拼写错误或明显的 bug
- 探索性研究，没有明确的输出
- 可以一个人在 5 分钟内完成的工作
- 需要在审查流程完成后立即发布的紧急补丁
- 您希望速度优先于结构的项目

## 证据

Role OS 已在两个具有不同结构的仓库中的三个试验中得到验证：

**试验 001 — 功能开发**（Crew Screen、Star Freight）
- 7 个角色的链条，45 个测试场景，0 个角色冲突
- 防止来自分支祖先的污染，发现内联发明，揭示了实际的障碍

**试验 002 — 集成工作**（CampaignState 连接、Star Freight）
- 5 个角色的链条，解决了架构接口问题，而无需使用虚假信息
- 反向回退测试证明了实时路径是真实的，而不是占位符

**试验 003 — 身份工作**（污染清除、Star Freight）
- 6 个角色的链条，51 个测试场景，包括持久的 CI 污染防御
- 修复了继承的虚假信息漂移，而不会导致广泛的重新设计

**可移植性试验**（角色一致性、sensor-humor）
- 相同的骨干结构，不同的语言/领域/堆栈
- 只需进行上下文更改即可采用，无需修改核心合同

**完整处理 FT-001**（portlight-desktop）
- 使用 Treatment Pack 角色的 7 个阶段的 staffed 处理流程
- 已证明 Shipcheck 门控有效，没有角色冲突

**完整处理 FT-002**（studioflow）
- 使用相同的 Treatment Pack，但仓库结构不同（创意工作区与游戏）
- Treatment Pack 可移植——无需修改合同

**头脑风暴黄金流程**（MCP 服务器市场主题）
- 9 个角色的链条，4 名分析师并行工作，交叉检查 + 反驳争议图
- 提出了 4 个挑战，缩小了 3 个主张范围，1 个未解决——健康的压力，而不是僵局
- 16+ 条追溯链接，从渲染的工件追溯到真相层原子
- 已证明完整的责任链：真相 → 原子 → 争议 → 合成 → 扩展 → 判断 → 渲染 → 追溯

## 核心属性

这些是不可谈判的。如果任何更改削弱了它们，请拒绝该更改。

- 角色边界保持不变
- 审查具有约束力
- 升级过程保持诚实
- 数据包可以进行测试
- 可移植性需要上下文调整，而不是核心手术

## 项目结构

```
role-os/
  bin/roleos.mjs               ← CLI entrypoint
  src/
    entry.mjs                  ← Unified entry: mission → pack → free routing
    entry-cmd.mjs              ← `roleos start` CLI command
    run.mjs                    ← Persistent run engine: create → step → pause → resume → report
    run-cmd.mjs                ← `roleos run/resume/next/explain/complete/fail` + interventions
    mission.mjs                ← 9 named mission types (feature, bugfix, treatment, docs, security, research, brainstorm, deep-audit, dogfood-swarm)
    mission-run.mjs            ← Mission runner: create → step → complete → report
    mission-cmd.mjs            ← `roleos mission` CLI commands
    audit-cmd.mjs              ← `roleos audit` — deep audit entry point with manifest generation
    swarm-cmd.mjs              ← `roleos swarm` — dogfood swarm entry point with domain detection
    swarm/                     ← Domain detection, build gate, evidence persistence bridge
    route.mjs                  ← 61-role routing + dynamic chain builder
    packs.mjs                  ← 10 calibrated team packs + auto-selection
    conflicts.mjs              ← 4-pass conflict detection
    escalation.mjs             ← Auto-routing for blocked/rejected/split
    evidence.mjs               ← Structured evidence + role-aware requirements
    dispatch.mjs               ← Runtime dispatch manifests for multi-claude
    tool-profiles.mjs          ← Per-role tool sandboxing (shared by dispatch + trial)
    state-machine.mjs          ← Canonical step/run transition maps
    artifacts.mjs              ← Per-role artifact contracts + pack handoffs
    decompose.mjs              ← Composite task detection + splitting
    composite.mjs              ← Dependency-ordered execution + recovery + cycle detection
    replan.mjs                 ← Mid-run adaptive replanning
    calibration.mjs            ← Outcome recording + weight tuning
    hooks.mjs                  ← 5 lifecycle hooks for runtime enforcement
    session.mjs                ← Session scaffolding + doctor
    brainstorm.mjs             ← Evidence modes, request validation, finding/synthesis/judge schemas
    brainstorm-roles.mjs       ← Role-native schemas, input partitioning, blindspot enforcement, cross-exam
    brainstorm-render.mjs      ← Two-layer rendering: lexical bans, render schemas, debate transcript
  test/                        ← 1150 tests across 37 test files
  starter-pack/                ← Drop-in role contracts, policies, schemas, workflows
```

## 安全性

Role OS **仅在本地运行**。它会复制 Markdown 模板并将数据包/结果文件写入到您的仓库的 `.claude/` 目录中。它不会访问网络、处理密钥或收集遥测数据。没有危险的操作——所有文件写入默认使用“如果存在则跳过”的方式。有关完整策略，请参阅 [SECURITY.md](SECURITY.md)。

## 操作系统

| 层级 | 它的作用是什么？ | 状态 |
|-------|-------------|--------|
| **Routing** | 根据数据包内容对所有 61 个角色进行评分，解释建议，评估置信度 | ✓ 已发布 |
| **Chain builder** | 从已评分的角色中组装出按阶段排序的链条，侧重于数据包类型，而不是模板锁定 | ✓ 已发布 |
| **Conflict detection** | 四次验证：硬冲突、序列、冗余、覆盖差距。修复建议。 | ✓ 已发布 |
| **Escalation** | 自动将被阻止/拒绝/拆分的工作路由到正确的解决者，并提供理由 + 所需的工件 | ✓ 已发布 |
| **Evidence** | 基于角色的结构化证据，包含在结果中。充分性检查。12 种证据类型。 | ✓ 已发布 |
| **Dispatch** | 生成用于 multi-claude 的执行清单。每个角色的工具配置文件、系统提示和预算。 | ✓ 已发布 |
| **Trials** | 完整的角色阵容已得到验证：30/30 个黄金任务 + 5/5 个负面测试。7 个包试验完成。 | ✓ 已完成 |
| **Team Packs** | 10 个经过校准的包，具有自动选择、不匹配保护和自由路由回退功能。 | ✓ 已发布 |
| **Outcome calibration** | 记录运行结果，根据结果调整包/角色权重，并调整置信度阈值。 | ✓ 已发布 |
| **Mixed-task decomposition** | 检测复合工作，将其拆分为子数据包，分配包，并保留依赖关系。 | ✓ 已发布 |
| **Composite execution** | 按照依赖顺序运行子数据包，进行工件传递、分支恢复和综合处理。 | ✓ 已发布 |
| **Adaptive replanning** | 在运行时对范围更改、发现或新需求进行更新，而无需重新启动计划。 | ✓ 已发布 |
| **Session spine** | `roleos init claude` 会生成 CLAUDE.md、/roleos-route、/roleos-review、/roleos-status 文件。`roleos doctor` 验证连接。路由卡证明参与度。 | ✓ 已发布 |
| **Hook spine** | 5 个生命周期钩子（SessionStart、PromptSubmit、PreToolUse、SubagentStart、Stop）。建议性强制执行：路由卡提醒、写入工具门控、子代理角色注入、完成审计。 | ✓ 已发布 |
| **Artifact spine** | 每个角色的工件合同。包交接合同。结构验证。链完整性检查。下游角色永远不会猜测他们收到的内容。 | ✓ 已发布 |
| **Mission library** | 9 个命名的任务（功能发布、错误修复、处理、文档发布、安全加固、研究启动、头脑风暴、深度审计、内部测试）。每个任务都声明了包、角色链、工件流程、升级分支以及诚实的部分定义。 | ✓ 已发布 |
| **Mission runner** | 创建运行，逐步执行并跟踪状态，完整/失败时进行诚实的报告。阻塞步骤的传播、链外升级警告、最后一步的重新打开。 | ✓ 已发布 |
| **Unified entry** | `roleos start` 会自动决定任务与包或自由路由之间的关系。带有置信度评分、替代方案和组合检测的回退层级。 | ✓ 已发布 |
| **Persistent runs** | `roleos run` 创建基于磁盘的运行。`resume`（恢复）、`next`（下一步）、`explain`（解释）、`complete`（完成）、`fail`（失败）。干预措施：重新路由、升级、重试、阻止、重新打开。步骤本地指导。摩擦力测量。 | ✓ 已发布 |
| **Brainstorm** | 双层架构：真相（角色原生模式、来源原子、交叉审查争议图）+ 渲染（5 个不同的声音、词汇禁令、辩论记录）。跟踪链接证明每个渲染的声明都映射到一个真相原子。黄金运行已验证。 | ✓ 已发布 |
| **Deep Audit** | 基于清单的代码仓库审计：将代码仓库分解为组件，分派 N 个审核员 + M 个测试真相审核员 + K 个接口审核员，从依赖关系图中进行合成，生成排序后的结论和行动计划。动态分派的规模与代码仓库的大小成比例（公式为 2N + K + 3）。在每个步骤中都进行工件验证，并且是针对运行器的原生支持。 | ✓ 已发布 |
| **Dogfood Swarm** | 多阶段收敛：三个健康阶段（错误/安全 → 主动 → 人性化），然后是功能发布。独占的文件所有权、每个阶段后的构建门控、用户检查点。领域自动检测生成清单。证据桥接至内部测试实验室。 | ✓ 已发布 |

## 9 个任务

| 任务 | 包 | 角色 | 何时使用 |
|---------|------|-------|-------------|
| `feature-ship` | 功能发布 | 5 | 完整的特性交付：范围 → 规范 → 实现 → 测试 → 审查 |
| `bugfix` | 错误修复 | 4 | 诊断根本原因、修复、测试、验证 |
| `treatment` | 处理 | 4 | 代码检查 + 润色 + 文档 + CI 验证 + 审查 |
| `docs-release` | 文档 | 2 | 编写/更新文档，发布说明 |
| `security-hardening` | 安全 | 4 | 威胁建模、审计、修复漏洞、重新审计、验证 |
| `research-launch` | 研究 | 4 | 提出问题、进行研究、记录发现、决定 |
| `brainstorm` | 头脑风暴 | 9 | 结构化的多视角探究，具有可追溯的意见分歧和结论。 |
| `deep-audit` | 深度审计 | 5（等级） | 基于清单的代码仓库审计——工作者数量通过动态分派与代码仓库图成比例。 |
| `dogfood-swarm` | 内部测试 | 8（等级） | 多阶段收敛：健康 A → 健康 B → 健康 C → 功能 → 最终合成 |

每个任务都包含诚实的部分定义——当工作停滞时，系统会记录已完成的内容和剩余内容，而不是虚报完成情况。

### 头脑风暴任务

不是“AI 头脑风暴”。头脑风暴任务是**在法律框架下的专业角色，具有可追溯的意见分歧和产生结论的输出。**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**它与众不同之处：**

- **第一层（真相）：** 四位分析师发出角色原生模式（上下文图、用户价值图、机制图、定位图），而不是共享的散文。每个角色都强制执行盲点：禁止使用的短语、禁止的主张类型、过滤后的输入分区。原子携带来源信息。一个有向的交叉审查图生成针对性的挑战。原始分析师在压力下进行辩护、缩小范围或撤回。

- **第二层（渲染）：** 五个不同的声音（边界备忘录、现场笔记、系统草图、主张摘要、交叉审查记录），并带有词汇禁令，以防止声音融合。合成消耗真相，而不是渲染的散文。两层始终可用。

- **责任链：** 每个渲染的句子都可以追溯到真相层的原子。合成方向引用原子。交叉审查的目标是真实的声明 ID。争议图是产品，而不是散文。

**已验证：** v0.4 黄金运行——完整的责任链已验证。请参阅 [`examples/golden-run.md`](examples/golden-run.md) 以获取完整的工件链。

### 深度审计任务

不是表面扫描。深度审计任务**将代码仓库分解为有界组件，并根据代码仓库自身的依赖关系图分派专家审核员。**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**它与众不同之处：**

- **动态分派：** 工作者数量不是固定的。一个包含 10 个组件和 5 个边界集群的代码仓库会产生 28 个步骤（2×10 + 5 + 3）。一个包含 3 个组件的代码仓库会产生 12 个步骤。缩放公式为 `2N + K + 3`，其中 N = 组件数，K = 边界数。
- **基于清单的包：** 一个 `audit-manifest.json` 定义了组件（带有文件路径、行数、描述）和边界（从/到，带有接口描述）。每个审核员只收到自己的包。
- **四种角色原型：** 组件审核员（每个模块的代码真相）、测试真相审核员（证明的测试与存在的测试）、接口审核员（来自依赖关系图的集成边界）、审计合成器（所有包的排序结论 + 行动计划）。
- **在每个步骤中进行工件验证：** `validateArtifact()` 在两个执行路径中的每个步骤完成后都会触发。结果附加到步骤对象。系统知道每个工件是否满足其合同。
- **诚实的部分：** 当预算或范围阻止完成时，每个组件的发现都是单独有效的。系统会从已完成的内容中进行合成，而不是虚报完整的覆盖范围。

**已验证：** 针对运行器的原生证明运行——对真实的清单进行了 18 个测试，并验证了包括升级重新打开和部分失败在内的完整生命周期。缩放公式已针对 3/6/10/15 组件的清单进行验证。

### 内部测试任务

这不是一个单次检查的静态代码分析工具。该“蜂群”任务**运行一个多阶段收敛协议，通过三个健康阶段和迭代的功能交付，将仓库从“可工作”状态提升到“生产就绪”状态。**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**它与众不同之处：**

- **三阶段健康检查**——第一阶段修复错误和安全问题（循环直到 0 个 CRITICAL + 0 个 HIGH）。第二阶段应用主动加固措施（用户审查结果）。第三阶段使代码库更人性化——提供帮助用户的错误消息、重新连接反馈、加载状态、可访问性。每个阶段都是一个不同的视角，而不是重复相同的扫描。
- **独占文件所有权**——每个领域代理通过 `swarm-manifest.json` 拥有特定的文件。没有两个代理编辑相同的文件。不会发生合并冲突。无需协调开销。
- **构建门禁**——每次迭代后，必须通过代码风格检查 + 类型检查 + 测试。系统自动检测构建系统（Node、Rust、Python、Go），并运行相应的命令。
- **用户检查点**——健康检查 B 阶段和功能交付需要明确的用户批准才能执行。系统会呈现结果，用户决定要构建的内容。
- **迭代收敛**——各阶段与迭代循环交替进行，直到满足退出条件或达到最大迭代次数。每个迭代都会从头开始重新审核，以捕获先前修复引入的回归问题。
- **领域自动检测**——`roleos swarm manifest --generate` 检测仓库类型（CLI、Web、桌面应用、MCP、单体仓库），并生成不重叠的领域分配。

**已验证：** claude-collaborate (2026-03-28) — 35→129 个测试，修复了 106 个健康问题，发布了 v1.1.0 版本。协议 v2.0 包含 9 个阶段。

## 状态

稳定且已发布。请参阅 [CHANGELOG](CHANGELOG.md) 以获取完整的版本历史记录以及每个版本中发生的变化。

## 许可证

MIT

---

由 <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a> 构建
