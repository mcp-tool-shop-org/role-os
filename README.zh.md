<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

# Role OS

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/role-os/readme.png" alt="Role OS" width="400">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/role-os/actions"><img src="https://github.com/mcp-tool-shop-org/role-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/@mcptoolshop/role-os"><img src="https://img.shields.io/npm/v/@mcptoolshop/role-os" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
  <a href="https://mcp-tool-shop-org.github.io/role-os/"><img src="https://img.shields.io/badge/Landing_Page-live-brightgreen" alt="Landing Page"></a>
</p>

Role OS 是一种可移植、原生支持代码仓库的操作系统层，它通过角色合约、结构化数据包、评审和升级流程，确保团队在进行功能开发、集成、身份修复以及完整的代码仓库管理时，不会出现偏差、虚报完成情况或基于主观感受的进度报告。

## 其作用

Role OS 旨在避免通用人工智能工作流程中常见的特定问题：

- **偏差 (Drift)**：每个角色都专注于其职责范围。产品不会被重新设计。前端不会重新定义范围。后端不会自行决定产品方向。
- **虚报完成 (False completion)**：完成的标准是明确的。隐藏缺陷、跳过验证或解决不同问题的成果会被拒绝。
- **污染 (Contamination)**：分叉或继承的项目可能包含身份残留。Role OS 可以检测并拒绝跨项目的术语、视觉和思维模式上的偏差。
- **基于主观感受的进度 (Vibes-based progress)**：每个交接环节都是结构化的。每个结论都必须基于证据。 “感觉完成了” 并不是一个有效的状态。

## 工作原理

1. **创建数据包 (Create a packet)**：定义完成工作后需要存在的内容。
2. **通过链条进行处理 (Route through a chain)**：选择完成工作所需的最少且专业的角色集合。
3. **每个角色进行交接 (Each role produces a handoff)**：提供结构化的输出，以减少对下一个角色的歧义。
4. **评审员根据合约进行评审 (Critic reviews against contract)**：根据证据，而不是主观印象，接受、拒绝或阻止。

## 内存与连续性

Role OS 不拥有或复制内存层。如果 Claude 项目中存在内存，它就是标准的连续性系统，代码仓库的事实、决策、未解决的问题和处理历史都存储在那里。

Role OS 与 Claude 项目的内存集成，而不是替代它。

## 完整的处理流程和发布检查

完整的处理流程是一个由 7 个阶段组成的规范流程，定义在 Claude 项目的内存中（`memory/full-treatment.md`）。Role OS 使用角色合约、交接和评审环节来处理流程，而不是重新定义该流程。

**发布检查 (Shipcheck)** 是在完整处理流程之前执行的 31 个项目质量检查。在开始任何处理之前，必须通过 A 到 D 这四个关键检查。参考文档：`memory/shipcheck.md`。

顺序：首先进行发布检查，然后进行完整的处理流程。在通过所有关键检查之前，不能发布 v1.0.0 版本。

## 32个角色，分布在8个模块中

| 模块 | 角色 |
|------|-------|
| **Core** (3) | 协调员、产品策略师、评审专家 |
| **Engineering** (7) | 前端开发工程师、后端工程师、测试工程师、重构工程师、性能工程师、依赖性审计员、安全评审员 |
| **Design** (2) | UI设计师、品牌守护者 |
| **Marketing** (1) | 发布文案撰写员 |
| **Treatment** (7) | 代码仓库研究员、代码仓库翻译员、文档架构师、元数据管理员、覆盖范围审计员、部署验证员、发布工程师 |
| **Product** (4) | 反馈综合分析员、路线图优先级排序员、规格文档撰写员、信息架构师 |
| **Research** (4) | 用户体验研究员、竞争分析师、趋势研究员、用户访谈综合分析员 |
| **Growth** (4) | 发布策略师、内容策略师、社区管理员、支持问题处理负责人 |

每个角色都有完整的说明：任务、适用时机、不适用时机、预期输入、所需输出、质量标准以及升级流程。

## 快速入门

```bash
npx @mcptoolshop/role-os init

# Fill context/ files for your project, then:
roleos packet new feature
roleos route .claude/packets/my-feature.md
roleos review .claude/packets/my-feature.md accept
roleos status
```

## 何时不应使用角色操作系统

- 简单的修复、拼写错误或明显的错误
- 没有明确输出的探索性研究
- 可以在一个人5分钟内完成的工作
- 需要在评审流程完成之前立即发布的紧急修复
- 追求速度而非结构的工程项目

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

**完整方案 FT-001** (portlight-desktop)
- 包含7个阶段，配备人员，使用方案模块中的角色
- 已验证的发布检查机制，无角色冲突

**完整方案 FT-002** (studioflow)
- 使用相同的方案模块，但结构不同的代码仓库（创意工作区与游戏）
- 方案模块可移植，无需修改任何说明

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
  README.md                    ← You are here
  bin/roleos.mjs               ← CLI entrypoint
  src/                         ← CLI implementation
  starter-pack/
    handbook.md                ← How Role OS works
    context/                   ← Fill these for your repo
    examples/                  ← Feature, integration, identity packets
    agents/                    ← 32 role contracts across 8 packs
    schemas/                   ← Packet, handoff, verdict formats
    policy/                    ← Routing, permissions, escalation, done
    workflows/                 ← Ship feature, fix bug, launch update, full treatment
```

## 安全性

角色操作系统仅在本地运行。它复制 Markdown 模板，并将数据包/判决文件写入到您仓库的 `.claude/` 目录中。它不访问网络，不处理敏感信息，也不收集遥测数据。没有危险操作——所有文件写入默认使用“如果存在则跳过”的方式。请参阅 [SECURITY.md](SECURITY.md) 以获取完整策略。

## 状态

**v1.0.0 — 广泛应用，相同规则**

- v0.1: 试运行 — 3次试用，3次通过，无角色冲突
- v0.2: 采用 — 默认工作流程，可移植到第二个代码仓库
- v0.3: 产品化 — 基础模块，启动命令行工具，提供示例
- v0.4: 方案模块 — 8个方案/身份角色，配备完整人员，可移植到2个代码仓库
- v1.0.0: 32个角色，分布在8个模块中，完整命令行工具，经过验证的方案，支持多代码仓库移植

## 许可证

MIT

---

由 <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a> 构建。
