#!/usr/bin/env node
/**
 * Local gates that CI enforces on every PR. Run before opening/updating a PR:
 *   npm run prepr
 *
 * Mirrors the recurring failures agents otherwise discover only after CI:
 * - eslint errors (quality job)
 * - feature guard (release note + product spec + landing review)
 * - knowledge base link lint
 */

import { spawnSync } from "node:child_process";

const steps = [
  {
    name: "lint (errors only)",
    command: "npm",
    args: ["run", "lint", "--", "--quiet"],
  },
  {
    name: "feature guard",
    command: "npm",
    args: ["run", "feature:guard"],
    hint: [
      "If landing review is missing for a type:\"feature\" change:",
      "  • Update src/app/landing/page.tsx, OR",
      "  • Run: npm run feature:landing-reviewed -- \"<version>: <why not on landing>\"",
      "    (rewrites .cursor/feature-gate.json so CI sees landingPageReviewed in the diff)",
    ].join("\n"),
  },
  {
    name: "knowledge lint",
    command: "npm",
    args: ["run", "knowledge:lint"],
  },
];

let failed = false;

for (const step of steps) {
  console.log(`\n==> prepr: ${step.name}`);
  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    failed = true;
    console.error(`\nprepr failed at: ${step.name}`);
    if (step.hint) console.error(step.hint);
    process.exit(result.status ?? 1);
  }
}

if (!failed) {
  console.log("\nprepr passed. Safe to open/update the PR.");
}
