import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadWorkflow } from '../core/workflow-loader.js';
import { evaluateExpression } from '../core/expression.js';

const cwd = fileURLToPath(new URL('../..', import.meta.url));
for (const workflowId of ['paper', 'paper-algo', 'paper-bioinfo', 'paper-medical', 'paper-survey']) {
  test(`${workflowId}: release repairs are targeted, report-bound and bounded`, async () => {
    const graph = await loadWorkflow({ cwd, workflowId });
    const gate = graph.nodes.find(n => n.id === 'release_gate')!;
    const routes = graph.edges.filter(e => e.from === 'release_gate');
    const cases = {
      pass: 'release_pass', revise: 'draft',
      revise_figures: workflowId === 'paper-survey' ? 'outline' : 'figures',
      revise_citations: 'citations', revise_format: 'format',
    };
    for (const [decision, target] of Object.entries(cases)) {
      const matches = routes.filter(e => !e.when || evaluateExpression(e.when, { result: { decision }, loop: {} }));
      assert.equal(matches.length, 1, decision);
      const edge = matches[0]!;
      assert.equal(edge.to, target);
      if (decision === 'pass') continue;
      assert.ok(edge.loop && edge.loop.maxIterations <= 3);
      assert.ok(Object.values(edge.bind ?? {}).includes('{{artifact:release_gate:release_gate_report}}'));
      const repair = graph.nodes.find(n => n.id === target)!;
      assert.match(repair.task, decision === 'revise' ? /gate_report/ : /release_gate_report/);
      assert.match(gate.task, new RegExp(decision));
    }
    for (const decision of ['needs_input', 'stalled', 'budget_exhausted', 'unknown']) {
      assert.ok(!routes.some(e => e.to === 'release_pass' && (!e.when || evaluateExpression(e.when, { result: { decision }, loop: {} }))));
    }
    assert.ok(graph.budgets?.maxVisits);
  });
}
