<p align="center"><img src="logo.png" alt="SkillGraph logo" width="360"></p>
<h1 align="center">SkillGraph</h1>
<p align="center"><strong>面向 Agent Skill、科研工作流與可重現交付物的契約檢查編排引擎。</strong></p>
<p align="center">語言：<a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-2563eb?style=for-the-badge" alt="Apache 2.0"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/Node.js-22%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 22+"></a>
  <a href="skills/README.md"><img src="https://img.shields.io/badge/Bundled%20skills-31-0d9488?style=for-the-badge" alt="31 bundled skills"></a>
</p>

<p align="center"><a href="#快速開始">🚀 快速開始</a> · <a href=".skill-workflows/README.md">📚 工作流文件</a> · <a href="skills/README.md">🧩 技能庫</a> · <a href="https://github.com/Akun-python/Skigraph/issues">💬 問題回報</a></p>

> [!IMPORTANT]
> 這是編排引擎，不是科研認證服務或作業系統沙箱。測試通過與 PDF 編譯不代表科學有效或可投稿；模型、資料與領域工具仍需另行設定。修訂稿繼承與真實端到端執行仍需驗證。

## ✨ 專案概念

SkillGraph 位於 AI Agent 與 Agent Skill 之間，將複雜任務轉換為可驗證、可恢復、可觀測的工作流圖。

Agent 負責推理、工具呼叫與實際科研工作；SkillGraph 負責階段編排、輸入輸出契約、分支、循環、預算、狀態持久化與交付物驗證。

```text
使用者提示詞 → Agent 階段 → SKILL.md → 交付物契約 → 下一階段 / 品質循環
```

## SkillGraph 的運作機制

SkillGraph 將複雜任務拆成明確的狀態轉移：YAML 節點定義階段與契約；引擎解析輸入和 artifact；Agent 載入一個或多個 `SKILL.md` 並寫入檔案；`node_result.json` 提交後，系統驗證檔案、hash、schema 並選擇下一條邊。

```text
YAML 節點 → 解析輸入與 Skill → 載入 SKILL.md → Agent 寫檔案
→ node_result.json → artifact/path/schema/hash 驗證 → 下一階段或循環
```

核心原則：**Agent 產生內容，圖決定內容是否可接受以及接下來做什麼。**

### 狀態與可追溯性

每次 run 保存 workflow version、graph hash、所有 skill hash、輸入、session 與時間。每個階段有唯一 `visit_id`；每個 artifact 記錄產生節點、visit、相對路徑、大小、SHA-256 和驗證時間。下游收到的是確定路徑，不是模糊的「最新版本」。

### 多 Skill 階段

```yaml
- id: methods
  skill: experimental-design
  skills:
    - experimental-design
    - statistical-power
```

runner 會載入所有列出的 `SKILL.md`，讓實驗設計、功效分析、科學寫作與圖表設計等能力協同工作。

### 分支、循環與品質回饋

醫學流程可以分成臨床隊列與 meta-analysis；生信流程可以分成 bulk RNA-seq、單細胞與微生物組。各分支產生自己的 artifact，再透過明確輸入或 bind 匯合。

工作流宣告 review/revise 路徑，發布品質門依失敗類型返回 figures、citations、format 或 draft。修訂稿是否被所有下游正確繼承，仍需端到端驗證。

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

需要 **Node.js 22+** 與 npm；31 個已註冊 Skill 隨倉庫提供，不需額外 `.vendor` checkout。

```bash
git clone https://github.com/Akun-python/Skigraph.git
cd Skigraph
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

## 🤝 參與貢獻

歡迎透過 [Issues](https://github.com/Akun-python/Skigraph/issues) 回報最小重現案例或提交專注的 PR。提交前執行 `npm run build && npm run qa`，勿包含憑證、未授權資料或未發表稿件。

內建科學技能的來源與 MIT 授權詳見 [skills/README.md](skills/README.md) 和 [上游授權](skills/LICENSE.K-Dense.md)。

## 📄 授權條款

版權所有 © 2026 Akun-python。本專案採用 [Apache License 2.0](LICENSE)；第三方 Skill 與相依套件仍遵循各自的授權條款。
