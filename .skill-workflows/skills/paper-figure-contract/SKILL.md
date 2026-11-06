---
name: paper-figure-contract
description: Claim-driven 6–10 main-text scientific figures with provenance, evidence-gap routing, and downstream verification.
---

# Paper figure contract

Apply alongside scientific-visualization, not instead of it. Read that skill and the applicable references completely; record incomplete reads honestly. This contract applies to figures, draft, review, revise, format and release_gate.

## Scientific target

Deliver **6–10 distinct main-text figures**, each answering a different scientific question. Count numbered figure objects, not panels, exports, tables, repeated plots, logos, appendix figures or filenames. Ten is a planning target ceiling, not grounds to discard necessary evidence. A venue conflict requires an explicit author-approved plan; never silently waive the minimum. If evidence supports fewer than six, keep decision `revise`/`needs_input`, write `figure_gap_report.md` naming missing evidence and route to protocol/analysis/literature retrieval. Do not invent experiments, intervals, patient predictions, subgroup results, or decorative figures to satisfy a quota.

Suggested roles (only when supported): design/data flow; sampling/QC; primary outcome; paired/controlled comparison; heterogeneity/dependence; sensitivity/ablation; optimization/failure analysis; evidence/coverage map. For surveys, use source-coded taxonomy, coverage, timeline, comparison, bias and gap maps instead of fabricated experimental plots. Clinical synthesis uses actual search flow, study characteristics, effect/heterogeneity and certainty data; survival and funnel plots require suitable measured inputs. Bioinformatics uses the executed branch only, not plots from unexecuted modalities.

## Figure-producing stage

Emit required artifacts `figures` (figures.md), `figure_inventory.json`, `figure_provenance.json`, `figure_gap_report.md` (explicitly empty if no gaps), and `stage_skill_memory.json`. Declare every asset and generator as a dynamic artifact in node_result.json; prose or a file inside an unregistered folder is not artifact submission. Each inventory record has:

- `figure_id`, `label`, `main_text` boolean, `question`, `claim_ids`;
- `file`, `caption`, `alt_text`, `data_alternative`, `generator`, `regenerate`;
- provenance record keyed by figure_id: input paths and SHA-256, exact rows/columns, exclusions/missing policy, transformations, seeds, units, sample sizes and dependence, interval meaning (or none), output hash and dimensions;
- `human_review: pending|passed|failed`, `venue_compliance: pending|passed|failed` plus reviewer/date/scope when assessed.

Retain raw observations and negative/tied outcomes. No default error bars or CI for dependent CV folds. Use redundant marker/line/direct-label encoding, honest baselines, explicit transforms and inspect exports at final physical size. Static fallback and accessible data are required; interactive output is optional and separate. Cite material visualization software/skill contributions, verifying reference metadata before insertion; unverified attribution remains open.

## Downstream consumers

Draft: consume inventory, provenance, gap report, skill memory and actual assets. Embed 6–10 distinct main-text figures with labels, full captions and prose references explaining each question/result/limitation. No unused figure warehouse.

Review/revise: inspect data-to-claim alignment, non-redundancy, scales, dependence, uncertainty, exclusions and all exceptions. Compare inventory to manuscript and rendered figures. Persist unresolved scientific/visual/accessibility issues. A new plot of old evidence cannot close a missing experiment. Route evidence gaps upstream; layout fixes go to figures/format. Never treat count checks as scientific acceptance.

Format: materialize all declared assets locally; embed each main-text item with caption, unique label and prose reference before appendix. Compile after the final source edit. Record source/PDF/asset hashes and compiler log. Emit `figure_audit.json` with expected vs actual main-text objects, paths/hashes, labels/references, discrepancies and human inspection status. Missing assets, fewer than six, stale hashes or unresolved gaps block completion. Run `node scripts/audit-paper-figures.mjs final_paper.tex figure_inventory.json figure_provenance.json`; its structural result is NOT scientific or visual approval.

Release_gate: consume figure_audit, inventory, provenance, gap report and skill memory plus actual final TeX/PDF/assets. Independently verify 6–10 main-text objects, rendered captions/references, final-size readability, accessible alternatives, reuse and exact venue rules. Mechanical audit, compile, copying or stage success alone does not pass this gate. Keep human review pending unless actually performed. No publishing or pushing without approval.
