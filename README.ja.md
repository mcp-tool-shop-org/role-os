<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

マルチ・クロード環境を効率的に運用するためのシステムで、31種類の専門的な役割に分担し、タスクを割り当て、検証し、実行します。タスクをまとめた「タスクパケット」を作成し、役割のマッチングに基づいて最適なチームを編成し、実行前に問題点を検出し、タスクが中断または拒否された場合に自動的にリカバリー処理を実行し、すべての判断において構造化された証拠を必要とします。

## Role OSの機能

Role OSは、マルチ・クロード環境をプロフェッショナルに活用するための方法です。一般的なAIワークフローで発生する特定の問題を回避します。

- **ドリフト（逸脱）**: 各役割は、自身の担当範囲にとどまります。製品の再設計、フロントエンドのスコープ変更、バックエンドの製品方向性の変更を防ぎます。
- **誤った完了**: 完了の定義は明確です。不備を隠したり、検証を省略したり、別の問題を解決したりする作業は却下されます。
- **汚染**: 分岐または継承されたプロジェクトには、元のプロジェクトの要素が残存する可能性があります。Role OSは、用語、ビジュアル、および思考モデルにおけるプロジェクト間の逸脱を検出し、却下します。
- **主観的な進捗**: すべての手渡し作業は構造化されています。すべての判断は、証拠に基づいています。「完了したように感じる」という主観的な判断は認められません。

## Role OSの仕組み

タスクの内容を記述してください。Role OSが、最適な連携レベルを自動的に決定します。

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

**段階的な解決策:**

1. **ミッション:** 確立された繰り返し作業（バグ修正、改善、新機能追加、ドキュメント作成、セキュリティ対策、研究など）にタスクが該当する場合。役割の連鎖、成果物の流れ、エスカレーションの経路、および部分的な定義が明確になっています。
2. **パック:** タスクが既知のカテゴリに属するが、完全なミッションとは異なる場合。7つの調整済みのチームパックがあり、自動選択機能と、役割の不一致を検知する機能があります。
3. **自由ルーティング:** タスクが新規、複合的、または不明確な場合。31のすべての役割をタスクの内容に基づいて評価し、動的な連鎖を構築します。

このシステムは、常に適切な抽象レベルでタスクを実行させます。各レベルを選択した理由を説明し、代替案も提示します。

**ルーティング後:**

1. **各役割は成果物を生成:** 構造化された出力で、次の役割が理解しやすいように、証拠となる情報が含まれています。
2. **レビュー担当者が契約に基づいて評価:** 構造化された証拠に基づいて、受け入れ、拒否、または中断のいずれかの判断を行います。主観的な判断は排除されます。
3. **中断または拒否されたタスクは自動的にリカバリー:** 問題が発生したタスクは、理由、リカバリーの種類、および必要な成果物とともに、適切な担当者にルーティングされます。

## 組織全体の展開状況

