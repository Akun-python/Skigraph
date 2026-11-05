<p align="center"><img src="logo.png" alt="SkillGraph logo" width="360"></p>
<h1 align="center">SkillGraph</h1>
<p align="center"><strong>面向 Agent Skill、科研工作流與可重現交付物的契約檢查編排引擎。</strong></p>
<p align="center">語言：<a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a></p>

## 專案概念

SkillGraph 位於 AI Agent 與 Agent Skill 之間，將複雜任務轉換為可驗證、可恢復、可觀測的工作流圖。

Agent 負責推理、工具呼叫與實際科研工作；SkillGraph 負責階段編排、輸入輸出契約、分支、循環、預算、狀態持久化與交付物驗證。

```text
使用者提示詞 → Agent 階段 → SKILL.md → 交付物契約 → 下一階段 / 品質循環
```

## Logo 含義

- **Agent**：執行推理、工具呼叫、程式碼與階段任務。
- **DAG Orchestration**：使用 YAML 節點與邊編排依賴、階段與條件分支。
- **Checkpoint & Resume**：保存 run 狀態、visit、事件與 artifact，支援暫停及恢復。
- **Multi-Skill Support**：同一階段可同時載入多個互補的 `SKILL.md`。
- **Observability**：記錄 graph hash、skill hash、artifact checksum 與事件。
- **Unified Output Format**：所有階段使用統一的 `node_result.json`。
- **中心勾選**：只有必需交付物通過驗證，流程才會推進。

## 主要功能

- YAML 工作流圖與確定性路由。
- 單一 Skill 或多 Skill 階段。
- SHA-256 Skill 固定。
- 必需/可選 artifact、JSON Schema、路徑與大小驗證。
- 原子狀態寫入、檔案鎖、manifest 與事件日誌。
- 暫停、恢復、重試與有上限的品質循環。
- CLI 與 MCP stdio 適配器。
- 結構化提問協議。
- 科研論文、演算法、醫學、生信與綜述工作流。

## 科研論文工作流

| 工作流 | 用途 |
|---|---|
| `paper` | 一般實證研究 |
| `paper-algo` | 演算法與機器學習創新 |
| `paper-medical` | 臨床研究與證據綜合 |
| `paper-bioinfo` | 組學與生物資訊學 |
| `paper-survey` | 文獻綜述 |

論文閉環：研究問題 → 文獻 → 方法 → 實驗 → 統計 → 科學圖表 → 長篇論文 → 同行評審 → 修訂循環 → 引用審計 → LaTeX → PDF → 發布品質門。

## 快速開始

```bash
npm install
npm run build
node dist/cli.js list
node dist/cli.js run paper-algo '{"prompt":"研究一個可重現的串流演算法"}'
```

## LaTeX 與 PDF

```bash
export PATH="$HOME/.local/bin:$PATH"
npm run compile-paper -- path/to/final_paper.tex
```

## 品質檢查

```bash
npm run qa
npm run audit
npm run smoke
npm test
```

## License

MIT
