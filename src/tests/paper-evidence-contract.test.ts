import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadWorkflow } from "../core/workflow-loader.js";

const cwd = fileURLToPath(new URL("../..", import.meta.url));

test("algorithm paper carries measured evidence and declared figures through review and formatting", async () => {
  const graph = await loadWorkflow({ cwd, workflowId: "paper-algo" });
  const node = (id: string) => {
    const found = graph.nodes.find((n) => n.id === id);
    assert.ok(found, id);
    return found;
  };
  assert.ok(graph.edges.some((e) => e.from === "implement" && e.to === "evidence_audit"));
  assert.ok(graph.edges.some((e) => e.from === "evidence_audit" && e.to === "eda"));
  for (const id of ["stats", "figures", "draft", "review", "revise", "citations", "format", "release_gate"]) {
    assert.equal(node(id).inputs?.evidence_manifest, "{{artifact:evidence_audit:evidence_manifest.json}}", id);
    assert.ok(!node(id).optionalInputs?.includes("evidence_manifest"));
  }
  for (const name of ["figure1_main.pdf", "figure2_fold_differences.pdf", "figure3_difference_ranges.pdf"]) {
    assert.ok(node("figures").outputs.some((o) => o.name === name && o.required));
    for (const id of ["draft", "review", "revise", "format"]) {
      assert.ok(Object.values(node(id).inputs ?? {}).includes(`{{artifact:figures:${name}}}`), `${id}: ${name}`);
    }
  }
  assert.match(node("stats").task, /overlapping CV folds/);
  assert.match(node("release_gate").task, /not a universal 15-25 page/);
  assert.ok(graph.edges.some((e) => e.from === "revise" && e.to === "review" && e.bind?.manuscript === "{{artifact:revise:revised_manuscript}}"));
});
