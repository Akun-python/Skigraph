# skill-graph Paper Pipelines

Five `skill-graph` workflows that turn a one-line research prompt into a
complete paper package, built on the
[scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills)
`SKILL.md` contracts.

- Skill contracts: `skills/<id>/SKILL.md` (bundled in this repository)
- Skill registry: `.skill-workflows/graph/skills.yaml` (32 skills)
- Workflows: `.skill-workflows/workflows/*.yaml`

| Workflow | Use for | Nodes | Branches |
| --- | --- | --- | --- |
| `paper` | general empirical study (ML, HCI, applied) | 11 | `methods.decision`: `quantitative` / `qualitative` |
| `paper-algo` | algorithm / theory innovation (NeurIPS, ICML, STOC) | 14 | review loop only |
| `paper-medical` | clinical research | 16 | `design.decision`: `clinical` / `meta` |
| `paper-bioinfo` | omics analysis | 14 | `design.decision`: `bulk` / `single-cell` / `microbiome` |
| `paper-survey` | literature survey / review paper | 10 | review loop only |

Every workflow ends in `format` (`terminal: true`), which writes `final_paper.md`
plus a submission checklist (venue formatting, reporting guidelines).

## Pipeline Shapes

```text
paper
  scope -> literature -> methods -> eda -> stats -> figures -> draft
                          \-> draft (qualitative)
  -> review -> (revise -> review) -> citations -> format

paper-algo
  idea -> related -> approach -> protocol -> implement -> eda -> ablation
       -> stats -> figures -> draft -> review -> (revise -> review)
       -> citations -> format

paper-medical
  question -> literature -> design -> power -> cohort -> stats -> survival -> figures
                                       \-> meta_evidence -> meta_synthesis
  -> draft -> review -> (revise -> review) -> citations -> format

paper-bioinfo
  design -> bulk     -> bulk_de   \
         -> sc       -> sc_integrate -> enrichment -> figures
         -> mb       -> mb_stats   /
  -> draft -> review -> (revise -> review) -> citations -> format

paper-survey
  scope -> literature -> evidence -> taxonomy -> outline -> draft
  -> review -> (revise -> review) -> citations -> format
```

`review` emits `decision = "accept" | "revise"`. On `revise` the edge back to
`review` carries `loop: revision-cycle` (max 3 iterations) and rebinds the
manuscript, so the second review reads the revised text, not the draft.
Branch decisions live in the node result (`"decision": "meta"`, etc.) and are
matched by priority in the YAML edge table.

## Run With A Real Agent

skill-graph only reserves the stage, validates the result, and routes the
graph. The host agent does the research and writing.

```bash
npm run build
node dist/cli.js list          # workflows and graph hashes
node dist/cli.js run paper-medical '{"prompt":"Does SGLT2 inhibitor use reduce heart-failure hospitalisation?"}'
```

The returned `StageContext` gives the agent:

- `skill.filePath` - the `SKILL.md` contract to load
- `inputs` - resolved `prompt` / upstream artifact contents
- `requiredOutputs` - files that must be written
- `resultPath` and `outputDirectory`

Artifacts go to:

```text
.skill-workflows/runs/<run-id>/stages/<node-id>/visits/<visit-id>/outputs/
```

When the stage is done:

```bash
node dist/cli.js submit <run-id> <node-id> <visit-id>
```

Do not pass a `result-path`; the engine submits the current visit's
`node_result.json` and rejects anything else. If the node is a decision point,
include `decision`:

```json
{
  "schema_version": 1,
  "node_id": "design",
  "visit_id": "v-...",
  "status": "success",
  "summary": "retrospective cohort, SGLT2i vs DPP4i, HF hospitalisation",
  "artifacts": [
    { "name": "study_protocol", "path": "study_protocol.md" },
    { "name": "study_protocol", "path": "study_protocol.json" }
  ],
  "issues": [],
  "decision": "clinical"
}
```

Interrupted runs: `node dist/cli.js resume <run-id>` (only `paused` / `blocked`).

For an MCP-based agent, add the stdio adapter (see the root README) and use
`workflow_execute` / `workflow_submit_stage`.

## Graph-Only Validation

