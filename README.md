<p align="center">
  <img src="logo.png" alt="SkillGraph logo" width="760">
</p>

<h1 align="center">SkillGraph</h1>

<p align="center">
  <strong>Contract-checked orchestration for agent skills, scientific workflows, and reproducible outputs.</strong>
</p>

<p align="center">
  <a href="https://github.com/Akun-python/skill-graph">GitHub</a> ·
  <a href=".skill-workflows/README.md">Scientific paper workflows</a> ·
  <a href="LICENSE">MIT License</a>
</p>

---

## What SkillGraph Means

SkillGraph is an orchestration layer between an AI agent and the skills that the
agent uses.

An agent is good at reasoning and making decisions, but a long task becomes
fragile when every step is only an informal prompt. SkillGraph turns those steps
into a **typed, bounded, resumable graph**:

```text
User prompt
    │
    ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Agent stage  │ ───▶ │ Skill stage  │ ───▶ │ Artifact     │
│ task + input │      │ SKILL.md     │      │ contract     │
└──────────────┘      └──────────────┘      └──────────────┘
                                                  │
                                                  ▼
                                           Next stage / loop
```

The graph is the source of truth for **what happens next**, while the host agent
remains responsible for the actual scientific or engineering work. This makes a
workflow portable across Pi, an MCP client, a CLI agent, or a custom runtime.

## Understanding the Logo

The logo summarizes the architecture:

- **Agent** — the host model performs reasoning, reads context, invokes tools,
  executes code, and makes stage decisions.
- **DAG Orchestration** — YAML nodes and edges describe ordered stages,
  conditional branches, dependencies, and bounded loops.
- **Checkpoint & Resume** — every run has durable state, visit IDs, event logs,
  file locks, and resumable stages.
- **Multi-Skill Support** — one stage can load several complementary
  `SKILL.md` contracts, such as experimental design + statistical power or
  scientific writing + Mermaid diagram generation.
- **Observability** — manifests, graph hashes, skill hashes, node results,
  artifact checksums, and run events make the execution inspectable.
- **Unified Output Format** — every stage returns the same
  `node_result.json` contract and promotes declared artifacts into the graph
  state.
- **Center checkmark** — a stage advances only after its required outputs pass
  validation. The graph is not satisfied by a plausible message alone.

The circular arrows represent the most important property of a serious agent
workflow: **a failed review can return the work to an earlier stage, produce a
new artifact, and re-enter the review loop without losing provenance**.

## Core Concepts

### 1. Skill contracts

A skill is a bounded instruction package whose entry point is `SKILL.md`.
SkillGraph pins the skill file with SHA-256 at run start. If the skill changes
while a run is paused, the run refuses to continue silently.

```yaml
skills:
  - id: literature-review
    version: 1
    path: .vendor/scientific-agent-skills/skills/literature-review
    produces: [literature-review]
```

A stage can use one skill or a coordinated skill bundle:

```yaml
- id: methods
  type: agent
  skill: experimental-design
  skills:
    - experimental-design
    - statistical-power
```

The primary `skill` field remains backward-compatible; `skills` declares all
active skill contracts for the stage.

### 2. Artifact contracts

Stages do not merely return text. They declare files that must exist in the
stage output directory:

```yaml
outputs:
  - name: methods
    required: true
  - name: figures
    required: false
```

The engine checks file boundaries, relative paths, size limits, SHA-256 hashes,
and optional JSON Schemas before accepting the stage.

### 3. Explicit data flow

A downstream stage receives a path to a validated upstream artifact:

```yaml
inputs:
  research_plan: "{{artifact:scope:research_plan}}"
  dataset:
    value: "{{artifact:eda:dataset.csv}}"
    required: false
```

`required: false` is important for branch-specific artifacts. For example, a
bioinformatics draft can receive differential-expression results on a bulk
RNA-seq path and cell-marker results on a single-cell path without making either
branch pretend the other artifact exists.

### 4. Deterministic routing

Edges use explicit conditions and priorities:

```yaml
- from: methods
  to: eda
  when: 'result.decision == "quantitative"'
  priority: 20

- from: methods
  to: draft
  when: 'result.decision != "quantitative"'
  priority: 10
```

Ambiguous routes, missing routes, invalid references, and implicit cycles are
rejected before or during execution.

### 5. Loops and quality gates

A review loop is a real graph loop, not a vague instruction:

