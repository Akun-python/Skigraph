#!/usr/bin/env node
// Real-agent driver: executes a skill-graph workflow stage by stage with a live LLM
// that has file / shell tools, so every artifact is actual content (not a mock).
//
//   node scripts/agent-run.mjs --plan paper --prompt "Your research question" [--model glm-5.3] [--keep]
//
// Credentials + endpoints are read from ~/.pi/agent/models.json (never hardcode keys).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RUNS = path.join(ROOT, ".skill-workflows", "runs");
const argv = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : argv.includes(`--${name}`) ? true : fallback;
};
const MAX_TURNS = Number(flag("max-turns", 6));
const STAGE_BUDGET = Number(flag("stage-budget", 180)) * 1000;
const BASH_TIMEOUT = Number(flag("bash-timeout", 30));
const MODEL_TIMEOUT = Number(flag("model-timeout", 60)) * 1000;

// ---------------------------------------------------------------- model runtime
function loadModel() {
  const wanted = process.env.SKILL_GRAPH_MODEL || flag("model", "glm-5.3");
  const cfg = JSON.parse(fs.readFileSync(path.join(process.env.HOME, ".pi/agent/models.json"), "utf8"));
  for (const [provider, p] of Object.entries(cfg.providers ?? {})) {
    if (!p.baseUrl || !p.apiKey) continue;
    const hit = (p.models ?? []).find((m) => m.id === wanted);
    if (hit) return { provider, baseUrl: p.baseUrl.replace(/\/+$/, ""), apiKey: p.apiKey, model: hit.id };
  }
  throw new Error(`model "${wanted}" not found in ~/.pi/agent/models.json`);
}

async function chat(model, messages, tools) {
  const body = {
    model: model.model,
    messages,
    tools,
    tool_choice: "auto",
    temperature: 0.4,
    max_tokens: 4096,
  };
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await fetch(`${model.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${model.apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(MODEL_TIMEOUT),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
      const json = await res.json();
      const msg = json.choices?.[0]?.message;
      if (!msg) throw new Error(`empty completion: ${JSON.stringify(json).slice(0, 300)}`);
      return msg;
    } catch (error) {
      if (attempt >= 1) throw error;
      console.error(`  [model retry ${attempt}] ${String(error.message).split("\n")[0]}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

// ---------------------------------------------------------------- CLI bridge
function cli(...args) {
  const out = execFileSync(process.execPath, [path.join(ROOT, "dist/cli.js"), ...args], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILL_GRAPH_CWD: ROOT },
  });
  const start = out.indexOf("{");
  if (start < 0) throw new Error(`non-JSON cli output: ${out.slice(0, 400)}`);
  return JSON.parse(out.slice(start));
}

// ---------------------------------------------------------------- tools
const clip = (text, limit = 12_000) =>
  text.length <= limit ? text : `${text.slice(0, limit)}\n…[truncated ${text.length - limit} chars]`;

