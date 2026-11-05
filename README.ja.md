<p align="center"><img src="logo.png" alt="SkillGraph logo" width="360"></p>
<h1 align="center">SkillGraph</h1>
<p align="center"><strong>Agent Skill、科学研究ワークフロー、再現可能な成果物のための契約検証オーケストレーション。</strong></p>
<p align="center">言語：<a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a></p>

## コンセプト

SkillGraph は AI Agent と Agent Skill の間に位置するオーケストレーション層です。複雑なタスクを、検証可能・再開可能・監視可能なワークフローグラフへ変換します。

Agent は推論、ツール呼び出し、実際の研究作業を担当します。SkillGraph はステージ、入力/出力契約、分岐、ループ、予算、状態保存、成果物検証を担当します。

```text
ユーザープロンプト → Agent stage → SKILL.md → 成果物契約 → 次の stage / 品質ループ
```

## ロゴの意味

- **Agent**：推論、ツール、コード、ステージ処理を実行。
- **DAG Orchestration**：YAML のノードとエッジで依存関係・分岐を定義。
- **Checkpoint & Resume**：run、visit、イベント、artifact を保存し再開。
- **Multi-Skill Support**：1つのステージで複数の `SKILL.md` をロード。
- **Observability**：graph hash、skill hash、checksum、イベントを記録。
- **Unified Output Format**：全ステージが統一された `node_result.json` を返す。
- **中央のチェックマーク**：必須成果物の検証後だけ次へ進む。

## 主な機能

- YAML ワークフローと決定的ルーティング
- 単一または複数 Skill のステージ
- SHA-256 による Skill 固定
- artifact、JSON Schema、パス、サイズの検証
- 原子的な状態保存、ファイルロック、manifest、イベントログ
- pause / resume / retry / bounded loop
- CLI と MCP stdio adapter
- 科学論文、アルゴリズム、医学、生物情報学、レビュー用ワークフロー

## 科学論文ワークフロー

| Workflow | 用途 |
|---|---|
| `paper` | 一般的な実証研究 |
| `paper-algo` | アルゴリズム・ML イノベーション |
| `paper-medical` | 臨床研究・エビデンス統合 |
| `paper-bioinfo` | オミクス・バイオインフォマティクス |
| `paper-survey` | 文献レビュー |

研究課題 → 文献 → 方法 → 実験 → 統計 → 科学図表 → 長文原稿 → 査読 → 修正ループ → 引用監査 → LaTeX → PDF → リリース品質ゲート、という閉ループを構成します。

## クイックスタート

```bash
npm install
npm run build
node dist/cli.js list
node dist/cli.js run paper-algo '{"prompt":"再現可能なストリーミングアルゴリズムを研究する"}'
```

## LaTeX と PDF

```bash
export PATH="$HOME/.local/bin:$PATH"
npm run compile-paper -- path/to/final_paper.tex
```

## 品質チェック

```bash
npm run qa
npm run audit
npm run smoke
npm test
```

## License

MIT
