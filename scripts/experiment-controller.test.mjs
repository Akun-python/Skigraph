import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideExperiment } from './experiment-controller.mjs';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
const base = {schema_version:1, round:0, max_rounds:3, stagnation_rounds:0, patience:2, hard_gates_pass:false, needs_input:false, budget_exhausted:false, test_used_for_selection:false, repair:'execution', issues:[], history:[]};
test('directed development repairs', () => {
  for (const repair of ['method','tuning','execution']) assert.equal(decideExperiment({...base, repair}), `repair_${repair}`);
});
test('negative results need not beat baseline to be ready', () => {
  assert.equal(decideExperiment({...base, hard_gates_pass:true, repair:'none'}), 'ready');
});
test('hard gates and unresolved major issues cannot be averaged away', () => {
  assert.equal(decideExperiment({...base, repair:'none'}), 'needs_input');
  const issues = [{id:'leakage',severity:'critical',status:'open',owner_stage:'protocol',acceptance_criterion:'disjoint units',evidence_ids:[]}];
  assert.equal(decideExperiment({...base,hard_gates_pass:true,repair:'none',issues}), 'needs_input');
});
test('test selection, stagnation and budget stop without success', () => {
  assert.equal(decideExperiment({...base,test_used_for_selection:true}), 'needs_input');
  assert.equal(decideExperiment({...base,stagnation_rounds:2}), 'stalled');
  assert.equal(decideExperiment({...base,round:3}), 'budget_exhausted');
  assert.equal(decideExperiment({...base,budget_exhausted:true}), 'budget_exhausted');
});
test('workflow declares repair feedback and bounded non-release exits', () => {
  const graph = yaml.load(readFileSync('.skill-workflows/workflows/paper-algo.yaml', 'utf8'));
  const node = id => graph.nodes.find(n => n.id === id);
  assert.equal(node('implement').inputs.method_description, '{{artifact:protocol:method_description}}');
  assert.ok(node('implement').inputs.prior_state);
  assert.ok(node('experiment_diagnosis').inputs.prior_state);
  assert.ok(node('experiment_stop').terminal);
  assert.ok(graph.edges.some(e => e.from === 'experiment_diagnosis' && e.to === 'experiment_stop'));
  assert.ok(graph.edges.some(e => e.from === 'method_improvement' && e.to === 'protocol' && e.bind.prior_state));
  assert.ok(graph.edges.some(e => e.from === 'stats' && e.to === 'experiment_diagnosis'));
  assert.equal(node('draft').inputs.method_description, '{{artifact:protocol:method_description}}');
});
test('malformed state fails closed', () => {
  assert.throws(() => decideExperiment({...base,round:NaN}));
  assert.throws(() => decideExperiment({...base,hard_gates_pass:'yes'}));
});