function insideRun(runDir, target) {
  const rel = path.relative(runDir, target);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

function makeTools(runDir) {
  const tools = [
    {
      type: "function",
      function: {
        name: "read_file",
        description: "Read a UTF-8 text file. Use absolute paths from the stage inputs.",
        parameters: { type: "object", properties: { path: { type: "string" }, offset: { type: "number" }, limit: { type: "number" } }, required: ["path"] },
      },
    },
    {
      type: "function",
      function: {
        name: "write_file",
        description: "Write a UTF-8 text file (directories are created). Prefer writing artifacts directly into the outputDirectory.",
        parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] },
      },
    },
    {
      type: "function",
      function: {
        name: "list_files",
        description: "List the contents of a directory (recursive, capped).",
        parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
      },
    },
    {
      type: "function",
      function: {
        name: "run_bash",
        description: "Run a shell command in the run workspace (python3, numpy, pandas, scipy, matplotlib are available). Use it for real data generation, statistics, and figures.",
        parameters: { type: "object", properties: { command: { type: "string" }, timeout_sec: { type: "number" } }, required: ["command"] },
      },
    },
    {
      type: "function",
      function: {
        name: "finish",
        description: "Declare the stage complete. Every required output must already exist on disk.",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string" },
            artifacts: {
              type: "array",
              items: {
                type: "object",
                properties: { name: { type: "string" }, path: { type: "string" }, description: { type: "string" } },
                required: ["name", "path"],
              },
            },
            decision: { type: "string" },
            issues: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "artifacts"],
        },
      },
    },
  ];
  const handlers = {
    read_file: ({ path: p, offset = 1, limit = 600 }) => {
      const file = path.resolve(p);
      if (!fs.existsSync(file)) return `ERROR: no such file: ${file}`;
      const lines = fs.readFileSync(file, "utf8").split("\n");
      return clip(lines.slice(Math.max(0, offset - 1), offset - 1 + limit).join("\n"));
    },
    write_file: ({ path: p, content }) => {
      const file = path.resolve(p);
      if (!insideRun(runDir, file)) return `ERROR: writes must stay inside ${runDir}`;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content, "utf8");
      return `wrote ${file} (${content.length} chars)`;
    },
    list_files: ({ path: p }) => {
      const dir = path.resolve(p);
      if (!fs.existsSync(dir)) return `ERROR: no such directory: ${dir}`;
      const rows = [];
      const walk = (d, depth) => {
        if (rows.length > 300 || depth > 4) return;
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
          const full = path.join(d, entry.name);
          rows.push(`${path.relative(dir, full)}${entry.isDirectory() ? "/" : ` (${fs.statSync(full).size}B)`}`);
          if (entry.isDirectory()) walk(full, depth + 1);
        }
      };
      walk(dir, 0);
      return rows.join("\n");
    },
    run_bash: ({ command, timeout_sec = BASH_TIMEOUT }) => {
      try {
        const out = execFileSync("bash", ["-lc", command], {
          cwd: runDir,
          encoding: "utf8",
          timeout: Math.min(Number(timeout_sec) || BASH_TIMEOUT, BASH_TIMEOUT) * 1000,
          maxBuffer: 32 * 1024 * 1024,
          env: { ...process.env, MPLBACKEND: "Agg" },
        });
        return clip(out || "(no output)");
      } catch (error) {
        const parts = [error.stdout, error.stderr].filter(Boolean).join("\n");
        return clip(`EXIT ${error.status ?? "?"}\n${parts || error.message}`);
      }
    },
  };
  return { tools, handlers };
}

// ---------------------------------------------------------------- stage execution
const SKILL_NOTE = `You are one stage of an automated scientific-paper pipeline. A downstream stage consumes your outputs verbatim, so produce REAL, publication-grade content — within a HARD BUDGET.

## Budget (enforced)
- at most 10 tool calls, ~4 minutes of compute; run_bash is killed after 120s
- write the deliverables FIRST (even rough), then improve them with leftover effort
- do only this stage's work; never run the full experiment at the hypothesis/design stage

## Rules
- Read the SKILL.md path that appears in the task and follow its method; the deliverable list is the completion contract.
- No placeholders, no "TODO", no "simulated", no lorem text. Every number must come from something you actually ran or read.
- Real data: generate it with python3 (numpy/pandas/scipy/matplotlib) via run_bash; save .csv/.png artifacts.
- Real citations: run_bash has network access, e.g. curl -s "https://api.crossref.org/works?query=temperature+scaling&rows=5" or the arXiv / Semantic Scholar APIs. Cite only works you actually fetched, with DOI or arXiv id. Never invent references.
- Write every required deliverable into the stage outputDirectory (report relative paths) and then call finish; a missing required deliverable fails the run.
- Markdown deliverables carry real content: claims, numbers, and references to the artifacts you read.
- If the stage exposes a decision field, choose the value the evidence supports and report it in finish.decision.`;

