#!/usr/bin/env node
/** Run SkillGraph stages through the installed Pi RPC harness, not a separate
 * OpenAI-compatible client. Pi keeps its normal provider/model/tool setup. */
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PI = process.env.PI_CLI || "/home/z/桌面/yst/pi-web/node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js";
const argv = process.argv.slice(2);
const arg = (name, fallback) => { const i=argv.indexOf(`--${name}`); return i>=0 ? (argv[i+1] ?? true) : fallback; };
const planId = arg("plan", "paper");
const prompt = arg("prompt", "");
const maxStages = Number(arg("max-stages", 40));
const plans = JSON.parse(fs.readFileSync(path.join(ROOT,"scripts/plans.json"),"utf8")).plans;
const plan = plans.find((p) => p.plan === planId);
if (!plan) throw new Error(`Unknown plan: ${planId}`);

function cli(...args) {
  const out = execFileSync("node", [path.join(ROOT,"dist/cli.js"),...args], {cwd:ROOT,encoding:"utf8"});
  return JSON.parse(out);
}
function loadSkills(stage) {
  const pins = stage.skills?.length ? stage.skills : [stage.skill];
  return pins.map((p) => ({id:p.id, path:p.filePath, content:fs.readFileSync(p.filePath,"utf8")}));
}
function piStagePrompt(stage, skills) {
  return `You are executing exactly one SkillGraph stage. Do not do later stages.\n\n`+
    `STAGE: ${stage.nodeId} visit=${stage.visitId}\n`+
    `TASK:\n${stage.task}\n\n`+
    `INPUTS (read these files when they are paths):\n${JSON.stringify(stage.inputs,null,2)}\n\n`+
    `OUTPUT DIRECTORY: ${stage.outputDirectory}\n`+
    `REQUIRED OUTPUTS: ${JSON.stringify(stage.requiredOutputs)}\n`+
    `RESULT PATH: ${stage.resultPath}\n\n`+
    `ACTIVE SKILLS:\n${skills.map(s=>`### ${s.id} (${s.path})\n${s.content}`).join("\n\n")}\n\n`+
    `Use your native read/bash/write tools. Perform real work, compute real numbers, and write every required artifact. `+
    `Then write node_result.json with schema_version 1, this node_id and visit_id, status success, summary, artifacts, issues, and any required decision. Do not invent missing upstream data.`;
}
async function runPi(message) {
  return new Promise((resolve,reject)=>{
    const args=[PI,"--mode","rpc","--no-session"];
    if(process.env.PI_PROVIDER && process.env.PI_MODEL) args.push("--provider",process.env.PI_PROVIDER,"--model",process.env.PI_MODEL);
    const child=spawn(process.execPath,args,{cwd:ROOT,env:process.env,stdio:["pipe","pipe","pipe"]});
    let settled=false, lastText="", agentError="";
    const rl=readline.createInterface({input:child.stdout});
    rl.on("line",line=>{ try { const e=JSON.parse(line); if(e.type==="message_update" && e.assistantMessageEvent?.type==="text_delta") lastText+=e.assistantMessageEvent.delta; if(e.type==="message_end" && e.message?.role==="assistant" && e.message?.stopReason==="error") agentError=e.message.errorMessage || "Pi model error"; if(e.type==="agent_settled"&&!settled){settled=true; child.stdin.end(); if(agentError) reject(new Error(agentError)); else resolve(lastText);} } catch {} });
    let err=""; child.stderr.on("data",d=>err+=d);
    child.on("error",reject); child.on("exit",code=>{if(!settled) reject(new Error(`Pi exited ${code}: ${err.slice(-1000)}`));});
    child.stdin.write(JSON.stringify({id:"stage",type:"prompt",message})+"\n"); child.stdin.flush?.();
  });
}
async function main(){
  let stage=prompt ? cli("run",plan.workflow,JSON.stringify({prompt})) : cli("run",plan.workflow,JSON.stringify({prompt:plan.prompt}));
  for(let i=0;i<maxStages;i++){
    console.log(`== ${stage.nodeId} (${stage.skill?.id}${stage.skills?.length>1?` +${stage.skills.length-1}`:""})`);
    await runPi(piStagePrompt(stage,loadSkills(stage)));
    if (!fs.existsSync(stage.resultPath)) throw new Error(`Pi did not write node_result.json for ${stage.nodeId}; run ${stage.runId} remains active`);
    const res=cli("submit",stage.runId,stage.nodeId,stage.visitId);
    if(res.status==="completed"){console.log(`DONE ${stage.runId}`);return;}
    if(!res.next) throw new Error("Pi stage submitted without next context");
    stage=res.next;
  }
  throw new Error("max stages exceeded");
}
main().catch(e=>{console.error(e.stack||e);process.exit(1)});