組織全体の展開状況（キュー、意思決定、監査記録、リポジトリごとのロックパケット）は、別のプライベートリポジトリに保存されています：[`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout)。このリポジトリは製品であり、別のリポジトリは運用状況を管理します。

## メモリと継続性

Role OSは、メモリレイヤーを所有または複製しません。Claudeプロジェクトのメモリが存在する場合、それが標準的な継続性システムです。リポジトリの情報、決定事項、未解決の問題、および処理履歴は、そこに保存されます。

Role OSは、Claudeプロジェクトのメモリと連携します。置き換えるものではありません。

## 完全な処理と品質チェック

完全な処理は、Claudeプロジェクトのメモリ (`memory/full-treatment.md`) に定義された、7段階の標準的なプロセスです。Role OSは、役割契約、手渡し、およびレビューゲートを使用して、処理をルーティングおよびレビューします。このプロセスを再定義するものではありません。

**品質チェック**は、完全な処理の前に実行される、31項目の品質ゲートです。完全な処理を開始する前に、AからDまでの必須ゲートをすべて通過する必要があります。参照先: `memory/shipcheck.md`.

順序: 品質チェックを最初に実行し、次に完全な処理を行います。必須ゲートをすべて通過しない限り、バージョン1.0.0をリリースできません。

## 32の役割、8つのパッケージに分類

| パッケージ | 役割 |
|------|-------|
| **Core** (3) | オーケストレーター、プロダクトストラテジスト、レビュー担当者 |
| **Engineering** (7) | フロントエンド開発者、バックエンドエンジニア、テストエンジニア、リファクタリングエンジニア、パフォーマンスエンジニア、依存関係監査担当者、セキュリティレビュー担当者 |
| **Design** (2) | UIデザイナー、ブランド担当者 |
| **Marketing** (1) | ローンチコピーライター |
| **Treatment** (7) | リポジトリ研究者、リポジトリ翻訳者、ドキュメントアーキテクト、メタデータキュレーター、カバレッジ監査担当者、デプロイ検証担当者、リリースエンジニア |
| **Product** (3) | フィードバック合成ツール、ロードマップ優先順位付けツール、仕様書作成ツール |
| **Research** (4) | UXリサーチャー、競合分析担当者、トレンドリサーチャー、ユーザーインタビュー合成担当者 |
| **Growth** (4) | ローンチストラテジスト、コンテンツストラテジスト、コミュニティマネージャー、サポートトリアージリーダー |

各役割には、詳細な契約書があります。内容は、ミッション、使用するタイミング、使用しないタイミング、必要な入力、必要な出力、品質基準、およびエスカレーションのトリガーなどです。すべての役割はルーティング可能であり、`roleos route`コマンドを使用すると、タスクの内容に基づいて、最適な役割を推奨することができます。

## クイックスタート

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

## Role OSを使用しない場合

- 単一行の修正、タイプミス、または明白なバグ
- 明確な出力がない探索的な調査
- 5分で1人の担当者が完了できる作業
- レビュープロセスが完了する前にリリースする必要がある緊急の修正
- 速度を重視し、構造を後回しにしたいプロジェクト

## 検証

Role OSは、構造が異なる2つのリポジトリで、3つの異なるテストケースで検証されました。

**テストケース001 — 機能開発** (Crew Screen, Star Freight)
- 7つの役割チェーン、45のテストシナリオ、役割の衝突は0件。
- 分岐元のプロジェクトからの汚染を防ぎ、意図しない変更を検出し、問題点を明確にしました。

**テストケース002 — 統合** (CampaignState wiring, Star Freight)
- 5つの役割チェーン、フォールバックによる問題を解決しました。
- フォールバックテストにより、実際に動作するパスが存在することを確認しました。

**テストケース003 — ID管理** (Contamination purge, Star Freight)
- 6つの役割チェーン、耐久性のあるCIによる汚染防御を含む、51のテストシナリオ。
- 継承された不整合を修正し、大規模な再設計を回避しました。

**移植性テスト** (Personaの一貫性、センサーの挙動)
- 同じ基本構造を持ちながら、異なる言語、ドメイン、技術スタックを使用
- コンテキストの変更のみで導入可能。コアとなる契約の変更は行わない。

**フルトリートメント FT-001** (portlight-desktop)
- 7段階の担当者配置によるトリートメント。トリートメントパッケージの役割を使用。
- 品質チェックが確立されており、役割の競合はゼロ。

**フルトリートメント FT-002** (studioflow)
- 同じトリートメントパッケージを使用。構造は異なり、リポジトリの内容も異なる（クリエイティブワークスペース vs ゲーム）。
- トリートメントパッケージは移植可能。契約の変更は不要。

## 主要な特性

これらは変更できません。変更によってこれらのいずれかが弱体化する場合は、却下してください。

- ロールの境界が維持される
- レビューは厳格である
- エスカレーションは誠実に行われる
- テスト可能な状態が維持される
- 移植性は、コア部分の変更ではなく、コンテキストへの適応が必要

## プロジェクト構造

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

## セキュリティ

Role OSは、**ローカルでのみ**動作します。Markdownテンプレートをコピーし、パケット/判定ファイルを、あなたのリポジトリの`.claude/`ディレクトリに書き込みます。ネットワークへのアクセス、機密情報の取り扱い、テレメトリーの収集は行いません。危険な操作は一切行いません。すべてのファイル書き込みは、デフォルトでファイルが存在する場合はスキップします。詳細については、[SECURITY.md](SECURITY.md) を参照してください。

## このオペレーティングシステム

| レイヤー | Role OSの機能 | ステータス |
|-------|-------------|--------|
| **Routing** | タスクの内容に基づいて、31のすべての役割を評価し、推奨事項を説明し、信頼度を評価します。 | ✓ 完了 |
| **Chain builder** | 役割を段階的に組み合わせて連鎖を構築します。タスクの種類に最適化されており、テンプレートに依存しません。 | ✓ 完了 |
| **Conflict detection** | 4段階の検証：競合、順序、冗長性、網羅性の欠落。修正案の提案。 | ✓ 完了 |
| **Escalation** | 中断、拒否、または分割されたタスクを、理由と必要な成果物とともに、適切な担当者に自動的にルーティングします。 | ✓ 完了 |
| **Evidence** | 判断において、役割を意識した構造化された証拠を使用します。十分性のチェックを行います。12種類の証拠があります。 | ✓ 完了 |
| **Dispatch** | マルチ・クロード環境での実行に必要な情報を生成します。各役割で使用するツール、システムプロンプト、予算などを定義します。 | ✓ 完了 |
| **Trials** | すべての役割について、テストが完了しています。30種類のタスクと、5種類のネガティブテストが成功しました。7つのチームパックのテストも完了しています。 | ✓ 完了 |
| **Team Packs** | 自動選択機能、役割の不一致を検知する機能、および自由ルーティングによるフォールバックを備えた、7つの調整済みのチームパック。 | ✓ 完了 |
| **Outcome calibration** | 実行結果を記録し、結果に基づいてチームパックまたは役割の重みを調整し、信頼度の閾値を調整します。 | ✓ 完了 |
| **Mixed-task decomposition** | 複合タスクを検出し、子タスクに分割し、チームパックを割り当て、依存関係を維持します。 | ✓ 完了 |
| **Composite execution** | 依存関係の順序で子タスクを実行し、成果物を引き継ぎ、リカバリー処理を行い、統合します。 | ✓ 完了 |
| **Adaptive replanning** | 実行中にスコープの変更、発見事項、または新しい要件が発生した場合でも、計画を再起動せずに更新できます。 | ✓ 完了 |
| **Session spine** | `roleos init claude`コマンドを使用すると、CLAUDE.md、/roleos-route、/roleos-review、/roleos-statusファイルが作成されます。`roleos doctor`コマンドを使用すると、設定が正しく行われているかを確認できます。ルーティングカードは、タスクへの関与を証明します。 | ✓ 完了 |
| **Hook spine** | 5つのライフサイクルフック（SessionStart、PromptSubmit、PreToolUse、SubagentStart、Stop）。コンプライアンスの強制：ルートカードのリマインダー、ツールの利用制限、サブエージェントの役割の注入、完了状況の監査。 | ✓ 完了 |
| **Artifact spine** | ロールごとに20件の成果物契約。7件のパッケージ引き継ぎ契約。構造検証。チェーンの完全性チェック。下位のロールは、受け取った内容を推測することはありません。 | ✓ 完了 |
| **Mission library** | 6つの名前付きミッション（新機能追加、バグ修正、改善、ドキュメントのリリース、セキュリティ強化、研究開発）。それぞれが、パッケージ、ロールチェーン、成果物の流れ、エスカレーションのブランチ、正直で部分的な定義を宣言します。6つすべてが試行錯誤され、強化されています。 | ✓ 完了 |
| **Mission runner** | 実行を開始し、追跡された状態とともにステップを進め、正直なレポートで完了または失敗。ブロックされたステップの伝播、チェーンからの逸脱に関する警告、最後のステップの再開。 | ✓ 完了 |
| **Unified entry** | `roleos start`は、ミッション、パッケージ、または自由ルーティングを自動的に決定します。信頼度スコア、代替案、および複合検出を備えたフォールバックシステム。 | ✓ 完了 |

## 6つのミッション

| ミッション | パッケージ | 役割 | 使用するタイミング |
|---------|------|-------|-------------|
| `feature-ship` | 新機能 | 5 | 完全な新機能の提供：範囲 → 仕様 → 実装 → テスト → レビュー |
| `bugfix` | バグ修正 | 4 | 根本原因の特定、修正、テスト、検証 |
| `treatment` | 改善 | 4 | 品質チェック + 調整 + ドキュメント + CIによる検証 + レビュー |
| `docs-release` | ドキュメント | 2 | ドキュメントの作成/更新、リリースノート |
| `security-hardening` | セキュリティ | 4 | 脅威モデルの作成、監査、脆弱性の修正、再監査、検証 |
| `research-launch` | 研究 | 4 | 問題の定義、調査、結果の文書化、決定 |

各ミッションには、正直で部分的な定義が含まれています。作業が停滞した場合、システムは完了した内容と残りの内容を記録し、進捗を偽装することはありません。

## ステータス

- v0.1–v0.4: 基礎 - 試行、導入、改善パッケージ、スターターパッケージ
- v1.0.0: 32のロール、完全なCLI、実績のある改善、マルチリポジトリの移植性
- v1.0.2: ロールOSのロックダウン（ブートストラップの真実性の修正、init --force）
- v1.1.0: 31のロール、完全なルーティング機能、競合検出、エスカレーション、証拠、ディスパッチ、7つの実績のあるチームパッケージ。35回の実行テスト。212件のテスト。
- v1.2.0: デフォルトとして推奨されるパッケージ。自動選択、不整合の検出、代替案の提案、自由ルーティングのフォールバック。246件のテスト。
- v1.3.0: 結果の調整、タスクの細分化、複合実行、適応的な再計画。317件のテスト。
- v1.4.0: セッションの基盤 - `roleos init claude`、`roleos doctor`、ルートカード、/roleos-route + /roleos-review + /roleos-status コマンド。335件のテスト。
- v1.5.0: フックの基盤 - 実行時の強制のための5つのライフサイクルフック。358件のテスト。
- v1.6.0: 成果物の基盤 - ロールごとの20件の成果物契約、7件のパッケージ引き継ぎ契約、構造検証。385件のテスト。
- v1.7.0: 完了の証明 - 実際のタスクをフルスタックで実行。`roleos artifacts` CLI。構造的な修正に関する正直なエスカレーション。398件のテスト。
- v1.8.0: ミッションライブラリ（Phase S）- 6つの名前付きミッション、ランナーエンジン、完了レポート。6回の実際の試行錯誤で強化されています。481件のテスト。
- **v1.9.0**: 統合されたエントリパス（Phase T）- `roleos start`は、ミッション、パッケージ、または自由ルーティングを自動的に決定します。フォールバックシステム、複合検出、エントリパスの比較テスト。527件のテスト。

## ライセンス

MIT

---

作成者: <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
