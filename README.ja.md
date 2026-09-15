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

61種類の専門的な役割契約を通じて、コーディングエージェントの作業をスタッフ、ルーティング、検証、実行する、リポジトリネイティブなオペレーティング層。タスクパケットを作成し、スコアリングされた役割のマッチングから適切なチームを編成し、実行前に問題のあるチェーンを検出し、作業がブロックまたは拒否された場合に自動的にリカバリルーティングを行い、すべての結果に対して構造化された証拠を要求します。マニフェスト規模のミッションに対応した動的なディスパッチが含まれており、10個のコンポーネントを持つリポジトリは、6個ではなく28個の監査ステップに自動的に拡張されます。

Claude Codeアダプターがリリースされました（`roleos init`が`.claude/`のスケルトンを生成します）。契約はマークダウン形式であり、あらゆるコーディングハーネスで使用できます。このリポジトリは、すでに別のアダプターが実行されていることを主張しません。

## その機能

Role OSは、コーディングエージェントの作業にスタッフを配置するためのプロフェッショナルな方法です。一般的なAIワークフローで発生する特定の失敗を防ぎます。

- **ドリフト** — 役割はそれぞれの範囲にとどまります。製品は再設計されません。フロントエンドはスコープを再定義しません。バックエンドは製品の方向性を決定しません。
- **誤った完了** — 完了の定義は具体的です。ギャップを隠したり、検証をスキップしたり、別の問題を解決する作業は拒否されます。
- **汚染** — フォークまたは継承されたプロジェクトは、アイデンティティの残存物を持っています。Role OSは、用語、ビジュアル、およびメンタルモデルにおけるプロジェクト間のドリフトを検出し、拒否します。
- **雰囲気に基づいた進捗** — すべての引き継ぎは構造化されています。すべての結果は証拠に結び付けられています。「完了したように感じる」ことは有効な状態ではありません。

## その仕組み

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

**フォールバックラダー：**

1. **ミッション** — タスクが、実績のある反復ワークフロー（バグ修正、対応、機能リリース、ドキュメント、セキュリティ、調査、ブレインストーミング、詳細監査、ドッグフードスウォーム）と一致する場合。既知の役割チェーン、アーティファクトフロー、エスカレーションブランチ、および正直な部分的な定義。
2. **パック** — タスクが既知のファミリーに属するが、完全なミッションの形ではない場合。10個の調整されたチームパックと、自動選択および不一致ガード。
3. **フリールーティング** — タスクが新規、混合、または不確実な場合。61個すべての役割をパケットの内容に対してスコアリングし、動的なチェーンを編成します。

システムは、誤った抽象化を通じて作業を強制することはありません。各レベルを選択した理由を説明し、代替案を提示します。

**アクティブな実行への1つのコマンド：**

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

**問題が発生した場合の介入：**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

実行はディスクに永続化されるため（`.claude/runs/`）、中断されたセッションはクリーンに再開されます。各ステップには、オペレーターガイダンスが含まれます。何を生成するか、必要なセクション、および停止条件。

**ルーティング後：**

1. **各役割が引き継ぎを生成します** — 構造化された出力と、次の役割のあいまいさを軽減する証拠項目。
2. **批評家が契約に対してレビューします** — 構造化された証拠に基づいて、承認、拒否、またはブロックします。印象に基づいて判断することはありません。
3. **リカバリルートが自動的に実行されます** — ブロックまたは拒否された作業は、理由、リカバリタイプ、および必要なアーティファクトとともに、適切な解決者にルーティングされます。

## 予算を考慮したディスパッチ

Role OSは、各ディスパッチステップでローカルの**トークン予算アナリスト**を参照し、マニフェストにアドバイザリーの支出予測を添付できます。これはオプションであり（`ROLEOS_BUDGET_CONSULT`）、アドバイザリーであり（ディスパッチをブロックすることはありません）、決定的なベースラインにフォールオープンします。デフォルトではオフになっています。予測はローカルで実行でき、無料です。ハンドブックを参照してください：[https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/)。