`scripts/validate-workflows.cjs` walks every workflow with simulated artifacts
to check routing, branch selection, loop counting, artifact contracts and
budgets - no tokens, no research:

```bash
node scripts/validate-workflows.cjs                          # all 9 plans
node scripts/validate-workflows.cjs --plan paper-medical-meta
node scripts/validate-workflows.cjs --workflow paper-bioinfo  # all 3 assays
node scripts/validate-workflows.cjs --plan paper-algo --keep   # keep run dir
```

Current matrix (all green):

| Plan | Workflow | Nodes | Artifacts |
| --- | --- | --- | --- |
| `paper` | paper | 11 | 15 |
| `paper-qualitative` | paper | 7 | 10 |
| `paper-algo` | paper-algo | 14 | 22 |
| `paper-medical-clinical` | paper-medical | 13 | 21 |
| `paper-medical-meta` | paper-medical | 9 | 16 |
| `paper-bioinfo-bulk` | paper-bioinfo | 10 | 18 |
| `paper-bioinfo-single-cell` | paper-bioinfo | 9 | 16 |
| `paper-bioinfo-microbiome` | paper-bioinfo | 9 | 16 |
| `paper-survey` | paper-survey | 10 | 19 |

The simulator asserts the exact node sequence per plan, so an accidental edge
change (wrong branch, missing loop, unreachable terminal) fails loudly.
Simulated runs are deleted unless `--keep` is passed.

Engine regression tests: `npm test` (expression parser: `&&` / `||` chains,
`loop.*` resolution, reference allow-list; workflow loader: optional-input
parsing across all five pipelines).

## Static Audit

`scripts/audit-workflows.mjs` checks every pipeline against the skill
contracts in `graph/skills.yaml` - no tokens, no agent:

```bash
node scripts/audit-workflows.mjs          # 5 checks across 5 workflows
node scripts/audit-workflows.mjs --verbose  # per-node produce/consume table
```

Checks (all currently green):

1. every `node.skill` is registered in `graph/skills.yaml`
2. every node `output` is covered by the skill's `produces` contract
   (extension-insensitive + alias table)
3. every *required* `{{artifact:prod:name}}` input must exist on every path
   reaching the consumer; branch-only artifacts must be declared
   `required: false` (warnings guide this)
4. every mandatory output must be consumed downstream or be a data/code
   artifact shipped with the paper (no dead deliverables)
5. the engine still injects `Read <SKILL.md> before doing this stage` into
   every stage task (grep of `src/core/engine.ts`)

Run everything with `npm run qa` (type-check + unit tests + audit + simulator).

## Editing A Workflow

Rules the loader enforces, learned the hard way:

- every `node.skill` must be registered in `graph/skills.yaml`
- inputs may only reference `{{input:<name>}}`, `{{artifact:<node>:<name>}}`,
  `{{result:<node>:<field>}}`
- an input entry may be `name: "{{artifact:...}}"` (required, any empty value
  fails the run) or `name: { value: "{{artifact:...}}", required: false }`
  (skipped silently when the artifact is absent - used for branch results
  like DE tables reaching `draft`/`figures` only on the assay path that
  produced them)
- a downstream node may only reference artifacts that exist on **every** path
  reaching it; branch-specific results must be declared `required: false`
  (this is why `draft`/`figures` take assay results as optional inputs)
- give the default edge the **lowest** priority; two matching edges with equal
  priority fail with `ambiguous_route`
- `when` supports `result.<field>`, `loop.<field>`, `.length`, string literals,
  numbers, `true/false/null`, `== === != !== > >= < <=`, `&& || !`, parentheses
- loop edges need a `bind` that changes the next input, otherwise the engine
  aborts with `input_repeat`

## Notes

- Workflow dependencies are bundled under `skills/`, including the local
  Apache-2.0 contracts. The upstream K-Dense checkout under `.vendor/` is
  optional and git-ignored; it is useful only for refreshing vendored skills.
- Bundled third-party skill metadata and the K-Dense MIT license are retained
  under `skills/`.
- Skill hashes are pinned in `manifest.json` at run start; edits to a skill
  require a fresh run.
- Workflow and graph YAML edits are picked up by fresh runs; active runs keep
  their original graph hash.
