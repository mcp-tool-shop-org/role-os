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

一个多 Claude 操作系统，它通过 50 个专业角色合同来配置、分配、验证并执行工作。该系统可以创建任务包，根据角色匹配评分组建合适的团队，在执行前检测潜在问题，并在工作被阻塞或拒绝时自动进行恢复，并且要求在每个决策中提供结构化的证据。

## 其作用

Role OS 是一种专业的方式来使用多实例的 Claude 模型。它能够避免通用人工智能工作流程中可能出现的特定问题。

- **偏差 (Drift)**：每个角色都专注于其职责范围。产品不会被重新设计。前端不会重新定义范围。后端不会自行决定产品方向。
- **虚报完成 (False completion)**：完成的标准是明确的。隐藏缺陷、跳过验证或解决不同问题的成果会被拒绝。
- **污染 (Contamination)**：分叉或继承的项目可能包含身份残留。Role OS 可以检测并拒绝跨项目的术语、视觉和思维模式上的偏差。
- **基于主观感受的进度 (Vibes-based progress)**：每个交接环节都是结构化的。每个结论都必须基于证据。 “感觉完成了” 并不是一个有效的状态。

## 工作原理

描述您的任务。系统会自动根据任务的角色，选择合适的自动化级别。

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

备用梯子：

1. **任务 (Mission)**：当任务符合已验证的、可重复的工作流程时（例如：bug修复、问题处理、功能发布、文档编写、安全相关、研究）。已知的工作流程链、artifact（成果物）流程、升级流程分支，以及明确但可能不全面的定义。
2. **打包 (Pack)**：当任务属于已知的任务类型，但不是完整的任务流程时。有7个经过校准的团队套餐，具有自动选择功能和防止不匹配的机制。
3. **自由路由 (Free routing)**：当任务是全新的、混合型的或不确定的任务时。系统会根据任务内容，对所有31个角色进行评估，并动态构建工作流程。

该系统不会强行使用错误的抽象层级进行操作。它会解释为什么选择每个层级，并提供替代方案。

**一个命令即可启动执行：**

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

**当出现问题时的应对措施：**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

运行记录会保存到磁盘上的 `.claude/runs/` 目录下，因此即使会话中断，也可以顺利恢复。每个步骤都包含操作指导，说明需要生成的内容、必填部分以及停止条件。

**一旦已确定路线：**

1. **每个环节都会产生交接结果**——这是一种结构化的输出，包含佐证材料，旨在减少后续环节中的歧义。
2. **审核人员根据合同进行审查**——他们会根据结构化的证据来接受、拒绝或阻止，而不是基于主观印象。
3. **自动进行问题解决流程**——被阻止或拒绝的工作会自动分配给合适的处理人员，并附带原因、问题类型以及所需的资料。

## 组织部署状态

