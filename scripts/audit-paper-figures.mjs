#!/usr/bin/env node
/** Structural figure audit. This is a fail-closed consistency check, not scientific or visual approval. */
import fs from 'node:fs';
import path from 'node:path';

const [texPath, inventoryPath, provenancePath] = process.argv.slice(2);
if (!texPath || !inventoryPath || !provenancePath) {
  console.error('usage: audit-paper-figures.mjs final_paper.tex figure_inventory.json figure_provenance.json');
  process.exit(2);
}
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const tex = fs.readFileSync(texPath, 'utf8');
const inventory = read(inventoryPath);
const provenance = read(provenancePath);
const records = Array.isArray(inventory) ? inventory : (inventory.figures ?? inventory.included ?? []);
const provRecords = Array.isArray(provenance) ? provenance : (provenance.figures ?? []);
const ids = records.map((r) => typeof r === 'string' ? r : r.figure_id).filter(Boolean);
const labels = [...tex.matchAll(/\\label\{(fig:[^}]+)\}/g)].map((m) => m[1]);
const refs = [...tex.matchAll(/\\(?:ref|autoref)\{(fig:[^}]+)\}/g)].map((m) => m[1]);
const figures = [...tex.matchAll(/\\begin\{figure\b/g)].length;
const errors = [];
if (ids.length < 6) errors.push(`inventory has ${ids.length} figures; fewer than 6 requires an evidence-gap report`);
if (ids.length > 10) errors.push(`inventory has ${ids.length} figures; exceeds the 10-figure planning ceiling`);
if (provRecords.length < ids.length) errors.push('provenance does not cover every inventory record');
if (!fs.existsSync(path.join(path.dirname(inventoryPath), 'figure_gap_report.md'))) errors.push('figure_gap_report.md is missing beside inventory');
for (const id of ids) {
  const rec = records.find((r) => (typeof r === 'string' ? r : r.figure_id) === id);
  if (typeof rec === 'object') {
    for (const key of ['claim_ids', 'caption', 'alt_text', 'generator', 'regenerate']) if (!rec[key]) errors.push(`${id}: missing ${key}`);
  }
}
const report = { status: errors.length ? 'fail' : 'pass', structural_only: true, tex: texPath, inventory_count: ids.length, rendered_figure_environments: figures, labels, references: refs, errors };
console.log(JSON.stringify(report, null, 2));
process.exit(errors.length ? 1 : 0);
