<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

複数のClaudeを連携させるオペレーティングシステムで、61種類の専門的な役割を持つコントラクトを通じて、タスクの割り当て、ルーティング、検証、実行を行います。タスクパケットを作成し、スコアリングされた役割のマッチングに基づいて適切なチームを編成し、実行前に問題のある箇所を検出し、タスクが中断または拒否された場合に自動的にリカバリーを行い、すべての判断において構造化された証拠を要求します。動的なディスパッチにより、大規模なミッションに対応します。たとえば、10個のコンポーネントからなるリポジトリは、自動的に28段階の監査プロセスに展開されます。

## 機能の説明

Role OSは、複数のClaudeを効果的に活用するためのプロフェッショナルな方法です。一般的なAIワークフローで発生する特定の失敗を防ぎます。

- **ドリフト（役割の逸脱）**：各役割は、定められた範囲内で活動します。プロダクトは再設計されません。フロントエンドはスコープを再定義しません。バックエンドはプロダクトの方向性を決定しません。
- **誤った完了**：完了の定義は明確です。ギャップを隠したり、検証を省略したり、別の問題を解決したりする作業は拒否されます。
- **汚染**：フォークまたは継承されたプロジェクトは、固有の要素を引き継ぎます。Role OSは、用語、ビジュアル、およびメンタルモデルにおけるプロジェクト間の逸脱を検出し、拒否します。
- **感覚的な進捗**：すべての引き継ぎは構造化されています。すべての判断は証拠と関連付けられています。「完了したように感じる」という状態は有効ではありません。

## 仕組みの説明

タスクを記述します。Role OSは、適切なレベルのオーケストレーションを自動的に決定します。

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

**フォールバックラダー（代替手段の階層）:**

1. **ミッション**：タスクが、実績のある繰り返しワークフロー（バグ修正、治療、機能リリース、ドキュメント作成、セキュリティ、調査、ブレインストーミング、詳細監査、犬を使ったテスト）と一致する場合。既知の役割チェーン、成果物フロー、エスカレーションブランチ、および明確な部分的な定義が適用されます。
2. **パック**：タスクが既知のカテゴリに属するものの、完全なミッションの形になっていない場合。10種類の調整されたチームパックを使用し、自動選択と不一致の防止を行います。
3. **フリールーティング**：タスクが新しい、混合された、または不確かなものである場合。61種類の役割すべてに対して、パケットの内容を評価し、動的なチェーンを編成します。

このシステムは、不適切な抽象化を通してタスクを強制的に実行することはありません。各レベルを選択した理由を説明し、代替案を提示します。

**実行を開始するための1つのコマンド:**

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

**問題が発生した場合の介入:**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

実行状況はディスクに保存されるため（`.claude/runs/`）、中断されたセッションは中断したところから再開できます。各ステップには、オペレーター向けのガイダンスが含まれます。何を生成するか、必要なセクション、および停止条件が示されます。

**ルーティング後:**

1. **各役割が引き継ぎを生成**：構造化された出力と、次の役割の曖昧さを軽減する証拠項目。
2. **批評家がコントラクトに基づいてレビュー**：構造化された証拠に基づいて、承認、拒否、またはブロックを行います。印象による判断は行いません。
3. **リカバリールートが自動的に実行**：ブロックまたは拒否されたタスクは、理由、リカバリーの種類、および必要な成果物とともに、適切な解決者にルーティングされます。

## 予算を考慮したディスパッチ

Role OSは、各ディスパッチステップでローカルの**トークン予算アナリスト**を参照し、マニフェストに推奨される支出予測を添付できます。これはオプション機能であり（`ROLEOS_BUDGET_CONSULT`）、アドバイザリーとして機能し（ディスパッチをブロックすることはありません）、デフォルトでは無効になっています。予測はローカルで実行され、無料です。詳細については、[ハンドブック](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/)を参照してください。

## ツール呼び出しの監視

Role OSは、`PreToolUse`の段階でツール呼び出しを検証し、許可します。これは決定論的に行われ、ホットパスにモデルは使用されません。

