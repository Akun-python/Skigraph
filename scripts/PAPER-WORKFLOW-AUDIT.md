# WDBC draft audit and paper-algo workflow changes

## Scientific status

The existing WDBC export is an 11-page exploratory draft, not a released paper.
It compares unscaled and training-fold-standardized logistic regression on one
569-row public dataset with five stratified folds and fixed C=1. Mean accuracy
is approximately 0.952585 versus 0.977177; malignant F1 0.934495 versus 0.968614;
AUC 0.992534 versus 0.995048. AUC decreases in one fold. These descriptive
comparisons do not establish algorithmic novelty, clinical validity, or an
isolated causal effect of standardization: fixed C changes the effective L2
penalty geometry, and cross-validation training sets overlap.

Blocking items remain: verified citation metadata and dataset reuse terms,
complete reproduction/environment details and solver diagnostics, figure
embedding/provenance and axis presentation, and closure of major review items.
No workflow edit resolves these scientific deficiencies by itself.

## Engineering corrections

- Insert an evidence audit between implementation and interpretation; require a
  machine-readable provenance ledger and explicit missing-evidence report.
- Carry raw benchmark summaries and machine-readable analysis into writing,
  review and revision instead of passing prose alone.
- Declare vector figures and their generator as required artifacts; pass actual
  figure paths into drafting, review, revision and formatting.
- Permit empirical baseline questions without inventing novelty; prohibit
  retroactive preregistration and unsupported independent-fold inference.
- Require review-item dispositions and retain unresolved issues/draft status.
- Replace universal page/word quotas in the algorithm release gate with
  venue-appropriate substantive checks. Compilation is not scientific approval.
- Audit every registered skill in multi-skill nodes and union their contracts.

The evidence ledger is currently an agent-produced contract, not a general
machine verifier of scientific truth. Static audit and simulated routing only
check wiring and artifact contracts; they do not inspect scientific validity.
The other four workflow release policies have not been changed in this patch.

## Bounded algorithm development (first increment)

`paper-algo` now routes statistics through `experiment_diagnosis` before plotting.
Method repair returns through `method_improvement → protocol → implement`;
tuning/execution repair returns to implementation. All reruns traverse evidence
audit, EDA, ablation interpretation and statistics again. Protocol exports the
current method so downstream writing does not silently use the original method.
The local Apache-2.0 skill specifies comparison/ablation/sensitivity/efficiency
and applicable robustness measurements, development-only selection, stable issue
IDs, cumulative candidate history and negative-result acceptance.

`experiment-controller.mjs` validates the basic state and deterministically
selects directed repair, ready, stalled, needs_input or budget_exhausted. Stops
route to a distinct report rather than the release branch. Tests include method
and tuning routing, hard gates, test-selection contamination and bounded exits.
The routing plan exercises method repair followed by tuning before readiness.

Limits: the agent still supplies gate assessments, history, stagnation counts and
repair count. The engine does NOT yet enforce content hashes, semantic issue
closure, aggregate repair budget, automatic invalidation or best-candidate rollback.
No custom JSON artifact schema or submit-time correspondence check yet forces the
node decision to equal the controller output. Existing per-edge loop limits remain
a backstop that can raise loop_limit, not a successful scientific stop. Terminal
experiment_stop means graph traversal completed, not research/release success;
consumers must inspect its report. Peer-review experimental defects are not yet
machine-routed upstream. These are remaining implementation requirements, not
features established by the simulated run. No new WDBC experiments were run.

## Existing runs

Runs pin their workflow graph and skill hashes. These edits apply to new runs;
they do not insert an evidence audit retroactively into the WDBC run paused at
`revise`. Do not edit its state to manufacture a missing upstream visit. Start a
new audited run and import verified existing measurements through declared
artifacts, or explicitly design and test a migration before resuming it.
The current draft and its review outcome remain unchanged.

## Checks

Run `npm run build`, `npm test`, `npm run audit`,
`node scripts/validate-workflows.cjs`, and `git diff --check`.
The routing validator uses mock artifacts and is not a paper-generation test.
