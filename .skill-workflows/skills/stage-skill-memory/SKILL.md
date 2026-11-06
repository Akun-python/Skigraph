---
name: stage-skill-memory
description: Persist the stage's skill versions, complete-read status, guardrails, artifact contract, downstream consumer, unresolved gates, and fallback route.
metadata:
  version: "1.0"
---

# Stage skill memory

At the start of a high-risk stage, inspect the declared skill files and record a
machine-readable `stage_skill_memory.json`. Never mark `read_complete: true` when
reading was truncated or a referenced document was not inspected completely.

The record must include:

- `stage_id`, `workflow_id`, and execution/visit identifier when available;
- each applied skill ID, version, path, read status, and last-reviewed metadata;
- applicable guardrails and prohibited shortcuts;
- required inputs, produced artifacts, and named downstream consumers;
- unresolved authorization, venue, human-verification, data, or scientific gates;
- a bounded fallback or repair route for each unresolved gate.

This artifact is an execution memory and audit aid. It is not evidence that the
scientific work is valid, that a reviewer is independent, or that a release gate
passed. Preserve it across revisits and update it rather than silently replacing
history.