function loadActiveSkills(stage) {
  const pins = stage.skills?.length ? stage.skills : [stage.skill];
  return pins.map((pin) => {
    const file = pin?.filePath;
    if (!file || !fs.existsSync(file)) throw new Error(`Active skill file is missing: ${file}`);
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error(`Active skill file is invalid or over 1 MiB: ${file}`);
    return { id: pin.id, filePath: file, content: fs.readFileSync(file, "utf8") };
  });
}

function stagePrompt(stage, activeSkills) {
  const inputs = Object.entries(stage.inputs ?? {})
    .map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n");
  const outputs = (stage.requiredOutputs ?? [])
    .map((o) => `- ${o.name}${o.required === false ? " (optional)" : ""}${o.schema ? ` schema:${o.schema}` : ""}`)
    .join("\n");
  const edges = (stage.allowedEdges ?? []).map((e) => `- to "${e.to}"${e.when ? ` when ${e.when}` : ""}`).join("\n");
  const phaseGuard = {
    scope: "This is ONLY the research-plan stage. Do not run a full experiment, do not create pilot data, and do not write extra files. Read the prompt and relevant SKILL.md, then write research_plan.md and call finish within 2 tool calls.",
    literature: "This is ONLY the literature stage. Do not run the study or generate experimental data. Retrieve a small, relevant set of real sources and write the literature review.",
    methods: "This is ONLY the methods-design stage. Do not run the full experiment. Specify a reproducible protocol, data-generating process, variables, baselines, metrics, and analysis plan.",
    eda: "This stage must profile an existing upstream dataset or explicitly document that no dataset was supplied. Do not invent a scientific result.",
    stats: "This stage must analyze the actual upstream data/artifacts. If an upstream artifact is missing, report that rather than starting an unrelated new experiment.",
    figures: "This stage must create figures from upstream analysis artifacts. Do not launch a new exploratory study.",
    draft: "This stage must write the manuscript from upstream artifacts. Do not create new data or silently invent numerical results.",
    review: "This stage must review the manuscript and call finish promptly. Do not rewrite the entire paper or run a new experiment.",
    revise: "This stage must revise the manuscript from the review. Do not launch a new independent study.",
    citations: "This stage must verify and format citations. Do not run a new experiment.",
    format: "This terminal stage must assemble the final paper and checklist from upstream artifacts. Do not run a new experiment.",
  }[stage.nodeId] ?? "Stay strictly within this stage's scope and finish promptly.";
  const skillBundle = activeSkills.map((skill) => `### ${skill.id} — ${skill.filePath}\n\n${skill.content}`).join("\n\n");
  return `${phaseGuard}\n\n## Active SKILL.md files (loaded by the runner; follow all complementary contracts)\n\n${skillBundle}\n\n## Stage task\n${stage.task}

## Stage context
node: ${stage.nodeId}   visit: ${stage.visitId}   attempt: ${stage.attempt}
skill: ${stage.skill?.id}

## Inputs (absolute paths — read them)
${inputs || "(none)"}

## Required deliverables (write into ${stage.outputDirectory})
${outputs || "(none)"}

## After finishing, the engine may route to
${edges || "(terminal stage)"}
`;
}

function findByName(dir, stem) {
  const extensions = [".md", ".tex", ".pdf", ".json", ".csv", ".png", ".svg", ".py", ".yaml", ".bib", ".txt"];
  const hits = [];
  const walk = (d) => {
    if (hits.length > 20) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.startsWith(stem) && extensions.some((e) => entry.name.endsWith(e))) hits.push(full);
    }
  };
  if (!fs.existsSync(dir)) return undefined;
  walk(dir);
  return hits.sort((a, b) => a.length - b.length)[0];
}

