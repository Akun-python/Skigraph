---
name: algorithm-research-loop
description: Evidence-backed, bounded algorithm development, tuning, experiment diagnosis and stopping policy.
license: Apache-2.0
---

# Algorithm research loop

Use with experimental-design, an implementation skill appropriate to the problem,
statistical-analysis and scientific-critical-thinking. Read each complete skill.
Scikit-learn is a tabular ML option, not a requirement for streaming, numerical,
graph or systems algorithms; implement the actual method in its appropriate stack.
Do not install a skill's recommended versions and report them as measured versions.

## Freeze before running

Record research question, falsifiable mechanisms, practical effect threshold,
primary metric direction, constraints, seeds, independent units, dataset checksums,
train/development/validation/test assignments, grouping/time rules, search space,
search budget per method, stopping patience and total resource budget. All fitted
preprocessing stays within training folds. Adaptation uses development/validation
only (inner folds for nested CV). Outer evaluation/final test is not feedback.
Already observed evaluation data cannot be relabelled unseen; use exploratory
status or obtain genuinely untouched evaluation data. Never claim preregistration
retroactively. Protocol amendments require a reason and a new version.

## Execute a claim-linked matrix

Each row has ID, family, method/config/seed/split, code/protocol/data hashes,
command, environment, status, raw result path and measured units. Include:

- comparison: naive and credible strong baselines with matched data and fair
  tuning/compute budgets, plus published numbers separately labelled;
- ablation: remove/replace claimed components, full/minimal anchors, interactions
  where justified; do not call preprocessing alone an algorithm innovation;
- sensitivity: prespecified parameter ranges, validation response, boundary/failure
  cases, including failed settings; do not select on test response curves;
- efficiency: measured train/inference time, peak memory and relevant input sizes,
  hardware/threads/batch size, warmup, repetitions and accelerator synchronization.
  Complexity analysis is not a measured runtime; unknown FLOPs remain unknown.

Every required family is either measured or explicitly not_run/not_applicable
with scope justification. Missing evidence blocks its claim. A negative result can
be scientifically ready; do not search until superiority or significance appears.

## Diagnose and repair

Write stable issue IDs, severity (critical/major/minor), category, owner_stage,
acceptance_criterion, evidence_ids and status (open/resolved/scope-reduced).
Distinguish implementation bugs, leakage, solver failure, under-tuned baselines,
overfitting, mechanism failure, sensitivity and efficiency bottlenecks.
Each proposed change has a mechanism, a refuting validation experiment, cost,
acceptance rule and affected claims. Change one interpretable factor or document
interactions. Preserve unsuccessful candidates and exact executable source.

Route mechanism changes to method improvement (then amend protocol), parameter
search to tuning (then implement), execution bugs/missing rows to implementation.
Every new run regenerates evidence audit, EDA, ablation analysis and statistics
before diagnosis; never consume old downstream figures/manuscripts as new evidence.
Revision artifacts are mandatory feedback inputs on revisits, not optional prose
that no later node reads. Keep cumulative controller history in each visit.

## Controller contract

Emit experiment_state.json and run:

    node scripts/experiment-controller.mjs experiment_state.json experiment_decision.json

State v1 fields: schema_version=1, round (0-based repair count), max_rounds (at
most 3 in this workflow), stagnation_rounds, patience, hard_gates_pass, needs_input,
budget_exhausted, test_used_for_selection, repair (method/tuning/execution/none),
issues, history. History entries retain content hashes of executable source,
protocol, raw results and normalized unresolved issues, validation metric/change,
acceptance results, cost and candidate ID. A new visit/path/timestamp is not
progress. Increment stagnation when evidence/acceptance does not materially change;
justify resets with measured validation evidence, not narrative edits.

Copy the script's decision exactly to node_result.json. ready means evidence is
sufficient for scoped writing, NOT accepted, optimal or release-ready. Other exits:
stalled, needs_input, budget_exhausted stop without drafting or claiming success.
Test-guided selection requires needs_input, not a fresh random split of the same
observed data. Hard gates cannot be averaged away. Retain best valid candidate by
frozen validation objective and constraints, recording explicit rollback if a new
candidate regresses; never pick the best by test performance. This skill does not
provide engine-level automatic rollback or invalidate historical artifacts.
