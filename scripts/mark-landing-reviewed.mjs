#!/usr/bin/env node
/**
 * Mark landing-page review complete for this PR (feature guard).
 * Rewrites .cursor/feature-gate.json so `"landingPageReviewed": true` appears
 * as an added line in the PR diff (required by scripts/check-feature-guard.mjs).
 *
 * Usage:
 *   npm run feature:landing-reviewed -- "2.5.189: Scriptable movers is Widget Setup only, not landing."
 */

import { writeFileSync } from "node:fs";

const notes = process.argv.slice(2).join(" ").trim();
if (!notes) {
  console.error(
    'Usage: npm run feature:landing-reviewed -- "<version>: <why landing was or was not updated>"',
  );
  process.exit(1);
}

const path = ".cursor/feature-gate.json";
// Put landingPageReviewed first so git diffs always include a "+" line for it
// when notes change (key reorder vs previous notes-first layout on main).
const payload = {
  landingPageReviewed: true,
  notes,
};

writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Updated ${path}`);
console.log(JSON.stringify(payload, null, 2));