function materializeArtifacts(stage, artifacts) {
  const outputsDir = stage.outputDirectory;
  fs.mkdirSync(outputsDir, { recursive: true });
  const records = [];
  const declared = new Map((stage.requiredOutputs ?? []).map((output) => [output.name, output]));
  for (const artifact of artifacts ?? []) {
    if (!artifact?.name || !artifact?.path) continue;
    // Helper files may remain on disk, but only graph-declared artifacts may
    // enter node_result.json; artifact-store rejects undeclared names.
    if (!declared.has(artifact.name)) continue;
    let file = path.resolve(outputsDir, artifact.path);
    if (!fs.existsSync(file) && fs.existsSync(path.resolve(artifact.path))) file = path.resolve(artifact.path);
    if (!fs.existsSync(file)) continue; // skip missing; engine will report required ones
    const rel = path.relative(outputsDir, file);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      const target = path.join(outputsDir, path.basename(file));
      fs.copyFileSync(file, target);
      records.push({ name: artifact.name, path: path.basename(file), description: artifact.description });
    } else {
      records.push({ name: artifact.name, path: rel.split(path.sep).join("/"), description: artifact.description });
    }
  }
  // Fill in required outputs that the agent forgot to report but did write.
  const reported = new Set(records.map((r) => r.name));
  for (const output of stage.requiredOutputs ?? []) {
    if (output.required === false || reported.has(output.name)) continue;
    const found = findByName(outputsDir, output.name);
    if (found) records.push({ name: output.name, path: path.relative(outputsDir, found).split(path.sep).join("/") });
  }
  return records;
}

async function runStage(model, stage, runDir) {
  const { tools, handlers } = makeTools(runDir);
  const activeSkills = loadActiveSkills(stage);
  console.log(`    loaded skills: ${activeSkills.map((skill) => `${skill.id}(${skill.content.length} chars)`).join(", ")}`);
  const messages = [
    { role: "system", content: SKILL_NOTE },
    { role: "user", content: stagePrompt(stage, activeSkills) },
  ];
  const startedAt = Date.now();
  let toolCalls = 0;
  let nudges = 0;
  for (let turn = 1; turn <= MAX_TURNS; turn += 1) {
    const elapsed = Date.now() - startedAt;
    if (elapsed > STAGE_BUDGET) {
      if (nudges >= 2) {
        console.log(`    BUDGET EXCEEDED after ${Math.round(elapsed / 1000)}s — forcing finish`);
        const records = materializeArtifacts(stage, []);
        const result = {
          schema_version: 1, node_id: stage.nodeId, visit_id: stage.visitId, status: "failed",
          summary: `Stage overran its ${Math.round(STAGE_BUDGET / 1000)}s budget without calling finish.`,
          artifacts: records, issues: [{ message: "stage budget exceeded" }],
        };
        fs.mkdirSync(path.dirname(stage.resultPath), { recursive: true });
        fs.writeFileSync(stage.resultPath, JSON.stringify(result, null, 2));
        return { done: true, overBudget: true, turns: turn, artifacts: records, summary: result.summary };
      }
      nudges += 1;
      messages.push({
        role: "user",
        content: `BUDGET ALERT: ${Math.round(elapsed / 1000)}s used of ${Math.round(STAGE_BUDGET / 1000)}s. Stop exploring now. Write the remaining deliverables immediately, then call finish with the artifacts you have.`,
      });
    }
    const msg = await chat(model, messages, tools);
    messages.push({ role: "assistant", content: msg.content ?? "", ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}) });
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      messages.push({ role: "user", content: "Continue: use the tools. Call finish only after every required deliverable is on disk." });
      continue;
    }
    for (const call of msg.tool_calls) {
      toolCalls += 1;
      if (toolCalls > 10) {
        messages.push({ role: "user", content: "Tool-call limit reached. Stop exploring and call finish NOW with the required artifacts already written." });
      }
      const name = call.function?.name;
      let args = {};
      try {
        args = JSON.parse(call.function?.arguments || "{}");
      } catch {
        args = {};
      }
      if (name === "finish") {
        const records = materializeArtifacts(stage, args.artifacts ?? []);
        const result = {
          schema_version: 1,
          node_id: stage.nodeId,
          visit_id: stage.visitId,
          status: "success",
          summary: String(args.summary ?? "").slice(0, 4000),
          artifacts: records,
          issues: (args.issues ?? []).map((m) => ({ message: String(m).slice(0, 500) })),
          ...(args.decision ? { decision: String(args.decision) } : {}),
        };
        fs.mkdirSync(path.dirname(stage.resultPath), { recursive: true });
        fs.writeFileSync(stage.resultPath, JSON.stringify(result, null, 2));
        return { done: true, turns: turn, artifacts: records, summary: result.summary, decision: result.decision, usage: messages.length };
      }
      const handler = handlers[name];
      let output;
      try {
        output = handler ? handler(args) : `ERROR: unknown tool ${name}`;
      } catch (error) {
        output = `ERROR: ${error.message}`;
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: clip(String(output)) });
    }
    console.log(`    turn ${turn}: ${msg.tool_calls.map((c) => c.function?.name).join(", ")}`);
  }
  return { done: false, turns: MAX_TURNS };
}

