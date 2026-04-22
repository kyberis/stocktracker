#!/usr/bin/env tsx
/**
 * Lint the knowledge base.
 *
 * Rules:
 *   1. Every API route (`src/app/api/** /route.ts`) SHOULD be referenced by at
 *      least one product spec. Missing refs are a WARNING.
 *   2. Every .cursor/skills/engineer-* skill SHOULD be cross-linked from at
 *      least one product spec. Missing refs are a WARNING.
 *   3. Every knowledge/product-specs/*.md SHOULD contain all required template
 *      sections (## 1..## 16). Missing sections are a WARNING.
 *   4. Internal markdown links to files or headings in this repo SHOULD resolve.
 *      Broken links are an ERROR.
 *
 * Warnings exit 0; errors exit 1.
 *
 * Invoked via `npm run knowledge:lint`.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, normalize } from "node:path";

const ROOT = join(__dirname, "..");
const KB = join(ROOT, "knowledge");

let warnings = 0;
let errors = 0;

function walk(dir: string, filter: (p: string) => boolean, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry === ".next" || entry.startsWith(".git")) continue;
      walk(p, filter, out);
    } else if (filter(p)) {
      out.push(p);
    }
  }
  return out;
}

function warn(msg: string) {
  console.warn(`[warn] ${msg}`);
  warnings++;
}
function err(msg: string) {
  console.error(`[error] ${msg}`);
  errors++;
}

function readSpecs(): { file: string; src: string }[] {
  const specs: { file: string; src: string }[] = [];
  const dir = join(KB, "product-specs");
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".md") || entry === "index.md") continue;
    const p = join(dir, entry);
    specs.push({ file: p, src: readFileSync(p, "utf8") });
  }
  return specs;
}

function lintApiCoverage(specs: { file: string; src: string }[]) {
  const apiDir = join(ROOT, "src/app/api");
  const routes = walk(apiDir, (p) => p.endsWith("/route.ts") || p.endsWith("/route.tsx"));
  for (const file of routes) {
    const rel = relative(ROOT, file);
    const covered = specs.some((s) => s.src.includes(rel) || s.src.includes(rel.replace(/\\/g, "/")));
    if (!covered) warn(`API route not referenced by any product-spec: ${rel}`);
  }
}

function lintSkillsCoverage(specs: { file: string; src: string }[]) {
  const skillsDir = join(ROOT, ".cursor/skills");
  for (const entry of readdirSync(skillsDir)) {
    if (!entry.startsWith("engineer-")) continue;
    const covered = specs.some((s) => s.src.includes(`${entry}/SKILL.md`));
    if (!covered) warn(`engineer skill not referenced by any product-spec: ${entry}`);
  }
}

function lintTemplateSections(specs: { file: string; src: string }[]) {
  const required = [
    "## 1.",
    "## 2.",
    "## 3.",
    "## 4.",
    "## 5.",
    "## 6.",
    "## 7.",
    "## 8.",
    "## 11.",
    "## 13.",
    "## 15.",
  ];
  for (const { file, src } of specs) {
    for (const r of required) {
      if (!src.includes(r)) warn(`${relative(ROOT, file)} missing section "${r}"`);
    }
  }
}

function lintMarkdownLinks() {
  const mdFiles = walk(KB, (p) => p.endsWith(".md"));
  // Match markdown links, allowing balanced parens inside the URL so that
  // Next.js App Router paths like `src/app/(app)/...` resolve correctly.
  const linkRe = /\[([^\]]+)\]\(((?:[^()\s]|\([^)]*\))+)\)/g;
  for (const file of mdFiles) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(linkRe)) {
      const url = m[2].split("#")[0]; // strip anchor
      if (!url) continue;
      if (url.startsWith("http://") || url.startsWith("https://")) continue;
      if (url.startsWith("mailto:")) continue;
      // Resolve relative to the markdown file
      const target = normalize(join(dirname(file), url));
      if (!existsSync(target)) {
        // Intra-knowledge spec-to-spec links are required to resolve (hard
        // error). Links to code or other repo paths are warnings because
        // those paths move around faster than docs can track.
        const isIntraKnowledge = target.startsWith(KB);
        if (isIntraKnowledge) {
          err(`${relative(ROOT, file)} broken link: ${url}`);
        } else {
          warn(`${relative(ROOT, file)} stale repo link: ${url}`);
        }
      }
    }
  }
}

function main() {
  const specs = readSpecs();
  lintApiCoverage(specs);
  lintSkillsCoverage(specs);
  lintTemplateSections(specs);
  lintMarkdownLinks();
   
  console.log(`[knowledge:lint] ${warnings} warnings, ${errors} errors`);
  if (errors > 0) process.exit(1);
}

main();
