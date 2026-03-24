<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

Role OSは、役割契約、構造化されたデータパケット、レビュー、エスカレーションを通じて作業を管理する、移植可能でリポジトリに統合されたオペレーティングレイヤーです。これにより、チームは、ドリフト、誤った完了、または主観的な進捗報告なしに、機能開発、統合、ID修正、およびリポジトリ全体の管理を行うことができます。

## Role OSの機能

Role OSは、一般的なAIワークフローで発生する特定の課題を解決します。

- **ドリフト（逸脱）**: 各役割は、自身の担当範囲にとどまります。製品の再設計、フロントエンドのスコープ変更、バックエンドの製品方向性の変更を防ぎます。
- **誤った完了**: 完了の定義は明確です。不備を隠したり、検証を省略したり、別の問題を解決したりする作業は却下されます。
- **汚染**: 分岐または継承されたプロジェクトには、元のプロジェクトの要素が残存する可能性があります。Role OSは、用語、ビジュアル、および思考モデルにおけるプロジェクト間の逸脱を検出し、却下します。
- **主観的な進捗**: すべての手渡し作業は構造化されています。すべての判断は、証拠に基づいています。「完了したように感じる」という主観的な判断は認められません。

## Role OSの仕組み

1. **データパケットの作成**: 作業が完了したときに必要な要素を定義します。
2. **役割チェーンによるルーティング**: 必要な専門的な役割の最小限のセットで作業をルーティングします。
3. **各役割による手渡し**: 次の役割が理解しやすいように、構造化された出力を提供します。
4. **レビュー担当者による契約との照合**: 証拠に基づいて、作業を承認、却下、または保留とします。主観的な判断は行いません。

## メモリと継続性

Role OSは、メモリレイヤーを所有または複製しません。Claudeプロジェクトのメモリが存在する場合、それが標準的な継続性システムです。リポジトリの情報、決定事項、未解決の問題、および処理履歴は、そこに保存されます。

Role OSは、Claudeプロジェクトのメモリと連携します。置き換えるものではありません。

## 完全な処理と品質チェック

完全な処理は、Claudeプロジェクトのメモリ (`memory/full-treatment.md`) に定義された、7段階の標準的なプロセスです。Role OSは、役割契約、手渡し、およびレビューゲートを使用して、処理をルーティングおよびレビューします。このプロセスを再定義するものではありません。

**品質チェック**は、完全な処理の前に実行される、31項目の品質ゲートです。完全な処理を開始する前に、AからDまでの必須ゲートをすべて通過する必要があります。参照先: `memory/shipcheck.md`.

順序: 品質チェックを最初に実行し、次に完全な処理を行います。必須ゲートをすべて通過しない限り、バージョン1.0.0をリリースできません。

## Role OSの構成要素

Role OSは、以下の8つの役割契約を標準で提供します。

| 役割 | ジョブ |
|------|-----|
| **Orchestrator** | 作業を最小限の役割チェーンに分解します。 |
| **Product Strategist** | スコープを定義し、製品の意図を保護します。 |
| **UI Designer** | 階層構造、インタラクション、および視覚的な構造を設計します。 |
| **Frontend Developer** | ユーザーインターフェースを忠実に実装します。 |
| **Backend Engineer** | サーバー/データ契約およびシステム動作を実装します。 |
| **Test Engineer** | 作業を、形式的な手順ではなく、実際のリスクに基づいて検証します。 |
| **Launch Copywriter** | 実装された作業に基づいて、正確な情報を伝えます。 |
| **Critic Reviewer** | 契約への準拠に基づいて、作業を承認または却下します。 |

## クイックスタート

```bash
# Copy the starter pack into your repo
cp -r starter-pack/ your-repo/.claude/

# Fill the four context files
# - context/product-brief.md   (what this product is)
# - context/repo-map.md        (how the repo works)
# - context/current-priorities.md (what's happening now)
# - context/brand-rules.md     (identity law)

# Create your first packet, route it, review it
# See starter-pack/handbook.md for the full flow
```

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
  README.md                    ← You are here
  starter-pack/
    handbook.md                ← How Role OS works (under 500 words)
    context/                   ← Fill these for your repo
    examples/                  ← Feature, integration, identity packets
    agents/                    ← 8 role contracts
    schemas/                   ← Packet, handoff, verdict formats
    policy/                    ← Routing, permissions, escalation, done
    workflows/                 ← Ship feature, fix bug, launch update, full treatment (reference)
```

## セキュリティ

Role OSは、**ローカルでのみ**動作します。Markdownテンプレートをコピーし、パケット/判定ファイルを、あなたのリポジトリの`.claude/`ディレクトリに書き込みます。ネットワークへのアクセス、機密情報の取り扱い、テレメトリーの収集は行いません。危険な操作は一切行いません。すべてのファイル書き込みは、デフォルトでファイルが存在する場合はスキップします。詳細については、[SECURITY.md](SECURITY.md) を参照してください。

## ステータス

**v1.0.0 — リリース済み**

- v0.1: 稼働中 — 3回のテスト、3回の採用、ロールの競合は0件
- v0.2: 導入 — メインリポジトリでのデフォルトワークフロー、別のリポジトリへの移植
- v0.3: 製品化 — スターターパック、初期設定CLI、導入ドキュメント

## ライセンス

MIT

---

作成者: <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
