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

## SkillGraph 的运行机制

SkillGraph 不会把复杂任务塞进一次非结构化对话，而是把任务转换成一系列显式状态转移。每个状态转移包含四步：

1. **阶段定义**：YAML 节点声明 task、active skill bundle、inputs、required outputs、访问上限和 decision。
2. **上下文解析**：引擎把输入和 artifact 引用解析到前序阶段产生的具体文件；缺少必需输入会停止运行，分支输入可以标记为 optional。
3. **Agent 执行**：宿主 Agent 加载当前阶段的一个或多个 `SKILL.md`，调用工具完成工作，并在 output directory 写入文件。
4. **契约提交**：Agent 提交 `node_result.json`；引擎验证文件、计算 hash、记录状态、选择下一条边，验证通过后才激活下一阶段。

```text
YAML 节点 → 解析输入和 Skill → 加载 SKILL.md → Agent 写文件
→ node_result.json → artifact/path/schema/hash 校验 → 下一阶段或受限循环
```

核心原则是：**Agent 负责生成内容，图负责判断内容是否合格以及下一步做什么。**

### 状态与可追溯性

每次运行保存 workflow version、graph hash、active skill hashes、输入、session 和时间戳。每个阶段有唯一 `visit_id`，每个 artifact 记录生产节点、visit、相对路径、大小、SHA-256 和校验时间。因此下游阶段得到的是确定文件路径，而不是模糊的“最新稿件”。

### 契约而不是提示词约定

- `inputs` 定义阶段允许消费的内容；
- `outputs` 定义必须生成的文件；
- artifact 校验路径边界、文件存在性、大小和 schema；
- `decision` 驱动显式分支；
- `priority` 决定竞争边；
- loop 限制迭代次数并要求输入发生变化；
- release gate 在完成前校验 PDF、图表、引用和可复现性。

### 一个阶段加载多个 Skill

```yaml
- id: methods
  type: agent
  skill: experimental-design
  skills:
    - experimental-design
    - statistical-power
```

runner 会把列表中的所有 `SKILL.md` 注入当前阶段，使实验设计和功效分析、科学写作和图表设计等能力能够协同工作。

### 分支、循环与质量反馈

医学流程可以分成临床队列分析和 meta-analysis；生信流程可以分成 bulk RNA-seq、单细胞和微生物组。各分支产生自己的 artifact，再通过显式输入或 bind 汇合。

同行评审可以把修订稿送回 review；发布质量门失败时可以退回 draft。下一次 visit 会使用新 artifact 路径，不会误读旧版本。

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