```yaml
- from: revise
  to: review
  bind:
    manuscript: "{{artifact:revise:revised_manuscript}}"
  loop:
    id: revision-cycle
    max_iterations: 3
```

The latest revision is bound into the next review, so the reviewer does not
accidentally inspect the original draft. Scientific paper workflows also use a
release gate: LaTeX compilation, page count, word count, figures, references,
and reproducibility must pass before the run reaches its terminal node.

## What This Provides

- YAML workflow graphs with deterministic routing and bounded execution.
- One or multiple active `SKILL.md` contracts per stage.
- SHA-256 skill pinning so a run cannot silently continue after a skill changes.
- Required and optional artifact contracts with path and size validation.
- JSON Schema checks for machine-readable artifacts.
- Atomic state writes, per-run file locks, manifests, and event logs.
- Checkpoint, pause, resume, retry, and bounded loop execution.
- CLI and MCP stdio adapters.
- A structured question protocol for missing or ambiguous user input.
- Scientific workflow bundles for algorithms, medical research, bioinformatics,
  surveys, experiments, LaTeX papers, figures, and PDF release gates.

## Scientific Paper Workflows

The repository includes five workflow families under
`.skill-workflows/workflows/`:

| Workflow | Purpose | Main stages |
|---|---|---|
| `paper` | General empirical research | question → literature → methods → data → statistics → figures → paper → review → LaTeX/PDF gate |
| `paper-algo` | Algorithm and ML innovation | problem → related work → method → protocol → implementation → ablation → statistics → paper |
| `paper-medical` | Clinical and evidence-synthesis studies | PICO → literature → clinical/meta branch → cohort/statistics/survival → paper |
| `paper-bioinfo` | Omics and computational biology | assay design → bulk/single-cell/microbiome branch → enrichment → figures → paper |
| `paper-survey` | Literature surveys | scope → corpus → evidence → taxonomy → synthesis → paper |

Each family is assembled from specialized skills such as:

- `hypothesis-generation`
- `literature-review`
- `experimental-design`
- `statistical-power`
- `exploratory-data-analysis`
- `statistical-analysis`
- `scientific-visualization`
- `scientific-writing`
- `peer-review`
- `citation-management`
- `venue-templates`
- `scanpy`, `scvi-tools`, `pydeseq2`, `bulk-rnaseq`
- `clinical-decision-support`, `pyhealth`, `scikit-survival`

The paper release path is designed to produce:

```text
real data / code
    → measured analysis
    → scientific figures and captions
    → long-form manuscript
    → peer review and revision loop
    → bibliography audit
    → final_paper.tex
    → Tectonic-compiled final_paper.pdf
    → release manifest
```

## Quick Start

```bash
npm install
npm run build
```

List available workflows:

```bash
node dist/cli.js list --cwd /path/to/project
```

Start a workflow and pass the returned stage context to an agent:

```bash
node dist/cli.js run research '{"topic":"agent reliability"}' --cwd /path/to/project
```

For the included scientific workflows:

```bash
node dist/cli.js run paper-algo \
  '{"prompt":"A reproducible algorithmic study of streaming heavy hitters"}'
```

The agent then:

1. loads the active skill bundle from the returned `StageContext`;
2. reads upstream artifact paths from `inputs`;
3. performs the stage work and writes declared files;
4. writes `node_result.json`;
5. submits the stage without guessing or fabricating missing outputs.

Submit a completed stage:

```bash
node dist/cli.js submit <run-id> <node-id> <visit-id>
```

Do not pass a result path from another visit. The current visit's
`node_result.json` is the canonical submission.

## Real Agent Driver

For the included scientific workflows, `scripts/agent-run.mjs` connects the
stage graph to an OpenAI-compatible model configured in
`~/.pi/agent/models.json`:

```bash
node scripts/agent-run.mjs \
  --plan paper \
  --model glm-5.3 \
  --prompt "Does temperature scaling reduce overconfidence in small neural networks?"
```

The driver loads every active `SKILL.md`, exposes bounded file and shell tools,
requires real artifacts, and routes the graph stage by stage. It never accepts
undeclared artifacts.

## LaTeX and PDF Compilation

Tectonic is the lightweight LaTeX engine used by the paper release path:

```bash
export PATH="$HOME/.local/bin:$PATH"
npm run compile-paper -- path/to/final_paper.tex
```

