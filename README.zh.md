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

一种多 Claude 操作系统，它对员工进行管理、分配任务、验证并执行工作，通过 61 个专门的角色合同进行。它创建任务包，从经过评分的角色匹配中组建合适的团队，在执行之前检测中断的任务链，当工作被阻止或拒绝时自动进行恢复，并且要求在每个结论中提供结构化的证据。它包括用于处理大规模任务的动态调度——一个包含 10 个组件的仓库自动变为 28 个审计步骤，而不是 6 个。

## 它的作用

角色操作系统是使用多 Claude 的专业方法。它可以防止通用 AI 工作流程产生的一些特定问题：

- **漂移**——角色保持在各自的领域内。产品不会重新设计。前端不会重新定义范围。后端不会决定产品方向。
- **虚假完成**——“完成”的定义是具体的。隐藏漏洞、跳过验证或解决不同问题的任务将被拒绝。
- **污染**——分支或继承的项目会带有身份残留。角色操作系统检测并拒绝项目中术语、视觉效果和思维模式的跨项目漂移。
- **基于感觉的进度**——每次交接都是结构化的。每个结论都与证据相关联。“感觉完成了”不是一个有效状态。

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

1. **任务**——当任务与经过验证的重复工作流程（错误修复、处理、功能发布、文档、安全、研究、头脑风暴、深度审计、内部测试）匹配时。已知的角色链、工件流程、升级分支和明确的部分定义。
2. **包**——当任务属于已知类别但不是完整的任务时。10 个经过校准的团队包，具有自动选择和不匹配保护功能。
3. **自由路由**——当任务是新的、混合的或不确定的。对所有 61 个角色根据任务包的内容进行评分，并组建一个动态链。

该系统绝不会强行将工作通过错误的抽象层进行。它会解释为什么选择每个级别，并提供替代方案。

**一个命令即可激活执行：**

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

**当出现问题时进行干预：**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

运行结果会持久保存到磁盘（`.claude/runs/`），因此中断的会话可以干净地恢复。每个步骤都包含操作员指导：要生成的内容、必需的部分和停止条件。

**路由完成后：**

1. **每个角色都会生成一个交接**——结构化的输出，其中包含证据项目，以减少对下一个角色的歧义。
2. **审核者根据合同进行审核**——基于结构化的证据（而不是印象）进行接受、拒绝或阻止。
3. **恢复路由自动进行**——被阻止或拒绝的工作会被路由到正确的解决者，并附带原因、恢复类型和必需的工件。

## 考虑预算的调度

角色操作系统可以在每个调度步骤中咨询本地**令牌预算分析师**，并将建议的支出预测附加到清单中——可以选择启用（`ROLEOS_BUDGET_CONSULT`），为建议性（它绝不会阻止调度），并回退到确定性的基线。默认情况下禁用；预测是本地的并且可以免费运行。请参阅[手册](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/)。

## 组织推广状态

