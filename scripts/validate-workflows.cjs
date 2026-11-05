#!/usr/bin/env node
/**
 * Graph-validity harness for every workflow in .skill-workflows/workflows/.
 *
 * Walks each plan with simulated artifacts so you can verify routing, branches,
 * loops, artifact contracts and budgets after editing a YAML. It does NOT
 * generate real content - see .skill-workflows/README.md for the real agent loop.
 *
 * Usage (from the project root, after `npm run build`):
 *   node scripts/validate-workflows.cjs                        # all plans
 *   node scripts/validate-workflows.cjs --plan paper-medical-meta
 *   node scripts/validate-workflows.cjs --workflow paper-bioinfo --prompt "..."
 *   node scripts/validate-workflows.cjs --keep                 # keep run dirs
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PLANS = require("./plans.json").plans;

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const only = argv.includes("--plan") ? argv[argv.indexOf("--plan") + 1] : null;
const onlyWorkflow = argv.includes("--workflow") ? argv[argv.indexOf("--workflow") + 1] : null;
const promptArg = argv.includes("--prompt") ? argv[argv.indexOf("--prompt") + 1] : null;
const keep = argv.includes("--keep");

const cli = (...args) =>
  JSON.parse(
    execFileSync("node", ["dist/cli.js", ...args], { cwd: ROOT, encoding: "utf8" }),
  );

/**
 * Each plan: workflow id, the simulated `decision` per node (applied in visit
 * order, last value repeats), the exact node sequence a full walk must produce,
 * and a timeout guard.
 */

function writeStage(plan, stage) {
  const base = path.join(
    ROOT, ".skill-workflows", "runs", stage.runId,
    "stages", stage.nodeId, "visits", stage.visitId,
  );
  fs.mkdirSync(path.join(base, "outputs"), { recursive: true });

  const artifacts = stage.requiredOutputs.map((out) => {
    const isJson = out.name.endsWith(".json");
    const file = /\.(tex|pdf|json|csv|py|png|svg|md|yaml|bib|txt)$/i.test(out.name) ? out.name : `${out.name}.md`;
    const body = isJson
      ? JSON.stringify({ stage: stage.nodeId, note: "simulated artifact" }, null, 2)
      : `# ${out.name}\n\nSimulated output of stage \`${stage.nodeId}\` (skill: \`${stage.skill.id}\`).\n`;
    fs.writeFileSync(path.join(base, "outputs", file), body);
    return { name: out.name, path: file };
  });

  const visits = (plan._seen[stage.nodeId] = (plan._seen[stage.nodeId] ?? 0) + 1) - 1;
  const values = plan.decisions[stage.nodeId];
  const decision = values ? values[Math.min(visits, values.length - 1)] : undefined;

  const result = {
    schema_version: 1,
    node_id: stage.nodeId,
    visit_id: stage.visitId,
    status: "success",
    summary: `Stage ${stage.nodeId} completed (simulated).`,
    artifacts,
    issues: [],
    ...(decision ? { decision } : {}),
  };
  fs.writeFileSync(path.join(base, "node_result.json"), JSON.stringify(result, null, 2));
  return decision;
}

function walk(plan) {
  const text = promptArg || plan.prompt || "simulated prompt";
  plan._seen = {};
  const stage0 = cli("run", plan.workflow, JSON.stringify({ prompt: text }));
  let stage = stage0;
  const trace = [];

  for (let guard = 0; guard < 60; guard += 1) {
    const decision = writeStage(plan, stage);
    const res = cli("submit", stage.runId, stage.nodeId, stage.visitId);
    trace.push({ node: stage.nodeId, decision: decision ?? null, status: res.status, next: res.next ? res.next.nodeId : null });
    if (res.status === "completed" || !res.next) break;
    stage = res.next;
  }

  const state = JSON.parse(
    fs.readFileSync(path.join(ROOT, ".skill-workflows", "runs", stage.runId, "state.json"), "utf8"),
  );

  const nodes = state.completedNodes;
  const problems = [];
  if (state.status !== "completed") problems.push(`status=${state.status} (${state.lastError?.code ?? "no-error-code"}: ${state.lastError?.message ?? "-"})`);
  if (nodes.join(",") !== plan.expect.join(",")) {
    problems.push(`node sequence mismatch\n     expected: ${plan.expect.join(" -> ")}\n     actual:   ${nodes.join(" -> ")}`);
  }
  const finalKeys = Object.keys(state.artifacts).filter((k) => k.startsWith("format:"));
  if (finalKeys.length === 0) problems.push("no artifact produced by the terminal node");

  if (!keep) fs.rmSync(path.join(ROOT, ".skill-workflows", "runs", state.runId), { recursive: true, force: true });

  return { plan: plan.plan, runId: state.runId, nodes: nodes.length, artifacts: Object.keys(state.artifacts).length, finalOutputs: finalKeys.map((k) => state.artifacts[k].relativePath), problems };
}

const selected = PLANS.filter(
  (p) => (!only || p.plan === only) && (!onlyWorkflow || p.workflow === onlyWorkflow),
);
if (selected.length === 0) {
  console.error(`no plan matched (${PLANS.map((p) => p.plan).join(", ")})`);
  process.exit(2);
}

let failed = 0;
for (const plan of selected) {
  console.log(`\n=== ${plan.plan} (${plan.workflow}) ===`);
  let out;
  try {
    out = walk(plan);
  } catch (error) {
    console.log(`  FAILED: ${String(error.message).split("\n")[0]}`);
    failed += 1;
    continue;
  }
  console.log(`  nodes: ${out.nodes}  artifacts: ${out.artifacts}  run: ${out.runId}`);
  console.log(`  final: ${out.finalOutputs.join(", ")}`);
  if (out.problems.length) {
    failed += 1;
    for (const p of out.problems) console.log(`  FAIL: ${p}`);
  } else {
    console.log("  OK");
  }
}

console.log(`\n${selected.length - failed}/${selected.length} plans passed`);
process.exit(failed === 0 ? 0 : 1);
