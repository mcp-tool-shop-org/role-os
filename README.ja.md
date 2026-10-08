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

61種類の専門的な役割契約を通じて、コーディングエージェントの作業をスタッフ、ルーティング、検証、実行する、リポジトリネイティブのオペレーション層。タスクパケットを作成し、スコアリングされた役割のマッチングから適切なチームを編成し、実行前に問題のあるチェーンを検出し、作業がブロックまたは拒否された場合に自動的にリカバリルーティングを行い、すべての結果に構造化された証拠を要求します。マニフェスト規模のミッションに対応した動的なディスパッチ機能が含まれており、10個のコンポーネントで構成されたリポジトリが自動的に28個の監査ステップに拡張されます（6個ではありません）。

Claude Codeアダプターがリリースされました（`roleos init`がスキャフォールド`.claude/`を提供します）。契約はマークダウン形式であり、あらゆるコーディングハーネスで使用できます。このリポジトリは、すでに別のアダプターが実行されていることを主張しません。

## その機能

Role OSは、コーディングエージェントの作業にスタッフを配置するためのプロフェッショナルな方法です。一般的なAIワークフローで発生する特定の失敗を防ぎます。

- **ドリフト** - 役割はそれぞれの範囲にとどまります。製品は再設計されません。フロントエンドはスコープを再定義しません。バックエンドは製品の方向性を新たに作り出すことはありません。
- **誤った完了** - 完了の定義は明確です。ギャップを隠したり、検証をスキップしたり、別の問題を解決する作業は拒否されます。
- **汚染** - フォークまたは継承されたプロジェクトは、固有の残存物を持っています。Role OSは、用語、ビジュアル、およびメンタルモデルにおけるプロジェクト間のドリフトを検出し、拒否します。
- **雰囲気に基づいた進捗** - すべての引き継ぎは構造化されています。すべての結果は証拠と関連付けられています。「完了したように感じる」という状態は有効ではありません。

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

1. **ミッション** - タスクが、実績のある反復ワークフロー（バグ修正、対応、機能リリース、ドキュメント、セキュリティ、調査、ブレインストーミング、詳細な監査、ドッグフードスウォーム）と一致する場合。既知の役割チェーン、アーティファクトフロー、エスカレーションブランチ、および正直な部分的な定義。
2. **パック** - タスクが既知のファミリーに属するが、完全なミッションの形ではない場合。10個の調整されたチームパックと、自動選択および不一致ガード。
3. **フリールーティング** - タスクが新しい、混合、または不確かな場合。61個すべての役割をパケットの内容に対してスコアリングし、動的なチェーンを編成します。

システムは、誤った抽象化を通して作業を強制することはありません。各レベルを選択した理由を説明し、代替案を提示します。

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

1. **各役割は引き継ぎを生成します** - 構造化された出力と、次の役割のあいまいさを軽減する証拠項目。
2. **批評家は契約に対してレビューします** - 構造化された証拠に基づいて、受け入れ、拒否、またはブロックします。印象に基づいて判断することはありません。
3. **リカバリルートは自動的に実行されます** - ブロックまたは拒否された作業は、理由、リカバリタイプ、および必要なアーティファクトとともに、適切な解決者にルーティングされます。

## 予算を考慮したディスパッチ

Role OSは、各ディスパッチステップでローカルの**トークン予算アナリスト**を参照し、マニフェストにアドバイザリーの支出予測を添付できます。これはオプション（`ROLEOS_BUDGET_CONSULT`）、アドバイザリー（ディスパッチをブロックすることはありません）、およびフェイルオープンで、決定的なベースラインにフォールバックします。デフォルトではオフになっています。予測はローカルで実行でき、無料です。ハンドブックを参照してください：[https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/)。

## ツール呼び出しの監視

Role OSは、`PreToolUse`のシームでツール呼び出しを検証およびゲートします。これは、ホットパス上にモデルが存在しない、決定的な方法で行われます。