组织范围的推广状态（队列、决策、审计记录、每个仓库的锁定包）存储在单独的私有仓库中：[`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout)。这个仓库是产品；那个仓库是运行状态。

## 内存和连续性

角色操作系统不拥有或复制内存层。在 Claude 项目内存存在的地方，它就是规范的连续性系统——仓库事实、决策、未完成的任务和处理历史记录都存储在那里。

角色操作系统与 Claude 项目内存集成。它不会取代它。

## 完整的处理和发布检查

完整的处理是 Claude 项目内存中定义的规范的 7 阶段协议（`memory/full-treatment.md`）。角色操作系统使用角色合同、交接和审核门来路由和审核处理——它不会重新定义协议。

**发布检查**是在完整处理之前运行的 31 项质量门。在开始任何处理之前，必须通过 A-D 强制门。规范参考：`memory/shipcheck.md`。

顺序：首先进行发布检查，然后进行完整处理。如果没有通过强制门，则不能发布 v1.0.0。

## 10 个包中的 61 个角色

| 包 | 角色 |
|------|-------|
| **Core** (3) | 协调者、产品策略师、审核者 |
| **Engineering** (7) | 前端开发人员、后端工程师、测试工程师、重构工程师、性能工程师、依赖性审核员、安全审核员 |
| **Design** (2) | UI 设计师、品牌守护者 |
| **Marketing** (1) | 发布文案撰写者 |
| **Treatment** (7) | 仓库研究员、仓库翻译员、文档架构师、元数据管理员、覆盖率审核员、部署验证员、发布工程师 |
| **Product** (3) | 反馈综合者、路线图优先级排序者、规范撰写者 |
| **Research** (4) | 用户体验研究员、竞争分析师、趋势研究员、用户访谈综合者 |
| **Growth** (4) | 发布策略师、内容策略师、社区经理、支持优先级排序负责人 |
| **Deep Audit** (4) | 组件审核员、测试真值审核员、接缝审核员、审核综合者 |
| **Swarm** (7) | 蜂群协调员、蜂群后端代理、蜂群桥接代理、蜂群测试代理、蜂群基础设施代理、蜂群前端代理、蜂群综合者 |

每个角色都有完整的合同：任务、何时使用、何时不使用、预期输入、必需输出、质量标准和升级触发器。每个角色都可以进行路由——`roleos route` 可以根据任务包的内容推荐任何角色。

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

## 何时不使用角色操作系统

- 单行修复、错别字或明显的错误
- 没有明确输出的探索性研究
- 可以在 5 分钟内在一个人的脑海中完成的工作
- 需要在审查流程完成之前发布的紧急补丁
- 你希望速度比结构更重要的项目

## 证据

Role OS 已在两个结构不同的仓库中的三个测试环境中得到验证：

**测试 001 — 功能开发**（人员筛选、星际货运）
- 7 个角色链，45 个测试场景，0 个角色冲突
- 防止来自分支祖先的污染，捕获内联发明，发现真实的障碍

**测试 002 — 集成工作**（CampaignState 连接，星际货运）
- 5 个角色链，解决了架构缝隙，没有使用备用方案
- 反备用方案测试证明了实时路径是真实的，而不是占位符

**测试 003 — 身份工作**（污染清除，星际货运）
- 6 个角色链，51 个测试场景，包括持久的 CI 污染防御
- 修复了继承的虚构漂移，而没有导致广泛的重新设计

**可移植性测试**（角色一致性，传感器幽默）
- 相同的核心，不同的语言/领域/堆栈
- 仅采用上下文更改——没有核心合同修改

**完整处理 FT-001**（portlight-desktop）
- 7 个阶段的 staffed 处理，使用处理包角色
- 已验证 Shipcheck 门控，零角色冲突

**完整处理 FT-002**（studioflow）
- 相同的处理包，结构不同的仓库（创意工作区与游戏）
- 处理包可移植——无需合同修改

**头脑风暴黄金测试**（MCP 服务器市场主题）
- 9 个角色链，4 个分析师并行工作，交叉审查 + 反驳争议图
- 提出了 4 个挑战，缩小了 3 个主张，1 个未解决——健康的压力，而不是僵局
- 16+ 个跟踪链接，从渲染的工件追溯到真相层原子
- 已验证完整的责任链：真相 → 原子 → 争议 → 综合 → 扩展 → 评估 → 渲染 → 跟踪

## 核心属性

这些是不可谈判的。如果更改削弱了任何一个，请拒绝它。

- 角色边界保持
- 审查具有约束力
- 升级过程保持诚实
- 数据包保持可测试
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

Role OS 仅在**本地**运行。它复制 Markdown 模板并将数据包/判决文件写入到你的仓库的 `.claude/` 目录。它不访问网络、处理密钥或收集遥测数据。没有危险的操作——所有文件写入默认使用“如果存在则跳过”。有关完整策略，请参阅 [SECURITY.md](SECURITY.md)。

## 操作系统

| 层 | 它的作用 | 状态 |
|-------|-------------|--------|
| **Routing** | 根据数据包内容对所有 61 个角色进行评分，解释建议，评估置信度 | ✓ 已发布 |
| **Chain builder** | 从评分后的角色中组装出按阶段排序的链，偏向于数据包类型，而不是模板锁定 | ✓ 已发布 |
| **Conflict detection** | 四次验证：硬冲突、序列、冗余、覆盖差距。修复建议。 | ✓ 已发布 |
| **Escalation** | 自动将阻塞/拒绝/拆分的工作路由到正确的解决者，并提供理由 + 所需的工件 | ✓ 已发布 |
| **Evidence** | 具有角色意识的结构化证据，包含在判决中。充分性检查。12 种证据类型。 | ✓ 已发布 |
| **Dispatch** | 为 multi-claude 生成执行清单。每个角色的工具配置文件、系统提示、预算。 | ✓ 已发布 |
| **Trials** | 完整的测试已完成：30/30 个黄金任务 + 5/5 个负面测试。7 个包测试已完成。 | ✓ 已完成 |
| **Team Packs** | 10 个经过校准的包，具有自动选择、不匹配保护和自由路由备用方案。 | ✓ 已发布 |
| **Outcome calibration** | 记录运行结果，根据结果调整包/角色权重，调整置信度阈值。 | ✓ 已发布 |
| **Mixed-task decomposition** | 检测复合工作，将其拆分为子数据包，分配包，并保留依赖关系。 | ✓ 已发布 |
| **Composite execution** | 以依赖顺序运行子数据包，并进行工件传递、分支恢复和综合。 | ✓ 已发布 |
| **Adaptive replanning** | 在运行过程中，范围更改、发现或新的需求会更新计划，而无需重新启动。 | ✓ 已发布 |
| **Session spine** | `roleos init claude` 创建 CLAUDE.md、/roleos-route、/roleos-review、/roleos-status。`roleos doctor` 验证连接。路由卡证明参与度。 | ✓ 已发布 |
| **Hook spine** | 5 个生命周期钩子（SessionStart、PromptSubmit、PreToolUse、SubagentStart、Stop）。建议性强制执行：路由卡提醒、写入工具门控、子代理角色注入、完成审计。 | ✓ 已发布 |
| **Artifact spine** | 每个角色的工件合同。包交接合同。结构验证。链完整性检查。下游角色永远不会猜测他们收到了什么。 | ✓ 已发布 |
| **Mission library** | 9 个命名任务（feature-ship、bugfix、treatment、docs-release、security-hardening、research-launch、brainstorm、deep-audit、dogfood-swarm）。每个任务都声明包、角色链、工件流程、升级分支、诚实的部分定义。 | ✓ 已发布 |
| **Mission runner** | 创建运行，逐步执行，并使用跟踪状态完成/失败，并进行诚实报告。阻塞步骤传播、链外升级警告、最后步骤重新打开。 | ✓ 已发布 |
| **Unified entry** | `roleos start` 自动决定任务与包或自由路由。具有置信度分数、替代方案和复合检测的备用方案。 | ✓ 已发布 |
| **Persistent runs** | `roleos run` 创建基于磁盘的运行。`resume`、`next`、`explain`、`complete`、`fail`。干预措施：重新路由、升级、重试、阻止、重新打开。步骤本地指导。摩擦测量。 | ✓ 已发布 |
| **Brainstorm** | 双层架构：真相（角色原生模式、来源原子、交叉审查争议图）+ 渲染（5 种不同的声音、词汇禁令、辩论记录）。跟踪链接证明每个渲染的声明都映射到真相原子。黄金测试已完成。 | ✓ 已发布 |
| **Deep Audit** | 清单驱动的代码仓库审计：将代码仓库分解为组件，从依赖关系图中调度 N 名审计员 + M 名测试真实性审计员 + K 名接口审计员，并将结果综合成排序后的结论和行动计划。动态调度会根据代码仓库的大小进行调整（公式为 2N + K + 3）。在每个步骤中，都会进行运行器原生验证。 | ✓ 已发布 |
| **Dogfood Swarm** | 多阶段收敛：三个健康阶段（漏洞/安全 → 积极改进 → 人性化），然后进行功能交付。独占的文件所有权，在每个阶段之后进行构建门控，用户检查点。领域自动检测会生成清单。证据桥接至内部测试实验室。 | ✓ 已发布 |

## 9 个任务

| 任务 | 包 | 角色 | 何时使用 |
|---------|------|-------|-------------|
| `feature-ship` | 功能 | 5 | 完整的功能交付：范围 → 规范 → 实现 → 测试 → 审查 |
| `bugfix` | 错误修复 | 4 | 诊断根本原因，修复，测试，验证 |
| `treatment` | 处理 | 4 | 代码检查 + 优化 + 文档 + CI 验证 + 审查 |
| `docs-release` | 文档 | 2 | 编写/更新文档，发布说明 |
| `security-hardening` | 安全 | 4 | 威胁建模，审计，修复漏洞，重新审计，验证 |
| `research-launch` | 研究 | 4 | 提出问题，进行研究，记录发现，做出决定 |
| `brainstorm` | 头脑风暴 | 9 | 结构化的多视角探究，具有可追溯的异议和结论 |
| `deep-audit` | 深度审计 | 5（等级） | 清单驱动的代码仓库审计——工作者数量根据代码仓库图通过动态调度进行调整 |
| `dogfood-swarm` | 集群 | 8（等级） | 多阶段收敛：健康 A → 健康 B → 健康 C → 功能 → 最终综合 |

每个任务都包含诚实且部分完成的定义——当工作停滞时，系统会记录已完成的内容和剩余内容，而不是虚报完成情况。

### 头脑风暴任务

不是“AI 头脑风暴”。头脑风暴任务是**在法律框架下的专业角色，具有可追溯的异议和产生结论的输出。**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**使其与众不同之处：**

- **第一层（真相）：** 四位分析师输出角色相关的模式（上下文图、用户价值图、机制图、定位图）——而不是共享的散文。每个角色都强制执行盲点：禁止的短语、禁止的主张类型、过滤的输入分区。原子携带来源信息。定向的交叉询问图会产生有针对性的挑战。原始分析师在压力下进行辩护、缩小范围或撤回。

- **第二层（呈现）：** 五种不同的声音（边界备忘录、现场笔记、系统草图、主张摘要、交叉询问记录），并具有词汇限制，以防止声音融合。综合会消耗真相，而不是呈现的散文。两层始终可用。

- **责任链：** 每个呈现的句子都可以追溯到真相层中的原子。综合方向引用原子。交叉询问的目标是真实的声明 ID。争议图是产品，而不是散文。

**已验证：** v0.4 黄金运行——已验证完整的责任链。有关完整工件链，请参见 [`examples/golden-run.md`](examples/golden-run.md)。

### 深度审计任务

不是表面扫描。深度审计任务**将代码仓库分解为有界组件，并根据代码仓库自身的依赖关系图调度专门的审计员。**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**使其与众不同之处：**

- **动态调度**——工作者数量不是固定的。一个包含 10 个组件和 5 个边界集群的代码仓库会产生 28 个步骤（2×10 + 5 + 3）。一个包含 3 个组件的代码仓库会产生 12 个步骤。缩放公式为 `2N + K + 3`，其中 N = 组件，K = 边界。
- **清单驱动的包**——`audit-manifest.json` 定义组件（包含文件路径、行数、描述）和边界（从/到，包含接口描述）。每个审计员仅接收其包。
- **四种角色原型**——组件审计员（每个模块的代码真相）、测试真实性审计员（证明测试与现有测试）、接口审计员（来自依赖关系图的集成边界）、审计综合器（来自所有包的排序结论 + 行动计划）。
- **在每个步骤中进行工件验证**——`validateArtifact()` 在两个执行路径中的每个步骤完成后都会触发。结果附加到步骤对象。系统知道每个工件是否满足其合同。
- **诚实且部分完成**——当预算或范围阻止完成时，每个组件的发现都是单独有效的。系统会根据已完成的内容进行综合，而不是虚报完全覆盖。

**已验证：** 运行器原生证明运行——针对真实清单进行了 18 个测试，并验证了完整的生命周期，包括升级重新打开和部分失败。已验证 3/6/10/15 组件清单的缩放公式。

### 内部测试集群任务

不是一次性代码检查器。内部测试集群任务**运行一个多阶段收敛协议，该协议通过三个健康阶段和迭代的功能交付，将代码仓库从“可用”状态转变为“生产就绪”状态。**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**使其与众不同之处：**

- **三阶段健康检查**——第一阶段修复漏洞和安全问题（循环执行，直到 0 个 CRITICAL 级别 + 0 个 HIGH 级别的问题）。第二阶段应用主动加固措施（用户审核结果）。第三阶段优化代码库——提供帮助用户的错误消息、重新连接反馈、加载状态和可访问性。每个阶段都是一个独立的视角，而不是重复的扫描。
- **独占文件所有权**——每个域代理通过 `swarm-manifest.json` 拥有特定的文件。没有两个代理编辑同一个文件。没有合并冲突。没有协调开销。
- **构建门禁**——每次迭代后，必须通过代码风格检查、类型检查和测试。系统自动检测构建系统（Node、Rust、Python、Go），并运行相应的命令。
- **用户检查点**——健康检查 B 阶段和功能测试阶段需要在执行前获得明确的用户批准。系统呈现结果，用户决定构建什么。
- **迭代收敛**——各阶段与迭代循环交替进行，直到满足退出条件或达到最大迭代次数。每个迭代都从头开始重新审核，以发现之前修复引入的回归问题。
- **域自动检测**——`roleos swarm manifest --generate` 检测仓库类型（CLI、Web、桌面应用、MCP、单仓库），并生成不重叠的域分配。

**已验证：** claude-collaborate（2026-03-28）——35 个测试增加到 129 个，修复了 106 个健康问题，发布了 v1.1.0 版本。协议 v2.0，包含 9 个阶段。

## 状态

稳定且已发布。请参阅 [CHANGELOG](CHANGELOG.md)，以获取完整的版本历史记录以及每个版本中发生的变化。

## 许可证

MIT

---

由 <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a> 构建
