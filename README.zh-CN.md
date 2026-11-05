<p align="center">
  <img src="logo.png" alt="SkillGraph logo" width="360">
</p>

<h1 align="center">SkillGraph</h1>

<p align="center"><strong>面向 Agent Skill、科研工作流与可复现交付物的契约检查编排引擎。</strong></p>

<p align="center">语言：<a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a></p>

## 项目概念

SkillGraph 位于 AI Agent 与 Agent Skill 之间，负责把复杂任务转换成可验证、可恢复、可观测的工作流图。

Agent 负责推理、调用工具和完成实际科研工作；SkillGraph 负责阶段编排、输入输出契约、分支、循环、预算、状态持久化和产物校验。

```text
用户提示词 → Agent 阶段 → SKILL.md → 交付物契约 → 下一阶段 / 质量循环
```

## Logo 含义

- **Agent**：执行推理、工具调用、代码运行与阶段任务。
- **DAG Orchestration**：通过 YAML 节点和边编排阶段、依赖和条件分支。
- **Checkpoint & Resume**：保存 run 状态、visit、事件和 artifact，支持暂停与恢复。
- **Multi-Skill Support**：一个阶段可以同时加载多个互补的 `SKILL.md`。
- **Observability**：记录 graph hash、skill hash、artifact checksum 和事件日志。
- **Unified Output Format**：所有阶段使用统一的 `node_result.json` 契约。
- **中心勾选**：只有必需交付物通过校验，工作流才会推进。

## 核心能力

- YAML 工作流图和确定性路由。
- 单 Skill 或多 Skill 阶段。
- SHA-256 Skill 固定，防止运行中 Skill 被静默替换。
- 必需/可选 artifact、JSON Schema、路径和文件大小校验。
- 原子状态写入、文件锁、manifest 和事件日志。
- 暂停、恢复、重试和有上限的质量循环。
- CLI 与 MCP stdio 适配器。
- 缺少信息时的结构化提问协议。
- 科研论文、算法、医学、生信和综述工作流。

## 科研论文工作流

| 工作流 | 用途 |
|---|---|
| `paper` | 通用实证研究 |
| `paper-algo` | 算法和机器学习创新 |
| `paper-medical` | 临床研究和证据综合 |
| `paper-bioinfo` | 组学和生物信息学 |
| `paper-survey` | 文献综述和领域调研 |

论文闭环：

```text
研究问题 → 文献 → 方法 → 数据/实验 → 统计 → 科学图表
→ 长篇论文 → 同行评审 → 修订循环 → 引用审计
→ LaTeX → Tectonic PDF → 发布质量门
```

## 安装与运行

```bash
npm install
npm run build
node dist/cli.js list
```

启动工作流：

```bash
node dist/cli.js run paper-algo '{"prompt":"研究一个可复现的流式算法"}'
```

真实 Agent 驱动：

```bash
node scripts/agent-run.mjs \
  --plan paper \
  --model glm-5.3 \
  --prompt "Does temperature scaling reduce overconfidence in small neural networks?"
```

## LaTeX 与 PDF

```bash
export PATH="$HOME/.local/bin:$PATH"
npm run compile-paper -- path/to/final_paper.tex
```

编译工具会生成 PDF、读取页数，并在论文过短时失败。科研工作流还会检查图表、引用、方法、结果、限制、可复现性和数据代码说明。

## 质量检查

```bash
npm run qa
npm run audit
npm run smoke
npm test
```

## 项目结构

```text
.skill-workflows/
  graph/skills.yaml
  workflows/*.yaml
  README.md

scripts/
  agent-run.mjs
  audit-workflows.mjs
  compile-paper.mjs
  smoke-paper.mjs
  validate-workflows.cjs

src/core/
  engine.ts
  workflow-loader.ts
  artifact-store.ts
  state-store.ts
```

## 安全与稳定性

- 工作流和 Skill 路径限制在配置根目录内。
- 每次运行记录 graph hash 和全部 Skill hash。
- graph 或 Skill 修改后，旧 run 不会静默恢复。
- 状态写入使用原子文件和文件锁。
- visit、agent turn、loop、时间和工具调用均有预算限制。
- artifact 不能逃逸当前 run 的输出目录。
- API key 不写入 workflow，也不提交到仓库。

## License

MIT