// ---------------------------------------------------------------- driver
async function main() {
  const plans = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "plans.json"), "utf8")).plans;
  const planId = flag("plan", "paper");
  const existingRun = flag("run-id", null);
  const plan = plans.find((p) => p.plan === planId);
  if (!plan && !existingRun) throw new Error(`unknown plan "${planId}"; available: ${plans.map((p) => p.plan).join(", ")}`);
  const prompt = flag("prompt", plan?.prompt ?? "");
  const model = loadModel();
  console.log(`model: ${model.model} via ${model.provider} (${model.baseUrl})`);

  let stage = existingRun ? cli("context", existingRun) : cli("run", plan.workflow, JSON.stringify({ prompt }));
  console.log(`workflow: ${stage.workflowId}\nprompt: ${prompt}\n`);
  const runId = stage.runId;
  const runDir = path.join(RUNS, runId);
  fs.mkdirSync(runDir, { recursive: true });
  console.log(`run: ${runId}\n`);

  const history = [];
  for (let guard = 0; guard < 80; guard += 1) {
    console.log(`== stage ${stage.nodeId} (${stage.skill?.id}) visit ${stage.visitId}`);
    const started = Date.now();
    const outcome = await runStage(model, stage, runDir);
    if (!outcome.done) throw new Error(`stage ${stage.nodeId} did not finish within ${MAX_TURNS} turns`);
    console.log(`   ✔ ${outcome.turns} turns, ${outcome.artifacts.length} artifacts, ${Math.round((Date.now() - started) / 1000)}s`);
    console.log(`   summary: ${outcome.summary.slice(0, 220).replace(/\n/g, " ")}`);
    if (outcome.decision) console.log(`   decision: ${outcome.decision}`);
    history.push({ node: stage.nodeId, artifacts: outcome.artifacts.map((a) => `${stage.nodeId}:${a.name}`) });

    const res = cli("submit", runId, stage.nodeId, stage.visitId);
    if (res.status === "completed") {
      console.log(`\nDONE. run dir: ${runDir}`);
      const state = JSON.parse(fs.readFileSync(path.join(runDir, "state.json"), "utf8"));
      for (const [key, rec] of Object.entries(state.artifacts ?? {})) {
        const file = path.join(runDir, "stages", rec.nodeId, "visits", rec.visitId, "outputs", rec.relativePath);
        console.log(`  ${key.padEnd(34)} ${fs.existsSync(file) ? `${fs.statSync(file).size}B` : "MISSING"} ${file}`);
      }
      const final = state.artifacts?.["format:final_paper"] ?? Object.entries(state.artifacts ?? {}).find(([k]) => /paper/i.test(k))?.[1];
      if (final) {
        const file = path.join(runDir, "stages", final.nodeId, "visits", final.visitId, "outputs", final.relativePath);
        if (fs.existsSync(file)) {
          fs.copyFileSync(file, path.join(RUNS, "samples", `${plan.plan}-real.md`));
          console.log(`\npaper copy: .skill-workflows/runs/samples/${plan.plan}-real.md`);
        }
      }
      return;
    }
    if (!res.next) throw new Error(`engine returned no next stage: ${JSON.stringify(res).slice(0, 300)}`);
    stage = res.next;
  }
  throw new Error("run did not terminate");
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  process.exit(1);
});