- **コンフォーマンスウォッチャー**（アドバイザリー、フェイルオープン） - 決定的なスキーマ+計算可能な契約の最低限のチェックにより、提案された呼び出しがカタログ化されたツール契約に対してチェックされ、*実績のある*非準拠の呼び出しに関するアドバイザリーの判断が添付されます。ただし、ブロックすることはありません。オプションのLLM上限（`ROLEOS_CONFORMANCE_CONSULT`）は、真に意味的な残存物を処理します。
- **機能ゲート**（フェイルクローズド、オプション（`ROLEOS_CAPABILITY_GATE`）、デフォルトはOFF） - *不可逆的な*アクション（npm/PyPIの公開、`gh release`、`git push`、リポジトリの編集、Pagesのデプロイ）に対する決定的な最小権限。ゲートされたアクションは、ディレクターが`.claude/role-os/capabilities.json`でその機能を許可しない限り、拒否されます。したがって、誤ったステップ（正直な間違いまたは挿入されたもの）によって、不正な不可逆的なアクションがトリガーされることはありません。名前付きコンペンセータールールに対する予防的な補完。ハンドブックを参照してください：[https://mcp-tool-shop-org.github.io/role-os/handbook/](https://mcp-tool-shop-org.github.io/role-os/handbook/)。

## クルーの概要

各役割には、**概要**があります。これは、実行時の構成としても機能するキャラクターシートです。6つの適性（厳密性、ペース、範囲、懐疑心、自律性、率直さ）は、実際のディスパッチノブにマッピングされます。8つのアーキタイプの**性格**レイヤー（懐疑主義者、ビルダー、調査員、異端者など）は、行動指示を伝えます。また、各役割には、描かれた肖像画と評価があります。ギャラリーとしてクルー全体を参照できます（`dossier/dossier.html`）。各役割のレーダーには、調整されたビルドと、その役割の理想的な状態との比較が表示されます。

役割に概要がある場合、ディスパッチは**オペレーションポスチャー**を注入します。これは、性格の行動指示と、役割の適性からのポスチャー行です。したがって、シートは実際に役割を構成します。オプションであり、追加機能です。概要のない役割は、以前とまったく同じように動作します。ハンドブックを参照してください：[https://mcp-tool-shop-org.github.io/role-os/handbook/crew-dossier/](https://mcp-tool-shop-org.github.io/role-os/handbook/crew-dossier/)。

## 組織全体のロールアウト状態

組織全体のロールアウト状態（キュー、決定、監査記録、リポジトリごとのロックパケット）は、別の**プライベート**で、組織内部のリポジトリ（`role-os-rollout`）に保存されます。このリポジトリが製品であり、そのリポジトリが運用状態です。

## メモリと継続性

Role OSは、メモリレイヤーを所有または複製しません。ハーネスプロジェクトのメモリストアが存在する場合、それは正当な継続性システムです。リポジトリの事実、決定、未解決の問題、および対応履歴は、そこに保存されます。

Role OSは、存在する場合、そのストアと統合されます。置き換えることはありません。

## 完全なレビューと出荷チェック

完全なレビューは、スタジオプロジェクトのメモリ（`memory/full-treatment.md`）で定義された、標準的な7段階のプロトコルです。Role OSは、役割契約、引き継ぎ、および批判的ゲートを使用して、役割をルーティングし、レビューを実行します。プロトコルを再定義することはありません。

**出荷チェック**は、完全なレビューの前に実行される31項目の品質ゲートです。すべてのレビューを開始する前に、ハードゲートA〜Dを通過する必要があります。標準的な参照：`memory/shipcheck.md`。

順序：まず出荷チェック、次に完全なレビュー。ハードゲートを通過しない限り、v1.0.0はリリースされません。

## 61の役割のカタログ

このカタログは、61の役割を11のファミリーにグループ化しています。（Dispatchは、これらのファミリーから役割を選択する、10個の**チームパック**（機能、バグ修正、セキュリティ、ドキュメント、リリース、調査、レビュー、詳細監査、ブレインストーミング、スウォーム）という別のセットを使用します。）

| ファミリー | 役割 |
|--------|-------|
| **Core** (2) | オーケストレーター、批判的レビュー担当者 |
| **Product** (4) | 製品戦略家、フィードバックの統合担当者、ロードマップの優先順位付け担当者、仕様書作成者 |
| **Engineering** (7) | フロントエンド開発者、バックエンドエンジニア、テストエンジニア、リファクタリングエンジニア、パフォーマンスエンジニア、依存関係監査者、セキュリティレビュー担当者 |
| **Design** (2) | UIデザイナー、ブランドガーディアン |
| **Marketing** (1) | リリース用コピーライター |
| **Treatment** (7) | リポジトリ研究者、リポジトリ翻訳者、ドキュメントアーキテクト、メタデータキュレーター、カバレッジ監査者、デプロイ検証者、リリースエンジニア |
| **Research** (4) | UX研究者、競合分析者、トレンド研究者、ユーザーインタビューの統合担当者 |
| **Growth** (4) | リリース戦略家、コンテンツ戦略家、コミュニティマネージャー、サポートトリアージリーダー |
| **Brainstorm** (19) | コンテキストスカウト、ユーザーバリュースカウト、クリエイティブリープスカウト、メカニクススカウト、マーケットスカウト、コントラリアンスカウト、実現可能性スカウト、品質基準スカウト、コンテキストアナリスト、ユーザーバリューアナリスト、メカニクスアナリスト、ポジショニングアナリスト、コントラリアンアナリスト、正規化担当者、統合担当者、製品拡張担当者、シナリオ拡張担当者、競争優位性拡張担当者、審査員 |
| **Deep Audit** (4) | コンポーネント監査者、テストの真実性監査者、シーム監査者、監査統合担当者 |
| **Swarm** (7) | スウォームコーディネーター、スウォームバックエンドエージェント、スウォームブリッジエージェント、スウォームテストエージェント、スウォームインフラエージェント、スウォームフロントエンドエージェント、スウォーム統合担当者 |

すべての役割には、完全な契約があります。ミッション、使用する場面、使用しない場面、期待される入力、必要な出力、品質基準、およびエスカレーショントリガーが含まれます。すべての役割はルーティング可能です。`roleos route`は、パケットの内容に基づいて、これらの役割のいずれかを推奨できます。

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
- 1人の頭の中で5分で完了する作業
- レビューチェーンが完了する前に出荷する必要がある緊急のホットフィックス
- 速度を構造よりも優先するプロジェクト

## 証拠

Role OSは、構造的に異なる2つのリポジトリで、3つの異なるトライアル形状でその有効性が証明されました。

**トライアル001 — 機能作業**（クルースクリーン、スターフレート）
- 7つの役割を持つチェーン、45のテストシナリオ、0つの役割の衝突
- フォークの祖先からの汚染を防ぎ、インラインの発明を発見し、正直な障害を明らかにしました。

**トライアル002 — 統合作業**（キャンペーンステートの配線、スターフレート）
- 5つの役割を持つチェーン、フォールバックなしでアーキテクチャのシームを解決しました。
- アンチフォールバックテストにより、ライブパスが実際のパスであり、プレースホルダーではないことが証明されました。

**トライアル003 — アイデンティティ作業**（汚染の除去、スターフレート）
- 6つの役割を持つチェーン、耐久性のあるCI汚染防御を含む51のテストシナリオ。
- 広い再設計に陥ることなく、継承されたフィクションのずれを修正しました。

**移植性のトライアル**（ペルソナの一貫性、センサーユーモア）
- 同じ基本構造、異なる言語/ドメイン/スタック
- コンテキストの変更のみで採用され、コア契約の変更はありません。

**完全なレビューFT-001**（ポートライトデスクトップ）
- レビューパックの役割を持つ7段階のレビュー
- 出荷チェックゲートが証明され、役割の衝突はゼロ。

**完全なレビューFT-002**（スタジオフロー）
- 同じレビューパック、構造的に異なるリポジトリ（クリエイティブワークスペースとゲーム）
- レビューパックは移植可能であり、契約の変更は必要ありません。

**ブレインストーミングの黄金の実行**（MCPサーバーマーケットプレーストピック）
- 9つの役割を持つチェーン、4人のアナリストが並行して、クロスチェックと反論のグラフを作成します。
- 4つの課題が提起され、3つの主張が絞り込まれ、1つは未解決のままです。健全なプレッシャーであり、デッドロックではありません。
- 16以上のトレースリンクが、レンダリングされた成果物から真実層のアトムに遡ります。
- 完全なチェーンの追跡可能性が証明されました。真実→アトム→論争→統合→拡張→審査→レンダリング→トレース

## コアプロパティ

これらは交渉の余地がありません。変更によってこれらのいずれかが弱まる場合、それを拒否してください。

- 役割の境界は維持されます。
- レビューには力があります。
- エスカレーションは正直に行われます。
- パケットはテスト可能です。
- 移植性には、コアの外科手術ではなく、コンテキストの適応が必要です。

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
    calibration.mjs            ← Outcome ledger. Pack boosts only; keyword scores stay the score
    calibration-cmd.mjs        ← `roleos calibration`
    recipe-cmd.mjs             ← `roleos recipe` dataset recipe cards
    specialist/recipe-card.mjs ← Recipe-card checks, nine controls, canonical hash
    jury-cmd.mjs               ← `roleos jury check`, `select`, and `score`
    specialist/jury.mjs        ← Critic measurements and panel selection
    hooks.mjs                  ← 5 lifecycle hooks for runtime enforcement
    session.mjs                ← Session scaffolding + doctor
    brainstorm.mjs             ← Evidence modes, request validation, finding/synthesis/judge schemas
    brainstorm-roles.mjs       ← Role-native schemas, input partitioning, blindspot enforcement, cross-exam
    brainstorm-render.mjs      ← Two-layer rendering: lexical bans, render schemas, debate transcript
  test/                        ← 1692 tests across 75 test files (1689 pass, 3 skipped)
  starter-pack/                ← Drop-in role contracts, policies, schemas, workflows
```

このリリースで測定された行カバレッジは90.66％（22778/25123）です。CIの最低基準は90％です。

## セキュリティ

デフォルトでは、Role OSは**ローカルファイルシステムでのみ**動作します。マークダウンテンプレートをコピーし、パケット/結果/実行ファイルをリポジトリの`.claude/`ディレクトリに書き込みます。デフォルトの操作では、ネットワークリクエストは行われず、秘密は処理されず、テレメトリは収集されません。危険な操作はありません。すべてのファイル書き込みでは、デフォルトで存在する場合はスキップされます。

ネットワークにアクセスする3つの**オプトイン**機能があり、明示的に有効にした場合にのみアクセスします。

- **`roleos verify-citations`** — shells out to the external `prism` CLI, which resolves citation identifiers against public arXiv/Crossref APIs (sends the citation IDs/URLs being verified).
- **Specialist tier** (`roleos specialist`, registered roles) — POSTs dispatch prompts to the `backend_url` you configure in `.role-os/specialists.json` (typically a local model endpoint).
- **Budget / conformance consult** (`ROLEOS_BUDGET_CONSULT` / `ROLEOS_CONFORMANCE_CONSULT`) — sends the step/tool-call context to a local model over HTTP for an advisory verdict.

デフォルトではすべてオフになっており、ローカルの決定的な動作にフォールバックします。完全なポリシーについては、[SECURITY.md](SECURITY.md) を参照してください。

## レシピカード、審査員、およびパックの調整

訓練された評価者は、学習したデータと同じレベルの性能しか発揮できません。Role OS は、そのデータをレシピカードに記録し、審査員のパネルを評価し、完了した実行によってパックの選択を強化します。これらはいずれもモデルを呼び出しません。同じファイルと、同じシードを使用すると、同じ数値が生成されます。

### レシピカード

`roleos recipe` はカード (`roleos-recipe-card/v1`) をチェックします。9つの標準的なチェック項目が、評価者がその属性を学習していなくても、良い結果を出す方法をそれぞれ監視します。合格したチェック項目で測定値がない場合、それはギャップです。一貫性のない測定値はエラーです。`shuffled-labels` は、メソッド `balanced-permutation` を使用する必要があります。`same-generator-no-error`：両方の編集方法が記録され、それらの間隔が重ならない場合、ステータスは `unresolved` である必要があり、そうでない場合、チェックは失敗します。`reversed-correction` は、その精度間隔が完全に 0.5 より上にある場合にのみ合格します。

```bash
roleos recipe check starter-pack/examples/auditor-recipe-card.json
```

そのファイルは、訓練された評価者ではなく、入力された合成カードです。チェックは次のように出力されます。

```
✓ starter-pack/examples/auditor-recipe-card.json (auditor-v1, role Auditor)
  note     controls[2] (shuffled-labels): permutation floor is 1/20; a pass at this floor means the observed result beat every null
  controls 9/9 standard controls passed
  sha256   5763c4dd57fc9f7bea41186493e56b72ce73a5e30f4c5c813248655a360b1588
```

その注記は事実であり、ギャップではありません。`roleos specialist register` は `--recipe` を取得し、カードの ID とハッシュをそのバージョンに固定します。[ハンドブック](https://mcp-tool-shop-org.github.io/role-os/handbook/recipe-cards/) を参照してください。

### 審査員

`roleos jury select` は、ネストされたグループ化された間隔が、そのパネルが最高の単一の評価者よりも優れていることを示した場合にのみ、パネルを保持します。それ以外の場合、その評価者、または 30 項目未満または 10 グループ未満の `insufficient-data` が結果となります。カードに失敗した、または解決されていない標準的なチェック項目がある評価者は、`--allow-unproven` の場合を除き、除外されます。カードがない評価者は、`--require-recipe` の場合を除き、引き続き参加します。スコアは決して反転しません。同じシードを使用すると、同じ数値が繰り返されます。

```bash
roleos jury select starter-pack/examples/jury-validation.json --seed 0
```

この合成ファイルでは、結果は `best-single (echo)` です。echo と sharp は同じ間違いを犯すため、エラーの一貫性は 1.0000 であり、重複フラグはその名前を付けます。フラグはどちらの評価者も除外しません。ネストされた間隔は [-0.1000, 0.0000] です。0 に触れているため、完全に 0 より上にはなく、--out を使用してもパネルファイルは書き込まれません。なぜなら、--out はパネルの結果に対してのみ 1 つのファイルを書き込むからです。[ハンドブック](https://mcp-tool-shop-org.github.io/role-os/handbook/jury/) には、完全なレポートがあります。

### パックの調整

実行が終了すると、Role OS は 1 つの結果行を追加します。同じ実行 ID で 2 つ目の行は書き込まれません。パックに少なくとも 5 つの記録された結果がある場合、修正が 0 の各完了した実行は、そのパックに +0.5 を追加し、最大値は +2 です。この強化は、キーワードがすでに一致したパックにのみ適用されます。信頼度は、キーワードスコアから取得され、3 つのキーワードが一致すると高く、2 つのキーワードが一致すると中程度に保たれます。Role の重みは変更されません。信頼度のしきい値も変更されません。調整レポートでは、キーワードのカットオフ値を検討することを提案する場合があります。Role OS は、その提案を適用しません。

`ROLEOS_NO_CALIBRATION=1` は、強化をオフにします。記録は継続されます。

```bash
roleos calibration
```

結果のログがないディレクトリにある場合、次のように出力されます。

```
no recorded runs yet
```

`roleos route --verbose` と `roleos explain` は、ログにそれらがある場合、強化、実行回数、およびクリーンレートを出力します。[ハンドブック](https://mcp-tool-shop-org.github.io/role-os/handbook/calibration/) を参照してください。

## オペレーティングシステム

| レイヤー | その機能 | ステータス |
|-------|-------------|--------|
| **Routing** | 61 個すべてのロールをパケットコンテンツに対して評価し、推奨事項を説明し、信頼度を評価します。 | ✓ リリース済み |
| **Chain builder** | スコアリングされたロールから、段階的に順序付けられたチェーンを組み立てます。テンプレートにロックされるのではなく、パケットタイプに偏っています。 | ✓ リリース済み |
| **Conflict detection** | 4 回のパスによる検証：深刻な競合、シーケンス、冗長性、カバレッジのギャップ。修正の提案。 | ✓ リリース済み |
| **Escalation** | ブロック/拒否/分割された作業を、理由と必要な成果物とともに、適切な解決策に自動的にルーティングします。 | ✓ リリース済み |
| **Evidence** | ロールを認識した構造化された証拠を、結果に含めます。十分性のチェック。12 種類の証拠。 | ✓ リリース済み |
| **Dispatch** | コーディングエージェントハーネス用の実行マニフェストを生成します。ロールごとのツールプロファイル、システムプロンプト、予算。 | ✓ リリース済み |
| **Trials** | 完全なロースターが証明されました：30/30 のゴールドタスク + 5/5 のネガティブテスト。7 つのパックテストが完了しました。 | ✓ 完了 |
| **Team Packs** | 10 個の調整されたパック。自動選択、不一致ガード、および自由ルーティングによるフォールバックを備えています。 | ✓ リリース済み |
| **Recipe cards** | 訓練されたロールのデータレシピ。9 つの標準的なチェック項目、各合格したチェック項目に対する測定値、およびカノニカルハッシュ。 | ✓ リリース済み |
| **Jury** | 訓練された評価者を評価します。パネルは、保持されたグループで最高の単一の評価者よりも優れている場合にのみ保持されます。失敗した、または解決されていないレシピのチェック項目がある評価者は、除外されます。 | ✓ リリース済み |
| **Outcome calibration** | 実行が終了すると、1 つの結果を記録します。5 つの結果が記録された後、修正が 0 の完了した実行は、キーワードがすでに一致していたパックを強化します (+0.5 ずつ、最大 +2)。信頼度は、引き続きキーワードスコアから取得されます。ロールの重みと信頼度のしきい値は変更されません。 | ✓ リリース済み |
| **Mixed-task decomposition** | 複合作業を検出し、子パケットに分割し、パックを割り当て、依存関係を保持します。 | ✓ リリース済み |
| **Composite execution** | 子パケットを依存関係の順序で実行し、成果物の受け渡し、ブランチの回復、および合成を行います。 | ✓ リリース済み |
| **Adaptive replanning** | 実行中のスコープの変更、発見、または新しい要件は、再起動せずに計画を更新します。 | ✓ リリース済み |
| **Session spine** | `roleos init claude` は CLAUDE.md、/roleos-route、/roleos-review、/roleos-status をスキャフォールドします。`roleos doctor` は配線を検証します。ルートカードは、関与を証明します。 | ✓ リリース済み |
| **Hook spine** | 5 つのライフサイクルフック（SessionStart、PromptSubmit、PreToolUse、SubagentStart、Stop）。アドバイザリーによる強制：ルートカードのリマインダー、書き込みツールのゲート、サブエージェントロールの挿入、完了監査。 | ✓ リリース済み |
| **Artifact spine** | ロールごとの成果物契約。パックの引き渡し契約。構造的検証。チェーンの完全性チェック。下流のロールは、受信したものを推測することはありません。 | ✓ リリース済み |
| **Mission library** | 9 つの名前付きミッション（機能のリリース、バグ修正、治療、ドキュメントのリリース、セキュリティの強化、調査の開始、ブレインストーミング、詳細な監査、ドッグフードスウォーム）。それぞれが、パック、ロールチェーン、成果物フロー、エスカレーションブランチ、正直な部分的な定義を宣言します。 | ✓ リリース済み |
| **Mission runner** | 実行を作成し、追跡された状態とともにステップを実行し、正直なレポートで完了/失敗を報告します。ブロックされたステップの伝播、チェーン外のエスカレーション警告、最後のステップでの再開。 | ✓ リリース済み |
| **Unified entry** | `roleos start`は、ミッション、パック、フリールーティングを自動的に決定します。信頼度スコア、代替案、複合検出を備えたフォールバックラダー。 | ✓ リリース済み |
| **Persistent runs** | `roleos run`は、ディスクにバックアップされた実行を作成します。`resume`、`next`、`explain`、`complete`、`fail`。介入：リルート、エスカレート、再試行、ブロック、再開。ステップローカルガイダンス。摩擦の測定。 | ✓ リリース済み |
| **Brainstorm** | 2層アーキテクチャ：真実（役割固有のスキーマ、プロベナンスアトム、クロス・イグザミネーション・ディスプート・グラフ）+ レンダリング（5つの異なるボイス、語彙的禁止、議論のトランスクリプト）。トレースリンクは、レンダリングされたすべての主張が真実アトムにマッピングされることを証明します。ゴールデン実行が証明されました。 | ✓ リリース済み |
| **Deep Audit** | マニフェストスケーリングされたリポジトリ監査：リポジトリをコンポーネントに分解し、依存関係グラフからN人の監査者+ M人のテスト真実監査者+ K人のシーム監査者を派遣し、ランク付けされた結果とアクションプランに統合します。動的な派遣は、リポジトリのサイズに合わせてスケールします（2N + K + 3の式）。各ステップでアーティファクト検証を行う、ランナーネイティブ。 | ✓ リリース済み |
| **Dogfood Swarm** | マルチパス収束：3つの健全性段階（バグ/セキュリティ→プロアクティブ→人間化）から、機能パスに進みます。排他的なファイル所有権、各段階の後のビルドゲート、ユーザーチェックポイント。ドメインの自動検出により、マニフェストが生成されます。証拠ブリッジをドッグフードラボに接続します。 | ✓ リリース済み |

## 9つのミッション

| ミッション | パック | 役割 | 使用するタイミング |
|---------|------|-------|-------------|
| `feature-ship` | 機能 | 5 | 完全な機能の提供：スコープ→仕様→実装→テスト→レビュー |
| `bugfix` | バグ修正 | 4 | 根本原因の診断、修正、テスト、検証 |
| `treatment` | 処理 | 4 | 出荷チェック+ 調整+ ドキュメント+ CI検証+ レビュー |
| `docs-release` | ドキュメント | 2 | ドキュメントの作成/更新、リリースノート |
| `security-hardening` | セキュリティ | 4 | 脅威モデル、監査、脆弱性の修正、再監査、検証 |
| `research-launch` | 調査 | 4 | 質問の提起、調査、調査結果の文書化、決定 |
| `brainstorm` | ブレインストーミング | 9 | 追跡可能な意見の相違と結果を伴う、構造化された多角的な調査 |
| `deep-audit` | 詳細監査 | 5（スケール） | マニフェストベースのリポジトリ監査—ワーカー数は、動的な派遣を通じてリポジトリグラフに合わせてスケールします |
| `dogfood-swarm` | スウォーム | 8（スケール） | マルチパス収束：ヘルスA→ヘルスB→ヘルスC→機能→最終的な統合 |

各ミッションには、正直な部分的な定義が含まれています。作業が停滞した場合、システムは作業が完了したことと、残っていることを文書化し、完了を偽ることはありません。

### ブレインストーミングミッション

「AIブレインストーミング」ではありません。ブレインストーミングミッションは、**法律の下での専門的な役割であり、追跡可能な意見の相違と結果を伴う出力です。**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**異なる点：**

- **レイヤー1（真実）：** 4人のアナリストが役割固有のスキーマ（ContextMap、UserValueMap、MechanicsMap、PositioningMap）を出力します。共有された文章ではありません。各役割は、盲点強化されています：禁止されたフレーズ、禁止された主張の種類、フィルタリングされた入力パーティション。アトムはプロベナンスを運びます。指向性のあるクロス・イグザミネーション・グラフは、ターゲットを絞った課題を生成します。元のアナリストは、プレッシャーの下で防御、絞り込み、または撤回します。

- **レイヤー2（レンダリング）：** 5つの異なる人間のボイス（境界メモ、フィールドノート、システムスケッチ、主張概要、クロス・イグザミネーション・トランスクリプト）があり、語彙的な禁止により、ボイスの収束を防ぎます。合成は真実を消費し、レンダリングされた文章は消費しません。両方のレイヤーは常に利用可能です。

- **カストディチェーン：** レンダリングされたすべての文は、真実レイヤーのアトムに遡ります。合成の方向は、アトムを引用します。クロス・イグザミネーションのターゲットは、実際の主張IDです。ディスプートグラフは、文章ではなく、その結果です。

**証明済み：** v0.4ゴールデン実行—完全なカストディチェーンが検証されました。完全なアーティファクトチェーンについては、[`examples/golden-run.md`](examples/golden-run.md)を参照してください。

### 詳細監査ミッション

表面的なスキャンではありません。詳細監査ミッションは、**リポジトリを境界が定められたコンポーネントに分解し、リポジトリ自体の依存関係グラフによって決定されたスケールで、専門の監査者を派遣します。**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**異なる点：**

- **動的な派遣**—ワーカー数は固定されていません。10個のコンポーネントと5つの境界クラスターを持つリポジトリは、28ステップ（2×10 + 5 + 3）を生成します。3個のコンポーネントを持つリポジトリは、12ステップを生成します。スケーリングの式は、`2N + K + 3`です。ここで、N = コンポーネント、K = 境界です。
- **マニフェストベースのパッケージ**—`audit-manifest.json`は、コンポーネント（ファイルパス、行数、説明を含む）と境界（インターフェイスの説明を含む、from/to）を定義します。各監査者は、自分のパッケージのみを受け取ります。
- **4つの役割のアーキタイプ**—コンポーネント監査者（モジュールごとのコード真実）、テスト真実監査者（証明するテストと存在するテスト）、シーム監査者（依存関係グラフからの統合境界）、監査合成者（すべてのパッケージからのランク付けされた結果+アクションプラン）。
- **すべてのステップでのアーティファクト検証**—`validateArtifact()`は、両方の実行パスで各ステップの完了時に実行されます。結果は、ステップオブジェクトに添付されます。システムは、各アーティファクトがその契約を満たしたかどうかを知っています。
- **正直な部分**—予算またはスコープが完了を妨げる場合、コンポーネントごとの結果は個別に有効です。システムは、完了したことから統合し、完全なカバレッジを偽ることはありません。

**証明済み：** ランナーネイティブの証明実行—実際のマニフェストに対する18のテスト、エスカレーション再開と部分的な失敗を含む完全なライフサイクルが検証されました。3/6/10/15コンポーネントのマニフェストに対して、スケーリングの式が検証されました。

### ドッグフードスウォームミッション

1回のパスのリンターではありません。ドッグフードスウォームミッションは、**リポジトリを「機能する」状態から3つの健全性段階と反復的な機能提供を通じて「本番環境で利用できる」状態に移行させる、マルチパス収束プロトコルを実行します。**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**異なる点：**

- **3段階の健全性チェック** — ステージAでは、バグやセキュリティの問題を修正します（重大な問題が0件、高レベルの問題が0件になるまで繰り返します）。ステージBでは、積極的なセキュリティ強化を適用します（ユーザーが結果を確認します）。ステージCでは、コードベースをより使いやすくします — ユーザーを支援するエラーメッセージ、再接続に関するフィードバック、読み込み中の表示、アクセシビリティの向上などを行います。各ステージは異なる目的を持ち、同じチェックを繰り返すわけではありません。
- **排他的なファイル所有権** — 各ドメインエージェントは、`swarm-manifest.json`を通じて特定のファイルを所有します。2つのエージェントが同じファイルを編集することはありません。マージの競合も発生しません。調整のためのオーバーヘッドも発生しません。
- **ビルドゲート** — 各イテレーションの後に、lint、型チェック、テストを必ず実行し、すべてに合格する必要があります。システムは、ビルドシステム（Node、Rust、Python、Go）を自動的に検出し、適切なコマンドを実行します。
- **ユーザーチェックポイント** — 健全性チェックBと機能チェックでは、実行前にユーザーの明示的な承認が必要です。システムは結果を提示し、ユーザーがビルドする内容を決定します。
- **反復的な収束** — 各ステージは、終了条件が満たされるか、最大イテレーション回数に達するまで、イテレーションを繰り返します。各イテレーションでは、以前の修正によって発生した問題を検出するために、最初から再監査を行います。
- **ドメインの自動検出** — `roleos swarm manifest --generate`は、リポジトリのタイプ（CLI、Web、デスクトップ、MCP、モノリポジトリ）を検出し、重複しないドメイン割り当てを生成します。

**実績:** claude-collaborate (2026-03-28) — 35→129のテスト、106件の健全性に関する問題が修正、v1.1.0がリリース。9つのフェーズを持つプロトコルv2.0。

## ステータス

安定しており、リリースされています。完全なバージョン履歴と、各リリースの変更点は、[CHANGELOG](CHANGELOG.md)を参照してください。

## ライセンス

MIT

---

<a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>によって作成されました。