整个组织范围内的部署状态（包括队列、决策、审计记录以及每个仓库的锁定信息）存储在一个独立的私有仓库中：[`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout)。这个仓库是产品本身，而该仓库中的内容则代表了实际的运行状态。

## 内存与连续性

Role OS 不拥有或复制内存层。如果 Claude 项目中存在内存，它就是标准的连续性系统，代码仓库的事实、决策、未解决的问题和处理历史都存储在那里。

Role OS 与 Claude 项目的内存集成，而不是替代它。

## 完整的处理流程和发布检查

完整的处理流程是一个由 7 个阶段组成的规范流程，定义在 Claude 项目的内存中（`memory/full-treatment.md`）。Role OS 使用角色合约、交接和评审环节来处理流程，而不是重新定义该流程。

**发布检查 (Shipcheck)** 是在完整处理流程之前执行的 31 个项目质量检查。在开始任何处理之前，必须通过 A 到 D 这四个关键检查。参考文档：`memory/shipcheck.md`。

顺序：首先进行发布检查，然后进行完整的处理流程。在通过所有关键检查之前，不能发布 v1.0.0 版本。

## 共计50个角色，分布在8个不同的内容包中

| 包装；打包；一包；一盒；一套。 | 角色。 |
|------|-------|
| **Core** (3) | 协调员、产品战略师、评论员。 |
| **Engineering** (7) | 前端开发工程师、后端工程师、测试工程师、代码重构工程师、性能工程师、依赖项审计员、安全审查员。 |
| **Design** (2) | 用户界面设计师，品牌守护者。 |
| **Marketing** (1) | 产品发布文案撰写员。 |
| **Treatment** (7) | 代码仓库研究员、代码仓库翻译员、文档架构师、元数据管理员、内容审核员、部署验证员、发布工程师。 |
| **Product** (3) | 反馈整合工具、产品路线图优先级排序工具、需求文档编写人员。 |
| **Research** (4) | 用户体验研究员、竞争分析师、趋势研究员、用户访谈分析师。 |
| **Growth** (4) | *   **产品发布策略师** (Launch Strategist)
*   **内容策略师** (Content Strategist)
*   **社区运营经理** (Community Manager)
*   **客户支持问题分级负责人** (Support Triage Lead) |

每个角色都有完整的定义，包括：任务内容、使用时机、不使用时机、预期输入、所需输出、质量标准以及升级触发条件。每个角色都可以被路由，`roleos route` 命令可以根据数据包的内容推荐合适的角色。

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

# Or go manual:
roleos start "fix the crash"   # Entry decision only (no run)
roleos packet new feature
roleos route .claude/packets/my-feature.md
roleos review .claude/packets/my-feature.md accept

# Explore missions and packs:
roleos mission list
roleos packs list
```

## 何时不应使用 Role OS

- 简单的修复、拼写错误或明显的bug。
- 探索性研究，但没有明确的成果。
- 可以在一个人5分钟内完成的工作。
- 紧急的补丁，需要在代码审查流程完成之前发布。
- 那些更注重速度而非结构的项目。

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

**完整型 FT-001 方案** (适用于桌面环境)
- 采用 7 个阶段的人工干预流程，并配备相应的角色设置。
- 经过验证的“船舶检查”流程，确保无角色冲突。

**FT-002 完整方案** (studioflow)
- 相同的方案包，但结构上不同的代码仓库（创意工作区与游戏）。
- 方案包可移植，无需修改任何合同。

**头脑风暴黄金流程** (MCP 服务器市场主题)
- 9 个角色链，4 个分析师并行工作，进行交叉询问 + 驳斥争议图。
- 提出了 4 个挑战，缩小了 3 个主张，1 个未解决——保持健康的压力，避免僵局。
- 从渲染的成果物追溯到 16 多个“真相”原子。
- 完整地证明了溯源链：真相 → 原子 → 争议 → 综合 → 扩展 → 评估 → 渲染 → 追溯。

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
    run.mjs                    ← Persistent run engine: create → step → pause → resume → report
    run-cmd.mjs                ← `roleos run/resume/next/explain/complete/fail` + interventions
    mission.mjs                ← 7 named mission types (feature, bugfix, treatment, docs, security, research, brainstorm)
    mission-run.mjs            ← Mission runner: create → step → complete → report
    mission-cmd.mjs            ← `roleos mission` CLI commands
    route.mjs                  ← 31-role routing + dynamic chain builder
    packs.mjs                  ← 7 calibrated team packs + auto-selection
    conflicts.mjs              ← 4-pass conflict detection
    escalation.mjs             ← Auto-routing for blocked/rejected/split
    evidence.mjs               ← Structured evidence + role-aware requirements
    dispatch.mjs               ← Runtime dispatch manifests for multi-claude
    artifacts.mjs              ← 30 per-role artifact contracts + 7 pack handoffs
    decompose.mjs              ← Composite task detection + splitting
    composite.mjs              ← Dependency-ordered execution + recovery
    replan.mjs                 ← Mid-run adaptive replanning
    calibration.mjs            ← Outcome recording + weight tuning
    hooks.mjs                  ← 5 lifecycle hooks for runtime enforcement
    session.mjs                ← Session scaffolding + doctor
    brainstorm.mjs             ← Evidence modes, request validation, finding/synthesis/judge schemas
    brainstorm-roles.mjs       ← Role-native schemas, input partitioning, blindspot enforcement, cross-exam
    brainstorm-render.mjs      ← Two-layer rendering: lexical bans, render schemas, debate transcript
  test/                        ← 894 tests across 30 test files
  starter-pack/                ← Drop-in role contracts, policies, schemas, workflows
```

## 安全性

角色操作系统仅在本地运行。它复制 Markdown 模板，并将数据包/判决文件写入到您仓库的 `.claude/` 目录中。它不访问网络，不处理敏感信息，也不收集遥测数据。没有危险操作——所有文件写入默认使用“如果存在则跳过”的方式。请参阅 [SECURITY.md](SECURITY.md) 以获取完整策略。

## 操作系统

| 层 | 其作用 | 状态 |
|-------|-------------|--------|
| **Routing** | 根据数据包内容对所有 31 个角色进行评分，解释建议，评估置信度。 | ✓ 已发布 |
| **Chain builder** | 从评分的角色中组装出按阶段顺序排列的链，偏向于数据包类型，但不受模板限制。 | ✓ 已发布 |
| **Conflict detection** | 进行 4 次验证：检查冲突、顺序、冗余、覆盖范围。提供修复建议。 | ✓ 已发布 |
| **Escalation** | 自动将受阻/拒绝/拆分的工作路由到正确的处理程序，并提供原因和所需的成果物。 | ✓ 已发布 |
| **Evidence** | 在判决中提供结构化的、与角色相关的证据。进行充分性检查。有 12 种证据类型。 | ✓ 已发布 |
| **Dispatch** | 为多 Claude 生成执行清单。每个角色的工具配置文件、系统提示、预算。 | ✓ 已发布 |
| **Trials** | 完整地证明了：30/30 个黄金任务 + 5/5 个负面测试。7 个方案包测试已完成。 | ✓ 已完成 |
| **Team Packs** | 7 个经过校准的方案包，具有自动选择、不匹配保护和自由路由回退功能。 | ✓ 已发布 |
| **Outcome calibration** | 记录运行结果，根据结果调整方案包/角色的权重，调整置信度阈值。 | ✓ 已发布 |
| **Mixed-task decomposition** | 检测复合工作，将其拆分为子数据包，分配方案包，并保留依赖关系。 | ✓ 已发布 |
| **Composite execution** | 按照依赖顺序运行子数据包，传递成果物，进行分支恢复和综合。 | ✓ 已发布 |
| **Adaptive replanning** | 在运行过程中，对范围、发现或新需求进行更改，无需重新启动即可更新计划。 | ✓ 已发布 |
| **Session spine** | `roleos init claude` 创建 CLAUDE.md、/roleos-route、/roleos-review、/roleos-status。 `roleos doctor` 验证连接。 路由卡证明了参与。 | ✓ 已发布 |
| **Hook spine** | 5 个生命周期钩子（SessionStart、PromptSubmit、PreToolUse、SubagentStart、Stop）。 强制执行建议：路由卡提醒、工具使用限制、子代理角色注入、完成审计。 | ✓ 已发布 |
| **Artifact spine** | 30 个与角色相关的成果物合同。7 个方案包交付合同。进行结构验证。检查链的完整性。下游角色永远不知道他们收到了什么。 | ✓ 已发布 |
| **Mission library** | 7 个命名任务（功能发布、错误修复、方案、文档发布、安全加固、研究发布、头脑风暴）。 每个任务都声明方案包、角色链、成果物流程、升级分支、诚实且部分定义的描述。 所有 7 个任务都经过试验验证。 | ✓ 已发布 |
| **Mission runner** | 创建运行，逐步跟踪状态，完成/失败并提供诚实报告。 传播受阻步骤，发出链外升级警告，重新打开最后一步。 | ✓ 已发布 |
| **Unified entry** | `roleos start` 自动决定任务、方案包或自由路由。 具有置信度得分、备选方案和复合检测的后备层级。 | ✓ 已发布 |
| **Persistent runs** | `roleos run` 创建磁盘支持的运行。 `resume`（恢复）、`next`（下一步）、`explain`（解释）、`complete`（完成）、`fail`（失败）。 干预：重新路由、升级、重试、阻止、重新打开。 提供步骤级别的指导。 测量摩擦力。 | ✓ 已发布 |
| **Brainstorm** | 双层架构：真相（角色原生模式、溯源原子、交叉询问争议图）+ 渲染（5 种不同的声音、词汇限制、辩论记录）。 追溯链接证明每个渲染的声明都映射到一个“真相”原子。 黄金流程：894 个测试。 | ✓ 已发布 |

## 7 个任务

| 任务 | 包装；打包；一包；一盒；一套。 | 角色。 | 使用时机 |
|---------|------|-------|-------------|
| `feature-ship` | 特性 | 5 | 完整特性交付：范围 → 规范 → 实现 → 测试 → 审查 |
| `bugfix` | 错误修复 | 4 | 诊断根本原因，修复，测试，验证 |
| `treatment` | 方案 | 4 | 代码检查 + 优化 + 文档 + CI 验证 + 审查 |
| `docs-release` | 文档 | 2 | 编写/更新文档，发布说明 |
| `security-hardening` | 安全性 | 4 | 威胁模型分析，安全审计，修复漏洞，重新审计，验证 |
| `research-launch` | 研究 | 4 | 提出问题，进行研究，记录发现，做出决定 |
| `brainstorm` | 头脑风暴 | 9 | 结构化的、多角度的讨论，具有可追溯的异议和结论。 |

每个任务都包含诚实且全面的定义——当工作停滞时，系统会记录已完成的内容和未完成的内容，而不是虚报完成情况。

### 头脑风暴任务

这**不是**“人工智能头脑风暴”。 头脑风暴任务是**具有特定角色的、在法律框架下的活动，具有可追溯的异议和结论性输出。**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**它与众不同之处：**

- **第一层（真相）：** 四位分析师使用各自的角色专属的模式（情境地图、用户价值地图、机制地图、定位地图），而不是共享的文字。 每个角色都受到“盲点”的限制：禁止使用的词语，禁止提出的主张类型，以及过滤后的输入内容。 每个元素都带有来源信息。 一个有向的交叉询问图会产生针对性的挑战。 原始分析师在压力下会辩护、缩小范围或撤回观点。

- **第二层（呈现）：** 五种不同的声音（边界备忘录、现场笔记、系统草图、主张简报、交叉询问记录），通过词汇限制防止声音的融合。 综合分析会消耗“真相”，而不会生成原始的文字。 两层内容始终可用。

- **完整追溯：** 每一句话都可追溯到“真相”层的元素。 综合分析的说明会引用这些元素。 交叉询问的目标是真实的主张ID。 争议图是结果，而不是文字本身。

**已验证：** v0.4 版本，通过了 894 个测试，完整追溯链已验证。 详情请参见 [`examples/golden-run.md`](examples/golden-run.md)，其中包含完整的流程记录。

## 状态

- v0.1–v0.4: 基础版本 — 试验、采用、治疗方案包、入门包。
- v1.0.0: 32个角色，完整的命令行界面，经过验证的治疗方案，多仓库兼容性。
- v1.0.2: 角色操作系统锁定（修复引导启动问题，使用`--force`参数）。
- v1.1.0: 31个角色，完整的路由核心，冲突检测，升级，证据，调度，7个经过验证的团队包。35次执行试验。212个测试。
- v1.2.0: 校准后的包被设置为默认选项。自动选择，不匹配检测，替代方案建议，自由路由回退。246个测试。
- v1.3.0: 结果校准，混合任务分解，组合执行，自适应重新规划。317个测试。
- v1.4.0: 会话核心 — `roleos init claude`，`roleos doctor`，路由卡片，`/roleos-route` + `/roleos-review` + `/roleos-status` 命令。335个测试。
- v1.5.0: 钩子核心 — 5个生命周期钩子，用于运行时强制执行。358个测试。
- v1.6.0: 构件核心 — 20个角色相关的构件合约，7个包交付合约，结构验证。385个测试。
- v1.7.0: 完成证明 — 真实任务通过整个堆栈运行。`roleos artifacts` 命令行界面。对结构性问题的诚实反馈。398个测试。
- v1.8.0: 任务库（阶段S） — 6个命名任务，运行引擎，完成报告。经过6次真实试验的强化。481个测试。
- v1.9.0: 统一入口路径（阶段T） — `roleos start` 自动决定是任务、包还是自由路由。回退机制，组合检测，入口路径比较试验。527个测试。
- **v2.0.0**: 优化用户体验（阶段U） — `roleos run` 创建持久的基于磁盘的运行。恢复，下一步，解释，完成，失败。干预措施：重新路由，升级，重试，阻止，重新打开。在每个步骤都提供本地指导。摩擦力测量。6次摩擦力试验。613个测试。
- **v2.0.1**: 手册审核，初学者文档，测试数量修正。617个测试。
- **v2.1.0**: 构思任务（v0.4） — 法律下的专业角色，可追溯的意见不一致，带有判决结果的输出。两层架构（真值 + 渲染），交叉询问权限矩阵，争议图，黄金运行证明。7个任务，50个角色，8个包。894个测试。

## 许可证

MIT

---

由 <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a> 构建。