The compiler:

- downloads only the TeX resources required by the document;
- compiles the `.tex` source;
- emits a PDF and compilation log;
- reads the page count with `pdfinfo`;
- fails if the long-form paper is below the configured page threshold.

The final release gate also checks word count, scientific figure count, verified
references, methods/results/limitations sections, data/code availability, and
whether the page count was padded with duplicated text.

## Project Layout

```text
.skill-workflows/
  graph/skills.yaml       # skill contracts, versions, and paths
  workflows/*.yaml        # graph definitions
  README.md               # scientific workflow documentation
  runs/                    # generated state and artifacts, ignored by git

scripts/
  agent-run.mjs            # real model-driven stage runner
  audit-workflows.mjs      # static contract audit
  compile-paper.mjs        # Tectonic + PDF page gate
  smoke-paper.mjs          # content-aware graph smoke test
  validate-workflows.cjs   # routing/branch/loop validation

src/
  core/                    # graph engine, loader, state, artifacts, expressions
  adapters/                # MCP and host-agent adapters
  tests/                   # regression and workflow-contract tests

.vendor/
  scientific-agent-skills/ # optional vendored skill library, git-ignored
```

The loader also accepts `.skill-graph` as a project root. Configure roots with:

```text
SKILL_GRAPH_PROJECT_ROOTS=path1:path2
SKILL_GRAPH_USER_ROOTS=path1:path2
SKILL_GRAPH_HOME=path
SKILL_GRAPH_SKILL_PATHS=path1:path2
```

On Windows, use `;` instead of `:` in multi-path variables.

## Workflow Contract

```yaml
schema_version: 1
id: research
version: 1
mode: agent
required_inputs: [topic]
entry: topic_selection
nodes:
  - id: topic_selection
    type: agent
    skill: topic-selection
    task: Create a focused research topic plan.
    inputs:
      topic: "{{input:topic}}"
    outputs:
      - name: topic_plan
        required: true
    terminal: true
```

A stage result follows one stable shape:

```json
{
  "schema_version": 1,
  "node_id": "topic_selection",
  "visit_id": "v-123",
  "status": "success",
  "summary": "Created the research plan",
  "artifacts": [{ "name": "topic_plan", "path": "topic-plan.md" }],
  "issues": []
}
```

## CLI Commands

```text
skill-graph list
skill-graph run <workflow-id> <json-input>
skill-graph context <run-id>
skill-graph submit <run-id> <node-id> <visit-id> [result-path]
skill-graph resume <run-id>
```

## MCP Adapter

Build the package and configure an MCP client to run the stdio server:

```json
{
  "mcpServers": {
    "skill-graph": {
      "command": "node",
      "args": ["/path/to/skill-graph/dist/adapters/mcp/server.js"],
      "env": {
        "SKILL_GRAPH_CWD": "/path/to/your-project",
        "SKILL_GRAPH_PROJECT_ROOTS": "/path/to/your-project/.skill-workflows",
        "SKILL_GRAPH_USER_ROOTS": "/home/you/.skill-graph"
      }
    }
  }
}
```

The MCP server exposes:

- `workflow_list`
- `workflow_execute`
- `workflow_submit_stage`
- `workflow_resume`
- `question`

The host agent remains responsible for reading the active skill bundle, doing
the work, writing artifacts, and submitting the result. The graph engine never
pretends to execute an LLM stage itself.

## Validation and Quality Gates

Run all static and graph checks:

```bash
npm run qa
```

This performs:

```text
TypeScript check
→ unit tests
→ skill/workflow contract audit
→ branch and loop validation
```

Additional commands:

```bash
npm run audit
npm run smoke
npm test
```

The smoke harness validates routing and artifact data flow. It is not a
substitute for a real scientific run. A real paper must pass the release gate
with real data, real figures, real references, a complete LaTeX source, and a
compiled PDF.

## Security and Stability

- Workflow and skill paths are bounded to configured roots.
- A run records the graph hash and every active skill hash.
- Changed graphs or skills refuse to resume an existing run.
- Run state updates use atomic files and per-run locks.
- Budgets cap visits, agent turns, loops, stage time, and model/tool activity.
- The expression language is deliberately small and does not execute code.
- Artifact paths cannot escape the run output directory.
- API keys are read from the host environment/configuration and are never
  stored in workflow files or committed to the repository.

## License

MIT
