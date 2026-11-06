import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadWorkflow } from "../core/workflow-loader.js";

// fileURLToPath (not .pathname) — the repo path contains non-ASCII segments such as 桌面,
// which .pathname leaves percent-encoded and node then fails to resolve.
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

test("optional inputs parse as {value, required:false} and are recorded on the node", async () => {
  const graph = await loadWorkflow({ cwd: repoRoot, workflowId: "paper-bioinfo" });
  const draft = graph.nodes.find((node) => node.id === "draft");
  assert.ok(draft, "draft node must exist");
  assert.equal(draft.inputs?.enrichment_results, "{{artifact:enrichment:enrichment_results}}");
  assert.deepEqual((draft.optionalInputs ?? []).sort(), ["cluster_markers", "de_results", "diversity_stats", "integrated_adata"]);
  // optional inputs stay in the value map but are marked skippable when missing
  assert.equal(draft.inputs?.de_results, "{{artifact:bulk_de:de_results}}");
  // branch results also reach figures for plotting
  const figures = graph.nodes.find((node) => node.id === "figures");
  assert.ok((figures?.optionalInputs ?? []).includes("integrated_adata"));
});

test("required inputs still parse as plain strings on the same workflow", async () => {
  const graph = await loadWorkflow({ cwd: repoRoot, workflowId: "paper-bioinfo" });
  const draft = graph.nodes.find((node) => node.id === "draft");
  assert.ok(draft);
  assert.equal(draft.inputs?.analysis_plan, "{{artifact:design:analysis_plan}}");
  assert.equal(draft.inputs?.enrichment_results, "{{artifact:enrichment:enrichment_results}}");
  assert.ok((draft.outputs ?? []).some((output) => output.name === "manuscript"));
  assert.ok((draft.optionalInputs ?? []).includes("de_results"));
});

test("edge bind keeps its own parse path (bind values are artifacts, not inputs)", async () => {
  const graph = await loadWorkflow({ cwd: repoRoot, workflowId: "paper-bioinfo" });
  const inbound = graph.edges.filter((edge) => edge.to === "enrichment" && edge.bind);
  assert.ok(inbound.length >= 3, "each branch must bind its result into enrichment");
  for (const edge of inbound) {
    assert.equal(typeof edge.bind?.results, "string");
    assert.match(String(edge.bind?.results), /^\{\{artifact:.+\}\}$/);
  }
});

test("nodes can expose multiple active skills while preserving the primary skill", async () => {
  const graph = await loadWorkflow({ cwd: repoRoot, workflowId: "paper" });
  const methods = graph.nodes.find((node) => node.id === "methods");
  const draft = graph.nodes.find((node) => node.id === "draft");
  assert.deepEqual(methods?.skills, ["experimental-design", "statistical-power"]);
  assert.equal(methods?.skill, "experimental-design");
  assert.deepEqual(draft?.skills, ["scientific-writing", "markdown-mermaid-writing", "paper-figure-contract"]);
});

test("every workflow loads with optional inputs across all five pipelines", async () => {
  for (const workflowId of ["paper", "paper-algo", "paper-medical", "paper-bioinfo", "paper-survey"]) {
    const graph = await loadWorkflow({ cwd: repoRoot, workflowId });
    assert.ok(graph.nodes.length > 0, workflowId);
    const withOptional = graph.nodes.filter((node) => (node.optionalInputs ?? []).length > 0);
    assert.ok(withOptional.length > 0, `${workflowId} should consume at least one branch-conditional artifact`);
  }
});