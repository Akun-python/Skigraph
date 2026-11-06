# Bounded publication repair routes

This increment adds targeted final-gate repair routes to all five paper workflows.

| Gate decision | Repair target | Bound |
|---|---|---|
| revise | draft | 2 |
| revise_figures | figures (survey: outline/visual plan) | 2 |
| revise_citations | citations | 2 |
| revise_format | format | 2 |
| pass | release_pass | no repair |

Every repair edge binds the actual release_gate_report artifact. Repair tasks consume it; workflow-wide visit/turn/time budgets remain active. Revision-to-review retains its existing three-iteration bound. General and clinical figures now tolerate unavailable branch-specific inputs and consume the applicable literature/methods or meta-analysis evidence instead. Missing evidence still requires needs_input, never fabricated output.

The generic workflow no longer treats 15–25 pages or 8,000 words as publication readiness. Native compilation and selected-venue requirements govern formatting; a fallback PDF is not submission-ready.

## Limits and remaining work

These are graph routing and task-contract improvements, not proof of research validity or submission readiness. Unit tests check decision exclusivity, targets, report bindings and loop bounds. The workflow validator exercises synthetic routing, not real research.

Remaining work includes engine-enforced content/hash-based release checks; a persistent cross-stage issue ledger; stagnation detection outside the experiment controller; upstream experiment/statistics/literature repair routes; dependency invalidation and rollback; ensuring repaired citations or scientific edits trigger renewed review; and real end-to-end execution of each repair path. Human authorship, ethics, licenses, venue/AI policy and submission authorization remain mandatory unresolved checks until actually verified.

The WDBC draft remains REVISE. These workflow changes neither execute sensitivity experiments nor fix its figure inventory or missing scientific evidence.
