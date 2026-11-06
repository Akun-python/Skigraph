#!/usr/bin/env node
/**
 * audit-workflows.cjs — 静态链路审计
 *
 * 逐 workflow 验证"每个阶段调用相关 skill 并产出被下游消费的交付物":
 *   A1 skill 注册:       每个 node.skill 必须在 skills.yaml 中出现
 *   A2 契约匹配:         每个 node output 必须落在 skill 的 produces（归一化+别名）,
 *                        或带 schema 的机器产物（*.json/py/csv）
 *   A3 required 可达:    每个 required input 的 {{artifact:prod:name}} 引用的 producer
 *                        必须是消费者的祖先（所有简单路径上存在）
 *   A4 无悬空产物:       非终态节点的每个必交付 output 必须被 ≥1 个下游 input 消费
 *   A5 task 契约指令:    src/core/engine.ts 的 stageTask() 必须把 SKILL.md 路径注入 task 前缀
 *
 * 用法: node scripts/audit-workflows.cjs [--verbose]
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wfDir = join(root, ".skill-workflows", "workflows");
const graphYaml = ".skill-workflows/graph/skills.yaml";

// skill 能力类别(kebab) → 该 skill 节点上允许出现的 output 实例名(snake)
// 规则: 归一化后包含 produces 中的词根, 或命中最左列别名
const ALIASES = {
  "research-plan": ["research_plan"],
  "problem-statement": ["problem_statement", "novelty_hypotheses", "novelty_hypotheses.json", "scope", "scope.json"],
  "critical-appraisal": ["critical_appraisal", "taxonomy", "synthesis_matrix", "ablation_report", "release_gate_report", "evidence_manifest.json", "evidence_audit"],
  "literature-review": ["literature_review", "corpus.json"],
  "evidence-table": ["evidence_table", "evidence_notes", "claims_table.json", "search_log.json"],
  "methods": ["methods", "experiment_protocol", "experiment_protocol.json", "study_protocol", "study_protocol.json", "analysis_plan", "analysis_plan.json"],
  "power-analysis": ["sample_size", "sample_size.md", "power_calculation.md"],
  "data-profile": ["data_profile"],
  "analysis-report": ["analysis_report", "analysis_report.json", "pooled_effect", "pooled_effect.json"],
  "statistical-model": ["statistical_model", "statistical_model.json"],
  "figures": ["figures", "figure_generation.py", "figure1_main.pdf", "figure2_fold_differences.pdf", "figure3_difference_ranges.pdf"],
  "method-description": ["method_description", "outline", "figures"],
  "manuscript": ["manuscript", "manuscript_draft", "revised_manuscript", "revision_notes"],
  "review-report": ["review_report"],
  "manuscript-snapshot": ["manuscript_under_review"],
  "bibliography": ["bibliography", "references.bib", "citation_audit"],
  "final-paper": ["final_paper", "final_paper.md", "final_paper.docx", "final_paper.tex", "final_paper.pdf", "paper_page_count.json", "submission_checklist", "reporting_checklist", "coverage_appendix"],
  "clinical-question": ["clinical_question", "pico", "pico.json"],
  "cohort-dataset": ["cohort_dataset", "cohort_definition", "cohort_definition.py"],
  "experiment-code": ["experiment_code"],
  "benchmark-results": ["benchmark_results.json"],
  "novelty-hypotheses": ["novelty_hypotheses.json"],
  "quantification": ["quantification", "sample_qc.json"],
  "differential-expression": ["de_results", "de_results.csv"],
  "cell-annotation": ["cell_annotation", "cluster_markers.csv"],
  "integrated-dataset": ["integrated_adata", "integration_metrics", "integration_metrics.json"],
  "asv-table": ["asv_table", "asv_table.json"],
  "diversity-stats": ["diversity_stats", "diversity_stats.json"],
  "enrichment-results": ["enrichment_results", "enrichment_results.csv"],
  "clinical-report": ["clinical_report"],
};
const SCHEMA_SUFFIX = /\.(json|py|csv|ipynb)$/;

function norm(name) {
  return name.replace(/[.\- ]/g, "_").replace(/_{2,}/g, "_");
}
function stripExt(name) {
  return name.replace(/\.(json|csv|py|md|bib|tex|docx|ipynb|tsv|pdf)$/, "");
}
function covers(produces, outName) {
  const bare = stripExt(outName);
  const n = norm(outName);
  const nb = norm(bare);
  if (produces.some((p) => norm(p) === nb)) return true;
  for (const [cat, names] of Object.entries(ALIASES)) {
    if (!produces.includes(cat)) continue;
    if (names.includes(outName) || names.includes(bare)) return true;
  }
  if (produces.some((p) => norm(p) === n)) return true;
  for (const [cat, names] of Object.entries(ALIASES)) {
    if (produces.includes(cat) && names.includes(outName)) return true;
  }
  return false;
}

const skillsDoc = yaml.load(readFileSync(join(root, graphYaml), "utf8"));
const skills = new Map((skillsDoc.skills || []).map((s) => [s.id, s]));
const missingRegistered = [];
for (const [id, s] of skills) {
  if (!Array.isArray(s.produces) && !Array.isArray(s.steering) && !Array.isArray(s.consumes)) missingRegistered.push(id);
}

function allPaths(graph, from, to, seen = new Set()) {
  if (from === to) return [[to]];
  if (seen.has(from)) return [];
  seen.add(from);
  const out = [];
  for (const e of graph.edges.filter((x) => x.from === from)) {
    for (const p of allPaths(graph, e.to, to, new Set(seen))) out.push([from, ...p]);
  }
  return out;
}
function ancestors(graph, nodeId) {
  const acc = new Set();
  for (const n of graph.nodes) {
    if (n.id === nodeId) continue;
    if (allPaths(graph, n.id, nodeId).length > 0) acc.add(n.id);
  }
  return acc;
}

let issues = 0;
let warnings = 0;
const verbose = process.argv.includes("--verbose");

for (const f of readdirSync(wfDir).filter((n) => n.endsWith(".yaml")).sort()) {
  const g = yaml.load(readFileSync(join(wfDir, f), "utf8"));
  const nodeById = new Map(g.nodes.map((n) => [n.id, n]));
  const terminal = new Set(g.nodes.filter((n) => n.terminal).map((n) => n.id));
  const anc = new Map(g.nodes.map((n) => [n.id, ancestors(g, n.id)]));
  const consumed = new Map(); // artifactKey(prod:name) -> consumers
  const bindConsumed = new Map();
  for (const e of g.edges) {
    for (const ref of Object.values(e.bind || {})) {
      const m = /^\{\{artifact:([^:]+):([^}]+)\}\}$/.exec(String(ref).trim());
      if (!m) continue;
      const key = `${m[1]}:${m[2]}`;
      if (!bindConsumed.has(key)) bindConsumed.set(key, []);
      bindConsumed.get(key).push(`${e.to}(bind)`);
    }
  }

  for (const n of g.nodes) {
    const skillIds = n.skills?.length ? n.skills : (n.skill ? [n.skill] : []);
    const missingSkills = skillIds.filter((id) => !skills.has(id));
    // A1: multi-skill nodes are valid; every declared skill must be registered.
    if (!skillIds.length || missingSkills.length) {
      issues++;
      console.log(`✗ ${f} ${n.id}: 未注册 skill ${JSON.stringify(missingSkills.length ? missingSkills : skillIds)}`);
      continue;
    }
    const produces = skillIds.flatMap((id) => skills.get(id).produces || []);
    const skillLabel = skillIds.join(",");
    if (verbose) console.log(`\n[${f}] ${n.id} -> ${skillLabel} (${produces.join(",")})`);
    // A2
    for (const o of n.outputs || []) {
      const key = `${n.id}:${o.name}`;
      if (!terminal.has(n.id) && o.required !== false && !covers(produces, o.name)) {
        issues++;
        console.log(`✗ ${f} ${n.id}: output "${o.name}" 不在 ${skillLabel} 的 produces ${JSON.stringify(produces)} 中`);
      }
      consumed.set(key, []);
      if (verbose) console.log(`   产出 ${o.name}${o.required === false ? "(可选)" : ""}`);
    }
    // A3
    for (const [name, v] of Object.entries(n.inputs || {})) {
      const ref = typeof v === "string" ? v : v.value;
      const m = /^\{\{artifact:([^:]+):([^}]+)\}\}$/.exec(ref.trim());
      if (!m) continue;
      const [prod, art] = [m[1], m[2]];
      const key = `${prod}:${art}`;
      if (consumed.has(key)) consumed.get(key).push(n.id);
      if (!nodeById.has(prod)) {
        issues++;
        console.log(`✗ ${f} ${n.id}: input "${name}" 引用不存在的节点 ${prod}`);
        continue;
      }
      const required = typeof v !== "object" || v.required !== false;
      if (required) {
        if (!anc.get(n.id).has(prod)) {
          issues++;
          console.log(`✗ ${f} ${n.id}: required input "${name}" 的 producer ${prod} 不在祖先路径上`);
        } else {
          // 检查是否所有简单路径都经过 producer
          const paths = allPaths(g, g.nodes[0].id, n.id);
          const missingPath = paths.some((p) => !p.includes(prod));
          if (missingPath) {
            warnings++;
            console.log(`? ${f} ${n.id}: required input "${name}" 的 producer ${prod} 在某些分支路径上不存在（建议 required:false）`);
          }
        }
      }
    }
  }
  // A4
  for (const n of g.nodes) {
    if (terminal.has(n.id)) continue;
    for (const o of n.outputs || []) {
      if (o.required === false && o.schema) continue; // 机器元数据（search_log 等）豁免
      const key = `${n.id}:${o.name}`;
      const consumers = [...(consumed.get(key) || []).filter((c) => c !== n.id), ...(bindConsumed.get(key) || [])];
      if (o.required === false) continue;
      if (SCHEMA_SUFFIX.test(o.name)) continue; // 数据/代码类交付物随论文打包，不要求被节点消费
      if (consumers.length === 0) {
        issues++;
        console.log(`✗ ${f} ${n.id}: 产出 "${o.name}" 无任何下游消费（悬空）`);
      } else if (verbose) console.log(`   ${n.id}.${o.name} <- 被 ${consumers.join(",")} 消费`);
    }
  }
}

// A5 引擎注入
const engineSrc = readFileSync(join(root, "src", "core", "engine.ts"), "utf8");
const hasInjection = engineSrc.includes("function stageTask(node: SkillGraphNode, skills: ResolvedSkillPin[])") && (engineSrc.includes("Read ${skill.filePath} before doing this stage") || engineSrc.includes("Read all active SKILL.md files before doing this stage"));
if (hasInjection) console.log("\n✓ A5: engine.stageTask 将 SKILL.md 绝对路径注入每个阶段 task 前缀");
else {
  issues++;
  console.log("\n✗ A5: engine.stageTask() 未将 SKILL.md 路径注入 task 前缀");
}

console.log(`\n审计完成: ${issues} 个问题, ${warnings} 个警告`);
process.exit(issues === 0 ? 0 : 1);