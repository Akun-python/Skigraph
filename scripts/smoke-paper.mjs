#!/usr/bin/env node
/**
 * End-to-end smoke test: walk every plan with a CONTENT-AWARE mock agent, then
 * inspect the paper each workflow actually produced.
 *
 * Unlike validate-workflows.cjs (which writes placeholder artifacts so it can
 * check routing/budgets/contracts), this harness makes every stage embed the
 * VALUES it received via `stage.inputs` into its own outputs. Downstream stages
 * read those files, so by the time `format` runs, final_paper.md must contain
 * text that originated in the very first stage of the plan. That is how we
 * prove artifact wiring, optional-input resolution and bind injection work —
 * not just that stages exist.
 *
 * Usage (from the project root, after `npm run build`):
 *   node scripts/smoke-paper.mjs                 # all 9 plans
 *   node scripts/smoke-paper.mjs --plan paper    # one plan
 *   node scripts/smoke-paper.mjs --keep          # keep run dirs
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RUNS = path.join(ROOT, ".skill-workflows", "runs");

const argv = process.argv.slice(2);
const only = argv.includes("--plan") ? argv[argv.indexOf("--plan") + 1] : null;
const keep = argv.includes("--keep");

const { plans } = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "plans.json"), "utf8"));

const cli = (...args) =>
  JSON.parse(execFileSync("node", ["dist/cli.js", ...args], { cwd: ROOT, encoding: "utf8" }));

const SECTION_RE = /^#{1,3}\s+(Abstract|Introduction|Methods|Results|Discussion|Conclusion|References)\s*$/im;

/** Values that should NOT be echoed into stage output (raw route strings). */
function embedValue(value) {
  if (typeof value === "string") {
    if (/^\{\{/.test(value)) return `[unresolved template: ${value}]`;
    if (value.length > 0 && fs.existsSync(value)) {
      let body;
      try {
        body = fs.readFileSync(value, "utf8");
      } catch {
        body = "";
      }
      const lineage = [...new Set([...body.matchAll(/stage:([a-z0-9_-]+)/g)].map((m) => m[1]))];
      return `(file ${path.basename(value)}, ${body.length} bytes) lineage:[${lineage.join(",")}]\n${body.slice(0, 1200)}`;
    }
    return value;
  }
  if (value === undefined || value === null) return String(value);
  try {
    return JSON.stringify(value, null, 2).slice(0, 1200);
  } catch {
    return String(value);
  }
}

/** Content-aware mock agent: writes every required deliverable, embedding the
 * stage's resolved inputs (file contents for artifact paths, raw values for
 * result/input refs). */
function writeStage(plan, stage, stageBrief) {
  const base = path.join(RUNS, stage.runId, "stages", stage.nodeId, "visits", stage.visitId);
  const outputsDir = path.join(base, "outputs");
  fs.mkdirSync(outputsDir, { recursive: true });

  const inputEntries = Object.entries(stage.inputs ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, value }));

  // Conservative byte budget so a giant upstream file can't bloat every stage.
  const MAX_EMBED = 3600;
  let budget = MAX_EMBED;

  const body = [`# ${stage.nodeId} :: ${stage.requiredOutputs?.map((o) => o.name).join(", ") || "?"}`,
    ``,
    `> stage:${stage.nodeId}  skill:${stage.skill?.id ?? "?"}  visit:${stage.visitId}`,
    ``,
  ];
  inputEntries.forEach(({ key, value }, i) => {
    const left = inputEntries.length - i;
    const cap = Math.max(140, Math.min(1200, Math.floor(budget / left)));
    const chunk = embedValue(value).slice(0, cap);
    budget -= Math.min(budget, chunk.length);
    body.push(`## input:${key}`, chunk, "");
  });

  const artifacts = (stage.requiredOutputs ?? []).map((out) => {
    const isJson = out.name.endsWith(".json");
    const isPy = out.name.endsWith(".py");
    const file = out.name + (isJson ? ".json" : ".md");
    if (isJson) {
      const payload = {
        stage: stage.nodeId,
        skill: stage.skill?.id,
        inputs: Object.fromEntries(inputEntries.map(({ key, value }) => [key, typeof value === "string" && /^\{\{/.test(value) ? value : value])),
        summary: `Simulated ${stage.nodeId} output.`,
      };
      fs.writeFileSync(path.join(outputsDir, file), JSON.stringify(payload, null, 2));
    } else if (isPy) {
      fs.writeFileSync(
        path.join(outputsDir, file),
        `#!/usr/bin/env python3\n# stage:${stage.nodeId} skill:${stage.skill?.id}\n# simulated deliverable; inputs echoed below\n${body.join("\n")}`,
      );
    } else {
      const paperish =
        /paper|manuscript|draft/i.test(out.name) ||
        ["draft", "revise", "format", "finish"].includes(stage.nodeId);
      let text = body.join("\n");
      if (paperish) {
        const upstream = inputEntries.map(({ key }) => key).join(", ") || "(none)";
        text = [
          `# Manuscript: ${stage.nodeId}`,
          ``,
          `## Abstract`,
          `Simulated abstract. Upstream inputs consumed here: ${upstream}.`,
          ``,
          `## Introduction`,
          `Background generated from the study question and literature review.`,
          ``,
          `## Methods`,
          `Study design, data and statistical procedures as carried forward from upstream stages.`,
          ``,
          `## Results`,
          `Findings assembled from the analysis pipeline (raw upstream payload follows).`,
          ``,
          text,
          ``,
          `## Discussion`,
          `Interpretation, limitations and implications.`,
          ``,
          `## References`,
          `Bibliography produced by the citation stage.`,
        ].join("\n");
      }
      fs.writeFileSync(path.join(outputsDir, file), text);
    }
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
    summary: `Stage ${stage.nodeId} completed (smoke).`,
    artifacts,
    issues: [],
    ...(decision ? { decision } : {}),
  };
  fs.writeFileSync(path.join(base, "node_result.json"), JSON.stringify(result, null, 2));
  stageBrief.inputKeys = inputEntries.map(({ key }) => key);
  return decision;
}

function readState(runId) {
  return JSON.parse(fs.readFileSync(path.join(RUNS, runId, "state.json"), "utf8"));
}

/** Inspect the paper the terminal node produced. */
function checkPaper(plan, state) {
  const report = { sections: 0, inputKeys: [], paperBytes: 0, firstStage: false, main: null };
  const finalKeys = Object.keys(state.artifacts).filter((k) => k.startsWith("format:"));
  if (finalKeys.length === 0) {
    report.problems = ["no artifact produced by the terminal node"];
    return report;
  }
  // Prefer the manuscript-like artifact (main .md / non-json first).
  const candidates = finalKeys
    .map((k) => ({ key: k, rec: state.artifacts[k] }))
    .sort((a, b) => (b.key.toLowerCase().includes("paper") ? 1 : 0) - (a.key.toLowerCase().includes("paper") ? 1 : 0));
  for (const { rec } of candidates) {
    const file = path.join(RUNS, state.runId, "stages", rec.nodeId, "visits", rec.visitId, "outputs", rec.relativePath);
    if (rec.relativePath.endsWith(".json")) continue;
    if (!fs.existsSync(file)) {
      report.problems = [`terminal artifact missing on disk: ${rec.nodeId}/${rec.relativePath}`];
      return report;
    }
    const text = fs.readFileSync(file, "utf8");
    report.paperFile = file;
    report.paperBytes = text.length;
    report.main = `${rec.nodeId}/${rec.relativePath}`;
    // Structural check: conventional paper sections.
    const sections = text.match(/^#{1,3}\s+[A-Za-z][A-Za-z ()-]{2,60}$/gm) ?? [];
    report.sections = sections.filter((s) => SECTION_RE.test(s)).length;
    report.headingCount = sections.length;
    // Upstream propagation check: input: markers from ALL stages (input:key).
    report.inputKeys = [...new Set([...text.matchAll(/^## input:([A-Za-z0-9_]+)$/gm)].map((m) => m[1]))];
    report.markers = [...new Set([...text.matchAll(/stage:([a-z0-9_-]+)/g)].map((m) => m[1]))].filter((m) => plan.expect.includes(m));
    report.firstStage = report.markers.includes(plan.expect[0]);
    report.markerCoverage = `${report.markers.length}/${plan.expect.length}`;
    if (!argv.includes("--no-samples")) {
      const dir = path.join(RUNS, "samples");
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(file, path.join(dir, `${plan.plan}.md`));
      report.sample = `.skill-workflows/runs/samples/${plan.plan}.md`;
    }
    return report;
  }
  report.problems = ["no markdown terminal artifact"];
  return report;
}

function walk(plan) {
  plan._seen = {};
  const stage0 = cli("run", plan.workflow, JSON.stringify({ prompt: plan.prompt }));
  let stage = stage0;
  const stageBrief = { inputKeys: [], trace: [] };

  for (let guard = 0; guard < 80; guard += 1) {
    const decision = writeStage(plan, stage, stageBrief);
    const res = cli("submit", stage.runId, stage.nodeId, stage.visitId);
    stageBrief.trace.push({ node: stage.nodeId, skill: stage.skill?.id, decision: decision ?? null, status: res.status, next: res.next ? res.next.nodeId : null });
    if (res.status === "completed" || !res.next) break;
    stage = res.next;
  }

  const state = readState(stage.runId);
  const nodes = state.completedNodes;
  const report = {
    plan: plan.plan,
    workflow: plan.workflow,
    runId: state.runId,
    nodes: nodes,
    status: state.status,
    lastError: state.lastError ?? null,
  };
  const problems = [];
  if (state.status !== "completed") {
    problems.push(`status=${state.status} (${state.lastError?.code ?? "no-error-code"}: ${state.lastError?.message ?? "-"})`);
  }
  const expected = [...plan.expect];
  if (nodes.length !== expected.length || nodes.some((n, i) => n !== expected[i])) {
    problems.push(`node sequence mismatch\n     expected: ${expected.join(" -> ")}\n     actual:   ${nodes.join(" -> ")}`);
  }
  report.problems = problems;
  report.trace = stageBrief.trace;

  const paper = checkPaper(plan, state);
  Object.assign(report, paper);
  if (paper.problems) problems.push(...paper.problems);
  report.artifacts = Object.keys(state.artifacts).length;

  if (!keep) fs.rmSync(path.join(RUNS, state.runId), { recursive: true, force: true });
  return report;
}

const selected = plans.filter((p) => !only || p.plan === only);
if (selected.length === 0) {
  console.error(`no plan matched (${plans.map((p) => p.plan).join(", ")})`);
  process.exit(2);
}

let failed = 0;
const results = [];
for (const plan of selected) {
  console.log(`\n=== ${plan.plan} (${plan.workflow}) ===`);
  let report;
  try {
    report = walk(plan);
  } catch (error) {
    failed += 1;
    console.log(`  FAILED: ${String(error.message).split("\n")[0]}`);
    results.push({ plan: plan.plan, ok: false, error: String(error.message).split("\n")[0] });
    continue;
  }
  const ok = report.problems.length === 0;
  if (!ok) failed += 1;
  report.ok = ok;
  report.inputKeys = report.inputKeys ?? [];
  report.sections = report.sections ?? 0;
  report.paperBytes = report.paperBytes ?? 0;
  report.markers = report.markers ?? [];
  report.markerCoverage = report.markerCoverage ?? "0/?";

  results.push(report);
  console.log(`  stages: ${report.nodes.length}  artifacts: ${report.artifacts}`);
  console.log(`  main paper: ${report.main ?? "(none)"} (${report.paperBytes} bytes, ${report.sections} conventional sections, ${report.headingCount ?? 0} headings)`);
  console.log(`  upstream keys reaching the paper: ${report.inputKeys.join(", ") || "(none)"}`);
  if (report.sample) console.log(`  sample copy: ${report.sample}`);
  console.log(`  lineage markers in paper: ${report.markerCoverage ?? "?"} -> ${(report.markers ?? []).join(", ")}`);
  for (const p of report.problems) console.log(`  FAIL: ${p}`);
  if (ok) console.log("  OK");
}

console.log(`\n--- summary ---`);
console.log(`${selected.length - failed}/${selected.length} plans passed`);
for (const r of results) {
  const status = r.ok ? "PASS" : "FAIL";
  console.log(`  [${status}] ${r.plan}: ${r.nodes?.length ?? "-"} stages, paper ${r.paperBytes}B/${r.sections} sections, ${(r.inputKeys ?? []).length} inputs propagated`);
}

process.exit(failed === 0 ? 0 : 1);