#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const tex = process.argv[2];
if (!tex) throw new Error("Usage: node scripts/compile-paper.mjs <final_paper.tex>");
const file = path.resolve(tex);
if (!fs.existsSync(file)) throw new Error(`LaTeX file not found: ${file}`);
const dir = path.dirname(file);
const tectonic = process.env.TECTONIC_BIN || "tectonic";
try {
  execFileSync(tectonic, ["--keep-logs", "--keep-intermediates", path.basename(file)], {
    cwd: dir,
    stdio: "inherit",
  });
} catch (error) {
  console.error("Tectonic compilation failed. Check final_paper.log.");
  process.exit(error.status || 1);
}
const pdf = file.replace(/\.tex$/i, ".pdf");
const info = execFileSync("pdfinfo", [pdf], { encoding: "utf8" });
const pages = Number(/^Pages:\s+(\d+)/m.exec(info)?.[1] || 0);
if (!pages) throw new Error("Compiled PDF has no readable page count");
console.log(JSON.stringify({ tex: file, pdf, pages, backend: "tectonic" }, null, 2));
if (pages < 15) {
  console.error(`PDF has only ${pages} pages; expected a long-form paper (target ≈20).`);
  process.exit(2);
}
