#!/usr/bin/env node
/** Deterministic development-loop policy. Input assessments must be evidence-backed;
 * this policy does not establish scientific validity or execute experiments. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function decideExperiment(s) {
  if (!s || s.schema_version !== 1) throw new Error('Expected controller state v1');
  for (const k of ['round', 'max_rounds', 'stagnation_rounds', 'patience']) {
    if (!Number.isSafeInteger(s[k]) || s[k] < (['max_rounds', 'patience'].includes(k) ? 1 : 0)) throw new Error(`Invalid ${k}`);
  }
  for (const k of ['hard_gates_pass', 'needs_input', 'budget_exhausted', 'test_used_for_selection']) {
    if (typeof s[k] !== 'boolean') throw new Error(`Invalid ${k}`);
  }
  if (!['method', 'tuning', 'execution', 'none'].includes(s.repair)) throw new Error('Invalid repair');
  if (!Array.isArray(s.issues) || !Array.isArray(s.history)) throw new Error('Missing ledger/history');
  const ids = new Set();
  for (const i of s.issues) {
    if (!i.id || ids.has(i.id) || !['critical','major','minor'].includes(i.severity) || !['open','resolved','scope-reduced'].includes(i.status) || !i.owner_stage || !i.acceptance_criterion || !Array.isArray(i.evidence_ids)) throw new Error('Invalid issue ledger');
    ids.add(i.id);
  }
  if (s.test_used_for_selection || s.needs_input) return 'needs_input';
  const open = s.issues.some(i => i.status === 'open' && i.severity !== 'minor');
  // Valid negative results may be ready; beating a baseline is not a gate.
  if (s.hard_gates_pass && !open && s.repair === 'none') return 'ready';
  if (s.budget_exhausted || s.round >= s.max_rounds) return 'budget_exhausted';
  if (s.stagnation_rounds >= s.patience) return 'stalled';
  if (s.repair === 'none') return 'needs_input';
  return `repair_${s.repair}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [, , input, output] = process.argv;
  if (!input || !output) throw new Error('Usage: node scripts/experiment-controller.mjs state.json decision.json');
  const state = JSON.parse(readFileSync(input, 'utf8'));
  writeFileSync(output, JSON.stringify({schema_version: 1, decision: decideExperiment(state), state}, null, 2) + '\n');
}
