# Figure and stage-skill audit

Status: design audit; not a scientific validation or release approval.

## Claim-to-figure inventory for `paper-algo`

| Claim/evidence family | Required source | Honest visual | Required metadata | Current gap |
|---|---|---|---|---|
| Primary measured comparison | `stats:analysis_report.json`, raw result rows | Main comparison figure or table | claim ID, estimator, unit, aggregation, source pointers | Existing contract names a figure but does not require a machine-readable inventory or claim binding |
| Paired/resampled contrast | raw paired rows, fold/seed identifiers | Paired points/lines or contrast distribution; table when n is small | dependent-resample warning, zero reference, exact n | Existing figure requirement does not require the dependence warning or source-row IDs |
| Variation/robustness | seed/fold-level results and protocol | descriptive range/point plot; no CI unless justified | SD/range vs CI label, replication unit, transform | Existing contract permits a range panel but does not require explicit statistical semantics |
| Ablation/mechanism | executed ablation matrix | ablation plot/table only if measured | component mapping, matched budget, failure cases | Existing `ablation_report` is consumed but no figure claim linkage is required |
| Data/process/provenance | dataset manifest, split/preprocessing records | flow/provenance diagram or table | checksum, exclusions, train-only transforms | No required provenance figure/table or machine-readable source map |
| Negative/unavailable evidence | failed/not-run/limit-hit records | explicit table or annotation; never fabricated plot | status and reason | No contract requires unavailable results to remain visible |

## Stage memory requirements

Each high-risk stage must persist a small `stage_skill_memory.json` artifact. It records:

- skill IDs and pinned versions;
- whether each `SKILL.md` was read completely (false if tool output was truncated);
- applicable guardrails and prohibited shortcuts;
- artifact contract and downstream consumer;
- unresolved human/policy checks;
- fallback/repair route.

This memory is an execution record, not proof that the underlying scientific work is valid.

## Required gates

1. **Figures:** every figure has `claim_id`, source artifact(s), source row/query, transformation record, units, uncertainty meaning, limitations, generator, static fallback, and downstream consumer. Missing measured evidence must route to a table or an open issue.
2. **Writing:** every numeric/factual result is bound to evidence IDs; unresolved claims remain unresolved; post-hoc and dependent-resample labels are retained.
3. **Review:** authorization/confidentiality status is recorded; review is labelled internal/agent-assisted and never treated as editorial acceptance; claims, figures, statistics, reproducibility, and open issues are checked.
4. **Compile/release:** native compile and visual checks are separate from scientific gates; provenance, citation, human approval, venue policy, AI disclosure, and unresolved major issues are fail-closed.

## Scope decision

The next implementation adds persistent memory and explicit figure/provenance contracts to the algorithm workflow first, then reuses the same registered local contracts in the other paper workflows. It does not increase figure count mechanically and does not make a release decision.
