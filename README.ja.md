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

## 仕組み

SkillGraph は複雑なタスクを明示的な状態遷移に変換します。YAML ノードがステージと契約を定義し、エンジンが入力と artifact を解決し、Agent が一つ以上の `SKILL.md` をロードしてファイルを書き込みます。その後 `node_result.json` を検証し、次のエッジまたはループを選択します。

```text
YAML ノード → 入力と Skill の解決 → SKILL.md のロード → Agent が成果物を書く
→ node_result.json → artifact/path/schema/hash 検証 → 次のステージまたはループ
```

原則は、**Agent が内容を作り、グラフが内容の受理と次の処理を決める**ことです。

### 状態とトレーサビリティ

各 run は workflow version、graph hash、全 skill hash、入力、session、時刻を保存します。各ステージには固有の `visit_id` があり、artifact には生成ノード、visit、パス、サイズ、SHA-256、検証時刻が記録されます。

### 複数 Skill のステージ

```yaml
- id: methods
  skill: experimental-design
  skills:
    - experimental-design
    - statistical-power
```

runner はすべての `SKILL.md` をロードし、実験設計、検出力分析、科学的記述、図表設計などを協調させます。

### 分岐、ループ、品質フィードバック

医学ワークフローは臨床コホートと meta-analysis に分岐でき、生物情報ワークフローは bulk RNA-seq、単一細胞、マイクロバイオームに分岐できます。査読の修正版は review に戻り、リリース品質ゲートの失敗は draft に戻ります。

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

## ライセンス

Copyright 2026 Akun-python。本プロジェクトは [Apache License 2.0](LICENSE) の下で提供されます。第三者の Skill および依存関係には、それぞれのライセンスが適用されます。