- **コンフォーマンスウォッチャー**（推奨、フェイルオープン）— 決定論的なスキーマと計算可能な契約チェックにより、提案された呼び出しがカタログ化されたツール契約に準拠しているか確認し、*証明された*不適合な呼び出しに対して推奨の判断を付与します。ただし、ブロックすることはありません。オプションでLLMの上限（`ROLEOS_CONFORMANCE_CONSULT`）を設定することで、意味的に残った部分を処理します。
- **機能ゲート**（フェイルクローズド、オプションの`ROLEOS_CAPABILITY_GATE`、デフォルトはOFF）— *不可逆的な*アクション（npm/PyPIへの公開、`gh release`、`git push`、リポジトリの編集、Pagesのデプロイ）に対して、決定論的に最小限の権限を適用します。ゲートされたアクションは、ディレクターが`.claude/role-os/capabilities.json`でその機能を許可しない限り拒否されるため、誤った手順（正直なミスまたは不正な操作）によって、許可されていない不可逆的なアクションがトリガーされることはありません。これは、名前付きの補償ルールに対する予防的な補完です。[ハンドブック](https://mcp-tool-shop-org.github.io/role-os/handbook/)を参照してください。

## クルーの資料

各役割には「**資料**」があります。これはキャラクターシートであり、同時に実行時の設定としても機能します。6つの能力（厳格性、ペース、範囲、懐疑心、自律性、率直さ）は、実際の調整つまみに対応しています。8つのタイプに分類された「**性格**」層（懐疑的な人、建設者、調査員、異端者など）には、行動に関する指示が含まれており、各役割には描かれた肖像画と評価が与えられます。クルー全体をギャラリーとして閲覧できます（`dossier/dossier.html`）。各役割のレーダーには、その調整された「**ビルド**」と理想的な状態との比較が表示されます。

役割に資料がある場合、派遣システムは「**運用姿勢**」を注入します。これは、性格の行動指示に加えて、役割の能力から得られる姿勢の情報を加えたものです。これにより、シートが実際にその役割を設定します。オプションで追加できます。資料を持たない役割は、以前とまったく同じように動作します。[ハンドブック](https://mcp-tool-shop-org.github.io/role-os/handbook/crew-dossier/)を参照してください。

## 組織全体のロールアウト状態

組織全体でのロールアウト状態（キュー、決定、監査記録、リポジトリごとのロックパケット）は、別の**プライベートな**組織内部のリポジトリ（`role-os-rollout`）に保存されます。このリポジトリが製品であり、そのリポジトリが運用状態です。

## メモリと継続性

Role OSは、メモリレイヤーを所有または複製しません。Claudeプロジェクトのメモリが存在する場合、それが正当な継続性システムとなります。リポジトリの事実、決定、未解決の問題、および治療履歴は、そこに保存されます。

Role OSは、Claudeプロジェクトのメモリと統合されます。置き換えることはありません。

## 完全な治療と出荷チェック

完全な治療は、Claudeプロジェクトのメモリ（`memory/full-treatment.md`）で定義された、標準的な7段階のプロトコルです。Role OSは、役割コントラクト、引き継ぎ、および批評家ゲートを使用して、治療をルーティングおよびレビューします。プロトコルを再定義することはありません。

**出荷チェック**は、完全な治療の前に実行される31項目の品質ゲートです。厳格なゲートA〜Dは、治療が開始される前に通過する必要があります。参照：`memory/shipcheck.md`。

順序：まず出荷チェックを行い、次に完全な治療を行います。厳格なゲートを通過しない限り、v1.0.0はリリースされません。

## 10個のパックにまたがる61の役割

| パック | 役割 |
|------|-------|
| **Core** (3) | オーケストレーター、プロダクトストラテジスト、批評家レビュー担当者 |
| **Engineering** (7) | フロントエンド開発者、バックエンドエンジニア、テストエンジニア、リファクタリングエンジニア、パフォーマンスエンジニア、依存関係監査担当者、セキュリティレビュー担当者 |
| **Design** (2) | UIデザイナー、ブランドガーディアン |
| **Marketing** (1) | ローンチコピーライター |
| **Treatment** (7) | リポジトリリサーチャー、リポジトリ翻訳者、ドキュメントアーキテクト、メタデータキュレーター、カバレッジ監査担当者、デプロイメント検証担当者、リリースエンジニア |
| **Product** (3) | フィードバックスynthesizer、ロードマップ優先順位付け担当者、仕様書作成者 |
| **Research** (4) | UXリサーチャー、競合分析担当者、トレンドリサーチャー、ユーザーインタビューSynthesizer |
| **Growth** (4) | ローンチストラテジスト、コンテンツストラテジスト、コミュニティマネージャー、サポートトリアージリーダー |
| **Deep Audit** (4) | コンポーネント監査担当者、テストの真実性監査担当者、シーム監査担当者、監査Synthesizer |
| **Swarm** (7) | スワームコーディネーター、スワームバックエンドエージェント、スワームブリッジエージェント、スワームテストエージェント、スワームインフラエージェント、スワームフロントエンドエージェント、スワームSynthesizer |

各役割には、完全なコントラクトがあります。ミッション、使用する場面、使用しない場面、期待される入力、必要な出力、品質基準、およびエスカレーショントリガーが含まれます。すべての役割はルーティング可能です。`roleos route`コマンドを使用すると、パケットの内容に基づいて、これらの役割のいずれかを推奨できます。

## クイックスタート

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

## Role OSを使用しない場合

- 単行の修正、タイプミス、または明白なバグ
- 定義されたアウトプットのない探索的な調査
- 5分で1人の担当者が処理できる作業
- レビュープロセスが完了する前にリリースする必要がある緊急のホットフィックス
- 構造よりもスピードを重視するプロジェクト

## 証拠

Role OSは、構造的に異なる2つのリポジトリで、3つの異なるテストケースでその有効性が証明されました。

**テスト001 — 機能開発**（クルースクリーン、スターフレート）
- 7つの役割を持つチェーン、45のテストシナリオ、役割の衝突は0
- フォークされた祖先からの汚染を防ぎ、インラインでの発明を検出し、明確な課題を提示

**テスト002 — 統合作業**（キャンペーンステートの連携、スターフレート）
- 5つの役割を持つチェーン、フォールバックなしでアーキテクチャの境界を解決
- フォールバックテストにより、ライブパスが実際に機能し、プレースホルダーではないことが証明

**テスト003 — アイデンティティ作業**（汚染の除去、スターフレート）
- 6つの役割を持つチェーン、51のテストシナリオ（永続的なCI汚染防御を含む）
- 広範囲な再設計に陥ることなく、継承された矛盾を修正

**移植性のテスト**（ペルソナの一貫性、センサーユーモア）
- 同じ基本構造、異なる言語/ドメイン/スタック
- コンテキストの変更のみを適用 — コアコントラクトの変更はなし

**完全な処理FT-001**（ポートライトデスクトップ）
- 7段階の処理、処理パックの役割を使用
- シップチェックゲートが有効であることが証明され、役割の衝突は0

**完全な処理FT-002**（スタジオフロー）
- 同じ処理パック、構造的に異なるリポジトリ（クリエイティブなワークスペースとゲーム）
- 処理パックは移植可能 — コントラクトの変更は不要

**ブレインストーミングの優れた実行**（MCPサーバーマーケットプレーストピック）
- 9つの役割を持つチェーン、4人のアナリストが並行して作業、クロスチェックと反論の議論グラフ
- 4つの課題が提起され、3つの主張が絞り込まれ、1つは未解決 — 健全なプレッシャー、行き詰まりではない
- 16以上のトレースリンクが、レンダリングされた成果物から真実の層の原子に遡る
- 完全なトレーサビリティが証明：真実 → 原子 → 議論 → 統合 → 拡張 → 評価 → レンダリング → トレース

## コアプロパティ

これらは交渉の余地がありません。変更によってこれらのいずれかが損なわれる場合、却下してください。

- 役割の境界は維持される
- レビューには実効性がある
- エスカレーションは誠実である
- パケットはテスト可能である
- 移植性には、コアの外科手術ではなく、コンテキストへの適応が必要

## プロジェクトの構造

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

## セキュリティ

Role OSは**ローカルでのみ**動作します。Markdownテンプレートをコピーし、パケット/結果ファイルをリポジトリの`.claude/`ディレクトリに書き込みます。ネットワークにアクセスしたり、機密情報を処理したり、テレメトリを収集したりすることはありません。危険な操作は行いません。すべてのファイル書き込みは、デフォルトで「存在する場合はスキップ」を使用します。完全なポリシーについては、[SECURITY.md](SECURITY.md)を参照してください。

## オペレーティングシステム

| レイヤー | 機能の説明 | ステータス |
|-------|-------------|--------|
| **Routing** | パケットの内容に対して61の役割すべてを評価し、推奨事項を説明し、信頼性を評価します | ✓ リリース済み |
| **Chain builder** | 評価された役割から、フェーズ順にチェーンを組み立てます。テンプレートにロックされるのではなく、パケットタイプに重点を置きます。 | ✓ リリース済み |
| **Conflict detection** | 4段階の検証：深刻な競合、シーケンス、冗長性、カバレッジのギャップ。修正の提案。 | ✓ リリース済み |
| **Escalation** | ブロックされた/却下された/分割された作業を、理由と必要な成果物とともに、適切な解決者に自動的にルーティングします。 | ✓ リリース済み |
| **Evidence** | 役割を意識した、結果に構造化された証拠。十分性のチェック。12種類の証拠。 | ✓ リリース済み |
| **Dispatch** | マルチクラウド用の実行マニフェストを生成します。役割ごとのツールプロファイル、システムプロンプト、予算。 | ✓ リリース済み |
| **Trials** | 完全なロースターが証明済み：30/30のゴールドタスク + 5/5のネガティブテスト。7つのパックテストが完了。 | ✓ 完了 |
| **Team Packs** | 10個の調整されたパック、自動選択、不一致ガード、および自由ルーティングのフォールバックを備えています。 | ✓ リリース済み |
| **Outcome calibration** | 実行結果を記録し、結果からパック/役割の重みを調整し、信頼性のしきい値を調整します。 | ✓ リリース済み |
| **Mixed-task decomposition** | 複合作業を検出し、子パケットに分割し、パックを割り当て、依存関係を保持します。 | ✓ リリース済み |
| **Composite execution** | 子パケットを依存関係の順に実行し、成果物の受け渡し、ブランチの回復、および統合を行います。 | ✓ リリース済み |
| **Adaptive replanning** | 実行中のスコープの変更、調査結果、または新しい要件は、再起動せずに計画を更新します。 | ✓ リリース済み |
| **Session spine** | `roleos init claude`は、CLAUDE.md、/roleos-route、/roleos-review、/roleos-statusをスキャフォールドします。`roleos doctor`は、連携を検証します。ルートカードは、関与を証明します。 | ✓ リリース済み |
| **Hook spine** | 5つのライフサイクルフック（SessionStart、PromptSubmit、PreToolUse、SubagentStart、Stop）。アドバイザリーによる強制：ルートカードのリマインダー、書き込みツールのゲート、サブエージェントの役割の注入、完了監査。 | ✓ リリース済み |
| **Artifact spine** | 役割ごとの成果物コントラクト。パックの引き継ぎコントラクト。構造的な検証。チェーンの完全性のチェック。下流の役割は、受け取ったものを推測することはありません。 | ✓ リリース済み |
| **Mission library** | 9つの名前付きミッション（機能のリリース、バグ修正、処理、ドキュメントのリリース、セキュリティ強化、調査の開始、ブレインストーミング、詳細な監査、ドッグフードスウォーム）。それぞれが、パック、役割チェーン、成果物フロー、エスカレーションブランチ、誠実な部分的な定義を宣言します。 | ✓ リリース済み |
| **Mission runner** | 実行を作成し、追跡された状態でステップを実行し、正直なレポートで完了/失敗します。ブロックされたステップの伝播、チェーン外のエスカレーション警告、最後のステップの再開。 | ✓ リリース済み |
| **Unified entry** | `roleos start`は、ミッション、パック、または自由ルーティングを自動的に決定します。信頼性のスコア、代替案、および複合検出を備えたフォールバックラダー。 | ✓ リリース済み |
| **Persistent runs** | `roleos run`は、ディスクにバックアップされた実行を作成します。`resume`、`next`、`explain`、`complete`、`fail`。介入：リルート、エスカレート、再試行、ブロック、再開。ステップごとのガイダンス。摩擦の測定。 | ✓ リリース済み |
| **Brainstorm** | 2層のアーキテクチャ：真実（役割固有のスキーマ、プロベナンスアトム、クロスチェックの議論グラフ）+ レンダリング（5つの異なる声、語彙の禁止、議論のトランスクリプト）。トレースリンクは、レンダリングされたすべての主張が真実の原子にマッピングされることを証明します。優れた実行が証明済み。 | ✓ リリース済み |
| **Deep Audit** | マニフェストに基づくリポジトリ監査：リポジトリをコンポーネントに分解し、依存関係グラフからN人の監査者＋M人のテスト検証監査者＋K人の境界監査者を割り当て、それらを統合して、ランク付けされた検証結果とアクションプランを作成する。動的な割り当ては、リポジトリのサイズに応じて調整される（2N + K + 3の式）。各ステップでアーティファクトの検証を行う、ランナーネイティブ。 | ✓ リリース済み |
| **Dogfood Swarm** | 複数パスの収束：3つの健全性段階（バグ/セキュリティ→積極的→人間化）、その後は機能パス。排他的なファイル所有権、各段階の後にビルドゲート、ユーザーチェックポイント。ドメインの自動検出により、マニフェストが生成される。証拠ブリッジを介して、社内テスト環境に連携。 | ✓ リリース済み |

## 9つのミッション

| ミッション | パック | 役割 | 使用するタイミング |
|---------|------|-------|-------------|
| `feature-ship` | 機能 | 5 | 完全な機能の提供：スコープ→仕様→実装→テスト→レビュー |
| `bugfix` | バグ修正 | 4 | 根本原因の特定、修正、テスト、検証 |
| `treatment` | 改善 | 4 | 出荷前チェック＋調整＋ドキュメント＋CIによる検証＋レビュー |
| `docs-release` | ドキュメント | 2 | ドキュメントの作成/更新、リリースノート |
| `security-hardening` | セキュリティ | 4 | 脅威モデリング、監査、脆弱性の修正、再監査、検証 |
| `research-launch` | 調査 | 4 | 質問の作成、調査、調査結果の文書化、決定 |
| `brainstorm` | ブレインストーミング | 9 | 追跡可能な意見の相違と検証を含む、構造化された多角的な検討 |
| `deep-audit` | 詳細監査 | 5（段階） | マニフェストに基づくリポジトリ監査—ワーカー数は、動的な割り当てを通じてリポジトリグラフの規模に応じて調整される |
| `dogfood-swarm` | スウォーム | 8（段階） | 複数パスの収束：健全性A→健全性B→健全性C→機能→最終的な統合 |

各ミッションには、正直な部分的な定義が含まれる。作業が停滞した場合、システムは、完了したことと残っていることを文書化し、完了を偽ることはない。

### ブレインストーミングミッション

「AIブレインストーミング」ではない。ブレインストーミングミッションは、**法律に基づいて、追跡可能な意見の相違と検証結果を伴う、専門的な役割を担うものである。**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**異なる点：**

- **レイヤー1（真実）：** 4人のアナリストが、役割固有のスキーマ（コンテキストマップ、ユーザーバリューマップ、メカニクスマップ、ポジショニングマップ）を出力する。共有された文章ではない。各役割には、盲点対策が施されている：禁止されたフレーズ、禁止された主張の種類、フィルタリングされた入力パーティション。アトムは、その起源を保持する。指向性のあるクロス・イグザミネーショングラフが、ターゲットを絞った課題を生成する。元の分析者は、プレッシャーの下で、主張を擁護、修正、または撤回する。

- **レイヤー2（レンダリング）：** 5つの異なる人間の声（境界メモ、フィールドノート、システムスケッチ、主張概要、クロス・イグザミネーション記録）があり、語彙的な禁止により、声の収束を防ぐ。統合は真実を消費し、レンダリングされた文章は使用しない。両方のレイヤーは常に利用可能である。

- **証拠の連鎖：** レンダリングされたすべての文は、真実レイヤーのアトムに遡る。統合の指示は、アトムを参照する。クロス・イグザミネーションのターゲットは、実際の主張IDである。論争グラフが結果であり、文章ではない。

**実績：** v0.4のゴールデンラン—完全な証拠の連鎖が検証された。完全なアーティファクトチェーンについては、[`examples/golden-run.md`](examples/golden-run.md)を参照。

### 詳細監査ミッション

表面的なスキャンではない。詳細監査ミッションは、**リポジトリを境界が明確なコンポーネントに分解し、リポジトリ自体の依存関係グラフによって決定される規模で、専門の監査者を割り当てる。**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**異なる点：**

- **動的な割り当て：** ワーカー数は固定されていない。10個のコンポーネントと5つの境界クラスターを持つリポジトリでは、28ステップ（2×10 + 5 + 3）が生成される。3個のコンポーネントを持つリポジトリでは、12ステップが生成される。スケーリングの式は、`2N + K + 3`であり、N = コンポーネント数、K = 境界数である。
- **マニフェストに基づくパッケージ：** `audit-manifest.json`は、コンポーネント（ファイルパス、行数、説明を含む）と境界（インターフェースの説明を含む、from/to）を定義する。各監査者は、割り当てられたパッケージのみを受け取る。
- **4つの役割のアーキタイプ：** コンポーネント監査者（モジュールごとのコードの真実）、テスト検証監査者（存在するテストではなく、証明するテスト）、境界監査者（依存関係グラフからの統合境界）、監査統合者（すべてのパッケージからのランク付けされた検証結果＋アクションプラン）。
- **各ステップでのアーティファクトの検証：** `validateArtifact()`は、両方の実行パスの各ステップの完了時に実行される。結果は、ステップオブジェクトに添付される。システムは、各アーティファクトがその契約を満たしているかどうかを認識している。
- **正直な部分的な結果：** 予算またはスコープが完了を妨げる場合、コンポーネントごとの結果は個別に有効である。システムは、完了したことから統合し、完全な網羅性を偽ることはない。

**実績：** ランナーネイティブの検証ラン—実際のマニフェストに対する18のテスト、エスカレーションによる再開と部分的な失敗を含む、完全なライフサイクルが検証された。スケーリングの式は、3/6/10/15コンポーネントのマニフェストに対して検証された。

### 社内テスト環境スウォームミッション

1回のパスのリンターではない。社内テスト環境スウォームミッションは、**リポジトリを「動作する」状態から「本番環境で利用可能」な状態に移行させる、3つの健全性段階と反復的な機能提供を行う、複数パスの収束プロトコルを実行する。**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**異なる点：**

- **3段階のヘルスチェック** — ステージAでは、バグやセキュリティの問題を修正します（重大な問題と高レベルの問題が0になるまで繰り返します）。ステージBでは、積極的なセキュリティ強化を実施します（ユーザーが結果を確認します）。ステージCでは、コードベースをより使いやすくします — ユーザーを支援するエラーメッセージ、再接続に関するフィードバック、読み込み中の表示、アクセシビリティの向上などを行います。各ステージは異なる目的を持ち、同じスキャンを繰り返すわけではありません。
- **排他的なファイル所有権** — 各ドメインエージェントは、`swarm-manifest.json`を通じて特定のファイルを所有します。2つのエージェントが同じファイルを編集することはありません。マージの競合も発生しません。調整のためのオーバーヘッドも発生しません。
- **ビルドゲート** — 各イテレーションの後に、lint、型チェック、テストを必ず実行し、すべてに合格する必要があります。システムは、ビルドシステム（Node、Rust、Python、Go）を自動的に検出し、適切なコマンドを実行します。
- **ユーザーチェックポイント** — ヘルスチェックBと機能チェックでは、実行前にユーザーの明示的な承認が必要です。システムは結果を提示し、ユーザーがビルドする内容を決定します。
- **反復的な収束** — 各ステージは、終了条件が満たされるか、最大イテレーション回数に達するまで、イテレーションを繰り返します。各イテレーションでは、以前の修正によって発生した問題を検出するために、最初から再監査を行います。
- **ドメインの自動検出** — `roleos swarm manifest --generate`は、リポジトリのタイプ（CLI、Web、デスクトップ、MCP、モノリポ）を検出し、重複しないドメイン割り当てを生成します。

**実績:** claude-collaborate (2026-03-28) — 35→129のテスト、106件のヘルスチェックの問題を修正、v1.1.0をリリース。9つのフェーズを持つプロトコルv2.0。

## ステータス

安定しており、リリースされています。完全なバージョン履歴と、各リリースの変更点は、[CHANGELOG](CHANGELOG.md)を参照してください。

## ライセンス

MIT

---

<a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>によってビルドされました。