## ツール呼び出しの監視

Role OSは、`PreToolUse`のシームでツール呼び出しを検証およびゲートします。これは、ホットパス上にモデルがない、決定的な方法で行われます。

- **コンフォーマンスウォッチャー**（アドバイザリー、フォールオープン） — 決定的なスキーマ+計算可能な契約の最低限のチェックにより、提案された呼び出しがカタログ化されたツール契約に対してチェックされ、*実績のある*非準拠の呼び出しに関するアドバイザリーの結果が添付されます。これは決してブロックしません。オプションのLLM上限（`ROLEOS_CONFORMANCE_CONSULT`）は、真に意味的な残存物を処理します。
- **機能ゲート**（フォールクローズド、オプション（`ROLEOS_CAPABILITY_GATE`）、デフォルトではOFF） — *不可逆的な*アクション（npm/PyPIの公開、`gh release`、`git push`、リポジトリの編集、Pagesのデプロイ）に対する決定的な最小権限。ゲートされたアクションは、ディレクターが`.claude/role-os/capabilities.json`でその機能を許可しない限り、拒否されます。したがって、誤ったステップ（正直な間違いまたは挿入されたもの）によって、許可されていない不可逆的なアクションがトリガーされることはありません。名前付きコンペンセータールールに対する予防的な補完。ハンドブックを参照してください：[https://mcp-tool-shop-org.github.io/role-os/handbook/](https://mcp-tool-shop-org.github.io/role-os/handbook/)。

## クルードシエ

各役割には、**ドシエ**があります。これは、実行時の構成としても機能するキャラクターシートです。6つの適性（厳密性、ペース、範囲、懐疑心、自律性、率直さ）は、実際のディスパッチノブにマッピングされます。8つのアーキタイプの**気質**レイヤー（懐疑主義者、ビルダー、調査員、異端者…）は、行動指示を伝えます。また、各役割には、描かれた肖像画と評価があります。ギャラリーとしてクルー全体を参照してください（`dossier/dossier.html`）。各役割のレーダーには、調整されたビルドと、その役割の理想的な状態との比較が表示されます。

役割にドシエがある場合、ディスパッチは**オペレーティングポスチャー**を注入します。これは、気質の行動指示と、役割の適性からのポスチャーラインです。したがって、シートは実際に役割を構成します。これはオプションであり、追加です。ドシエを持たない役割は、以前とまったく同じように動作します。ハンドブックを参照してください：[https://mcp-tool-shop-org.github.io/role-os/handbook/crew-dossier/](https://mcp-tool-shop-org.github.io/role-os/handbook/crew-dossier/)。

## 組織全体のロールアウト状態

組織全体のロールアウト状態（キュー、決定、監査レコード、リポジトリごとのロックパケット）は、別の**プライベート**な組織内部リポジトリ（`role-os-rollout`）に保存されます。このリポジトリが製品であり、そのリポジトリが運用状態です。

## メモリと継続性

Role OSは、メモリレイヤーを所有または複製しません。ハーネスプロジェクトのメモリストアが存在する場合、それは正当な継続性システムです。リポジトリの事実、決定、未解決の問題、および対応履歴は、そこに保存されます。

Role OSは、存在する場合、そのストアと統合されます。Role OSは、それを置き換えるものではありません。

## 完全なレビューと出荷チェック

完全なレビューは、スタジオプロジェクトのメモリ（`memory/full-treatment.md`）で定義された、標準的な7段階のプロトコルです。Role OSは、役割契約、引き継ぎ、および批判的ゲートを使用して、役割をルーティングし、レビューを実行します。プロトコルを再定義することはありません。

**出荷チェック**は、完全なレビューの前に実行される31項目の品質ゲートです。すべてのレビューを開始する前に、A〜Dの厳格なゲートを通過する必要があります。標準的な参照：`memory/shipcheck.md`。

順序：まず出荷チェック、次に完全なレビュー。厳格なゲートを通過しない限り、v1.0.0はリリースされません。

## 61の役割のカタログ

このカタログは、61の役割を11のファミリーにグループ化します。（Dispatchは、これらのファミリーから役割を選択する、機能、バグ修正、セキュリティ、ドキュメント、リリース、調査、レビュー、詳細監査、ブレインストーミング、スウォームなど、10個の**チームパック**の別のセットを使用します。）

| ファミリー | 役割 |
|--------|-------|
| **Core** (2) | オーケストレーター、批判的レビュー担当者 |
| **Product** (4) | 製品戦略家、フィードバックの統合担当者、ロードマップの優先順位付け担当者、仕様書作成者 |
| **Engineering** (7) | フロントエンド開発者、バックエンドエンジニア、テストエンジニア、リファクタリングエンジニア、パフォーマンスエンジニア、依存関係監査担当者、セキュリティレビュー担当者 |
| **Design** (2) | UIデザイナー、ブランドガーディアン |
| **Marketing** (1) | リリース用コピーライター |
| **Treatment** (7) | リポジトリ研究者、リポジトリ翻訳者、ドキュメントアーキテクト、メタデータキュレーター、カバレッジ監査担当者、デプロイ検証担当者、リリースエンジニア |
| **Research** (4) | UX研究者、競合分析者、トレンド研究者、ユーザーインタビューの統合担当者 |
| **Growth** (4) | リリース戦略家、コンテンツ戦略家、コミュニティマネージャー、サポートトリアージリーダー |
| **Brainstorm** (19) | コンテキストスカウト、ユーザーバリュースカウト、クリエイティブリープスカウト、メカニクススカウト、マーケットスカウト、コントラリアンスカウト、実現可能性スカウト、品質基準スカウト、コンテキストアナリスト、ユーザーバリューアナリスト、メカニクスアナリスト、ポジショニングアナリスト、コントラリアンアナリスト、正規化担当者、統合担当者、製品拡張担当者、シナリオ拡張担当者、競争優位性拡張担当者、審査員 |
| **Deep Audit** (4) | コンポーネント監査担当者、テストの真実性監査担当者、シーム監査担当者、監査の統合担当者 |
| **Swarm** (7) | スウォームコーディネーター、スウォームバックエンドエージェント、スウォームブリッジエージェント、スウォームテストエージェント、スウォームインフラエージェント、スウォームフロントエンドエージェント、スウォーム統合担当者 |

各役割には、ミッション、使用する場面、使用しない場面、期待される入力、必要な出力、品質基準、およびエスカレーショントリガーを含む、完全な契約があります。すべての役割はルーティング可能です。`roleos route`は、パケットの内容に基づいて、これらの役割のいずれかを推奨できます。

## クイックスタート

```bash
# Install (puts `roleos` on your PATH):
npm install -g role-os

# Scaffold the role spine into your repo:
roleos init
# (one-off alternative without installing: `npx role-os init`,
#  then prefix every command below with `npx role-os` instead of `roleos`)

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

- 単一行の修正、タイプミス、または明白なバグ
- 定義された出力のない探索的な調査
- 5分で1人の頭の中に収まる作業
- レビューチェーンが完了する前に出荷する必要がある緊急のホットフィックス
- 速度を構造よりも優先するプロジェクト

## 証拠

Role OSは、構造的に異なる2つのリポジトリで、3つの異なるトライアル形状でその有効性が証明されました。

**トライアル001 — 機能作業**（クルースクリーン、スターフレート）
- 7つの役割のチェーン、45のテストシナリオ、0つの役割の衝突
- フォークの祖先からの汚染を防ぎ、インラインの発明を検出し、正直なブロックを明らかにしました。

**トライアル002 — 統合作業**（キャンペーンステートの配線、スターフレート）
- 5つの役割のチェーン、フォールバックなしでアーキテクチャのシームを解決
- アンチフォールバックテストにより、ライブパスが実際のパスであり、プレースホルダーではないことが証明されました。

**トライアル003 — アイデンティティ作業**（汚染の除去、スターフレート）
- 6つの役割のチェーン、耐久性のあるCI汚染防御を含む51のテストシナリオ
- 広い再設計に陥ることなく、継承されたフィクションのずれを修正しました。

**移植性のトライアル**（ペルソナの一貫性、センサーユーモア）
- 同じ骨格、異なる言語/ドメイン/スタック
- コンテキストの変更のみで採用 — コア契約の変更はありません。

**完全なレビューFT-001**（ポートライトデスクトップ）
- レビューパックの役割を使用した、7段階のレビュー
- 出荷チェックのゲートが証明され、役割の衝突はゼロ。

**完全なレビューFT-002**（スタジオフロー）
- 同じレビューパック、構造的に異なるリポジトリ（クリエイティブワークスペースとゲーム）
- レビューパックは移植可能 — 契約の変更は必要ありません。

**ブレインストーミングの黄金の実行**（MCPサーバーマーケットプレーストピック）
- 9つの役割のチェーン、4人のアナリストが並行して、クロスチェックと反論のグラフを作成
- 4つの課題が提起され、3つの主張が絞り込まれ、1つは未解決 — 健全なプレッシャー、デッドロックではありません。
- 16以上のトレースリンクが、レンダリングされた成果物から真実層のアトムに遡ります。
- 完全なチェーンオブカストディが証明されました：真実→アトム→論争→統合→拡張→審査→レンダリング→トレース

## コアプロパティ

これらは交渉の余地がありません。変更によってこれらのいずれかが弱まる場合は、それを拒否してください。

- 役割の境界は維持されます
- レビューには力があります
- エスカレーションは正直さを保ちます
- パケットはテスト可能です
- 移植性には、コアの手術ではなく、コンテキストの適応が必要です

## プロジェクト構造

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
    dispatch.mjs               ← Runtime dispatch manifests for the coding-agent harness
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
  test/                        ← 1595 tests across 72 test files (1592 pass, 3 skipped)
  starter-pack/                ← Drop-in role contracts, policies, schemas, workflows
```

## セキュリティ

デフォルトでは、Role OSは**ローカルファイルシステムでのみ**動作します。マークダウンテンプレートをコピーし、パケット/結果/実行ファイルをリポジトリの`.claude/`ディレクトリに書き込みます。デフォルトの操作では、ネットワークリクエストは行われず、秘密は処理されず、テレメトリは収集されません。危険な操作はありません。すべてのファイル書き込みでは、デフォルトで「存在する場合はスキップ」が使用されます。

ネットワークにアクセスする3つの**オプトイン**機能があり、明示的に有効にするとアクセスします。

- **`roleos verify-citations`** — shells out to the external `prism` CLI, which resolves citation identifiers against public arXiv/Crossref APIs (sends the citation IDs/URLs being verified).
- **Specialist tier** (`roleos specialist`, registered roles) — POSTs dispatch prompts to the `backend_url` you configure in `.role-os/specialists.json` (typically a local model endpoint).
- **Budget / conformance consult** (`ROLEOS_BUDGET_CONSULT` / `ROLEOS_CONFORMANCE_CONSULT`) — sends the step/tool-call context to a local model over HTTP for an advisory verdict.

デフォルトではすべて無効になっており、ローカルの決定的な動作にフォールバックします。完全なポリシーについては、[SECURITY.md](SECURITY.md) を参照してください。

## オペレーティングシステム

| レイヤー | その機能 | ステータス |
|-------|-------------|--------|
| **Routing** | 61個のロールすべてをパケットの内容に対して評価し、推奨事項を説明し、信頼性を評価します。 | ✓ 配信済み |
| **Chain builder** | スコアリングされたロールから段階的に順序付けられたチェーンを組み立て、パケットタイプに偏りを持たせ、テンプレートに依存させません。 | ✓ 配信済み |
| **Conflict detection** | 4回の検証：深刻な競合、シーケンス、冗長性、カバレッジのギャップ。修正の提案。 | ✓ 配信済み |
| **Escalation** | ブロック/拒否/分割されたタスクを、理由と必要な成果物とともに適切な解決策に自動的にルーティングします。 | ✓ 配信済み |
| **Evidence** | ロールを意識した構造化された証拠を結果に含めます。十分性のチェック。12種類の証拠。 | ✓ 配信済み |
| **Dispatch** | コーディングエージェントのハーネス用の実行マニフェストを生成します。ロールごとのツールプロファイル、システムプロンプト、予算。 | ✓ 配信済み |
| **Trials** | 完全なロースターが証明済み：30/30のゴールドタスク + 5/5のネガティブテスト。7つのパケットテストが完了。 | ✓ 完了 |
| **Team Packs** | 10個の調整されたパケット。自動選択、不一致ガード、および自由ルーティングのフォールバック機能を備えています。 | ✓ 配信済み |
| **Outcome calibration** | 実行結果を記録し、結果からパケット/ロールの重みを調整し、信頼性のしきい値を調整します。 | ✓ 配信済み |
| **Mixed-task decomposition** | 複合タスクを検出し、子パケットに分割し、パケットを割り当て、依存関係を保持します。 | ✓ 配信済み |
| **Composite execution** | 成果物の受け渡し、ブランチの復旧、および合成を行いながら、依存関係の順序で子パケットを実行します。 | ✓ 配信済み |
| **Adaptive replanning** | 実行途中のスコープの変更、発見、または新しい要件は、再起動せずに計画を更新します。 | ✓ 配信済み |
| **Session spine** | `roleos init claude` は CLAUDE.md、/roleos-route、/roleos-review、/roleos-status を作成します。 `roleos doctor` は配線を検証します。ルートカードは関与を証明します。 | ✓ 配信済み |
| **Hook spine** | 5つのライフサイクルフック（SessionStart、PromptSubmit、PreToolUse、SubagentStart、Stop）。アドバイザリーによる強制：ルートカードのリマインダー、書き込みツールのゲート、サブエージェントロールの注入、完了監査。 | ✓ 配信済み |
| **Artifact spine** | ロールごとの成果物契約。パケットの引き継ぎ契約。構造的検証。チェーンの完全性チェック。下流のロールは、受信したものを推測することはありません。 | ✓ 配信済み |
| **Mission library** | 9つの名前付きミッション（機能のリリース、バグ修正、対応、ドキュメントのリリース、セキュリティ強化、調査の開始、ブレインストーミング、詳細監査、ドッグフードスウォーム）。それぞれが、パケット、ロールチェーン、成果物フロー、エスカレーションブランチ、正直な部分的な定義を宣言します。 | ✓ 配信済み |
| **Mission runner** | 実行を作成し、追跡された状態とともにステップを実行し、正直なレポートで完了/失敗します。ブロックされたステップの伝播、チェーン外のエスカレーション警告、最後のステップの再開。 | ✓ 配信済み |
| **Unified entry** | `roleos start` は、ミッション、パケット、または自由ルーティングを自動的に決定します。信頼性のスコア、代替案、および複合検出を備えたフォールバックラダー。 | ✓ 配信済み |
| **Persistent runs** | `roleos run` は、ディスクにバックアップされた実行を作成します。 `resume`、`next`、`explain`、`complete`、`fail`。介入：リルート、エスカレート、再試行、ブロック、再開。ステップごとのガイダンス。摩擦の測定。 | ✓ 配信済み |
| **Brainstorm** | 2層アーキテクチャ：真実（ロール固有のスキーマ、プロベナンスアトム、クロス・イグザミネーション・ディスプート・グラフ）+ レンダリング（5つの異なる声、語彙的禁止、議論のトランスクリプト）。トレースリンクは、レンダリングされたすべての主張が真実のアトムにマッピングされることを証明します。ゴールデンランが証明済み。 | ✓ 配信済み |
| **Deep Audit** | マニフェストスケーリングされたリポジトリ監査：リポジトリをコンポーネントに分解し、N個の監査者 + M個のテスト真実監査者 + K個のシーム監査者を依存関係グラフからディスパッチし、ランク付けされた結果とアクションプランに統合します。動的なディスパッチは、リポジトリのサイズに合わせてスケーリングされます（2N + K + 3の式）。ランナーネイティブで、すべてのステップで成果物の検証を行います。 | ✓ 配信済み |
| **Dogfood Swarm** | 複数パスの収束：3つの健全性段階（バグ/セキュリティ→プロアクティブ→人間化）から、機能パスに進みます。排他的なファイル所有権、すべてのウェーブの後のビルドゲート、ユーザーチェックポイント。ドメインの自動検出により、マニフェストが生成されます。証拠ブリッジはドッグフードラボに接続されます。 | ✓ 配信済み |

## 9つのミッション

| ミッション | パケット | 役割 | 使用するタイミング |
|---------|------|-------|-------------|
| `feature-ship` | 機能 | 5 | 完全な機能の配信：スコープ→仕様→実装→テスト→レビュー |
| `bugfix` | バグ修正 | 4 | 根本原因の診断、修正、テスト、検証 |
| `treatment` | 対応 | 4 | 出荷チェック + 調整 + ドキュメント + CI検証 + レビュー |
| `docs-release` | ドキュメント | 2 | ドキュメントの作成/更新、リリースノート |
| `security-hardening` | セキュリティ | 4 | 脅威モデル、監査、脆弱性の修正、再監査、検証 |
| `research-launch` | 調査 | 4 | 質問の提起、調査、調査結果の文書化、決定 |
| `brainstorm` | ブレインストーミング | 9 | 追跡可能な意見の相違と結果を伴う、構造化された多角的な調査 |
| `deep-audit` | 詳細監査 | 5（スケール） | マニフェストに裏付けられたリポジトリ監査 — 労働者の数は、動的なディスパッチを介してリポジトリグラフに合わせてスケーリングされます。 |
| `dogfood-swarm` | スウォーム | 8（スケール） | 複数パスの収束：健全性A→健全性B→健全性C→機能→最終的な合成 |

各ミッションには、正直な部分的な定義が含まれています。作業が停滞した場合、システムは完了を偽るのではなく、完了したことと残っていることを文書化します。

### ブレインストーミングミッション

「AIブレインストーミング」ではありません。ブレインストーミングミッションは、**法律の下での特殊なロールであり、追跡可能な意見の相違と結果を伴う出力です。**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**異なる点：**

- **レイヤー1（真実）：** 4人のアナリストがロール固有のスキーマ（ContextMap、UserValueMap、MechanicsMap、PositioningMap）を出力します。共有された散文ではありません。各ロールは、盲点によって強制されます：禁止されたフレーズ、禁止された主張の種類、フィルタリングされた入力パーティション。アトムはプロベナンスを運びます。指向性のあるクロス・イグザミネーション・グラフは、ターゲットを絞った課題を生成します。元のアナリストは、プレッシャーの下で防御、絞り込み、または撤回します。

- **レイヤー2（レンダリング）：** 5つの異なる人間の声（境界メモ、フィールドノート、システムスケッチ、主張の概要、クロス・イグザミネーション・トランスクリプト）があり、語彙的な禁止により、声の収束を防ぎます。合成は真実を消費し、レンダリングされた散文は消費しません。両方のレイヤーは常に利用できます。

- **証拠の連鎖:** 提示されたすべての文は、真実の層にある要素に遡ることができます。合成の方向性は、要素を参照します。クロスチェックの対象は、実際のクレームIDです。論争グラフは、文章ではなく、結果です。

**実証済み:** v0.4の完全な実行 — 完全な証拠の連鎖が検証されました。完全な成果物の連鎖については、[`examples/golden-run.md`](examples/golden-run.md)を参照してください。

### 詳細な監査ミッション

表面的なスキャンではありません。詳細な監査ミッションは、**リポジトリを境界が明確なコンポーネントに分割し、リポジトリ自体の依存関係グラフによって決定される規模で、専門の監査担当者を派遣します。**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**異なる点：**

- **動的な割り当て** — 担当者の数は固定されていません。10個のコンポーネントと5つの境界クラスターを持つリポジトリでは、28ステップ（2×10 + 5 + 3）が生成されます。3個のコンポーネントを持つリポジトリでは、12ステップが生成されます。スケーリングの式は、`2N + K + 3`で、N = コンポーネント数、K = 境界の数です。
- **マニフェストに基づくパッケージ** — `audit-manifest.json`は、コンポーネント（ファイルパス、行数、説明を含む）と境界（インターフェースの説明を含む、from/to）を定義します。各監査担当者は、割り当てられたパッケージのみを受け取ります。
- **4つの役割のアーキタイプ** — コンポーネント監査担当者（モジュールごとのコードの真実性を検証）、テスト真実性監査担当者（存在するテストと、それを証明するテストを検証）、境界監査担当者（依存関係グラフからの統合境界を検証）、監査合成担当者（すべてのパッケージからのランク付けされた結果とアクションプランを生成）。
- **すべてのステップでの成果物の検証** — `validateArtifact()`は、両方の実行パスのすべてのステップの完了時に実行されます。結果は、ステップオブジェクトに添付されます。システムは、各成果物がその要件を満たしているかどうかを認識します。
- **正直な部分的な結果** — 予算または範囲が完了を妨げる場合、コンポーネントごとの結果は個別に有効です。システムは、完了した部分から合成し、完全な網羅性を偽ることはありません。

**実証済み:** ランナーネイティブの検証実行 — 実際のマニフェストに対して18のテストを実行し、エスカレーションによる再開と部分的な失敗を含む、完全なライフサイクルを検証しました。スケーリングの式は、3/6/10/15コンポーネントのマニフェストに対して検証されました。

### ドッグフードスウォームミッション

1回のスキャンだけではありません。ドッグフードスウォームミッションは、**リポジトリを「動作する」状態から「本番環境で利用可能」な状態に移行させる、3つの健全性段階と反復的な機能提供を行う、複数回の収束プロトコルを実行します。**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**異なる点：**

- **3段階の健全性チェック** — ステージAは、バグとセキュリティの問題を修正します（0 CRITICAL + 0 HIGHになるまでループします）。ステージBは、積極的な強化を適用します（ユーザーが結果を確認します）。ステージCは、コードベースを人間らしくします — ユーザーを支援するエラーメッセージ、再接続のフィードバック、読み込み状態、アクセシビリティ。各ステージは、同じスキャンを繰り返すのではなく、異なる視点です。
- **排他的なファイル所有権** — すべてのドメインエージェントは、`swarm-manifest.json`を通じて特定のファイルを所有します。2つのエージェントが同じファイルを編集することはありません。マージの競合はありません。調整のオーバーヘッドはありません。
- **ビルドゲート** — すべてのウェーブの後に、lint、型チェック、テストに合格する必要があります。システムは、ビルドシステム（Node、Rust、Python、Go）を自動的に検出し、適切なコマンドを実行します。
- **ユーザーチェックポイント** — 健全性Bと機能の段階では、実行前に明示的なユーザーの承認が必要です。システムは結果を提示し、ユーザーがビルドするものを決定します。
- **反復的な収束** — ステージは、終了条件が満たされるか、最大反復回数に達するまで、ウェーブのループとともにループします。各ウェーブは、以前の修正によって導入された問題を検出するために、最初から再監査します。
- **ドメインの自動検出** — `roleos swarm manifest --generate`は、リポジトリのタイプ（CLI、Web、デスクトップ、MCP、モノリポジトリ）を検出し、重複しないドメインの割り当てを生成します。

**実証済み:** claude-collaborate（2026-03-28） — 35→129テスト、106件の健全性に関する問題が修正、v1.1.0がリリースされました。9つの段階を持つプロトコルv2.0。

## ステータス

安定しており、リリースされています。完全なバージョン履歴と、各リリースで変更された内容は、[CHANGELOG](CHANGELOG.md)を参照してください。

## ライセンス

MIT

---

MCP Tool Shopによって作成されました。
