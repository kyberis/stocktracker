#!/usr/bin/env node
/**
 * Ensures IdP-related env keys exist in each app's `.env.local` for the
 * unified local stack (trefolio + accounts + Clara + Will).
 *
 * - Never overwrites an existing `KEY=value` line (only appends missing keys).
 * - Syncs `IDP_SERVICE_TOKEN` across all four when missing anywhere.
 * - Syncs trefolio OAuth secret between Warren and IdP when missing.
 *
 * Run from repo root:
 *   node scripts/ensure-unified-dev-env.mjs
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

const TREFOLIO = resolve(ROOT, ".env.local");
const ACCOUNTS = resolve(ROOT, "external/accounts/.env.local");
const CLARA = resolve(ROOT, "external/etracker/.env.local");
const WILL = resolve(ROOT, "external/notetaker/.env.local");

const DEV_DEFAULTS = {
  trefolioOAuthSecret: "dev-trefolio-secret",
  claraOAuthSecret: "dev-clara-secret",
  willOAuthSecret: "dev-will-secret",
};

function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function hasKey(text, key) {
  return new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=`, "m").test(text);
}

function appendBlock(file, lines) {
  const banner = "\n# >>> unified-dev (ensure-unified-dev-env.mjs) >>>\n";
  const end = "# <<< unified-dev <<<\n";
  appendFileSync(file, `${banner}${lines.join("\n")}\n${end}`, "utf8");
}

function readRaw(p) {
  if (!existsSync(p)) return "";
  return readFileSync(p, "utf8");
}

function ensureFile(p) {
  if (!existsSync(p)) {
    writeFileSync(p, "# created by ensure-unified-dev-env.mjs\n", "utf8");
  }
}

function main() {
  const notes = [];
  for (const p of [TREFOLIO, ACCOUNTS, CLARA, WILL]) ensureFile(p);

  const rawT = readRaw(TREFOLIO);
  const rawA = readRaw(ACCOUNTS);
  const rawC = readRaw(CLARA);
  const rawW = readRaw(WILL);

  const envT = parseEnv(rawT);
  const envA = parseEnv(rawA);
  const envC = parseEnv(rawC);
  const envW = parseEnv(rawW);

  let serviceToken =
    envT.IDP_SERVICE_TOKEN?.trim() ||
    envA.IDP_SERVICE_TOKEN?.trim() ||
    envC.IDP_SERVICE_TOKEN?.trim() ||
    envW.IDP_SERVICE_TOKEN?.trim();
  if (!serviceToken) {
    serviceToken = randomBytes(24).toString("hex");
    notes.push("Generated new IDP_SERVICE_TOKEN (shared across apps).");
  }

  let trefolioSecret =
    envT.IDP_CLIENT_SECRET?.trim() || envA.IDP_CLIENT_SECRET_TREFOLIO?.trim();
  if (!trefolioSecret) {
    trefolioSecret = DEV_DEFAULTS.trefolioOAuthSecret;
    notes.push("Using dev default trefolio OAuth secret (dev-trefolio-secret).");
  }

  const claraSecret =
    envC.IDP_CLIENT_SECRET?.trim() ||
    envA.IDP_CLIENT_SECRET_CLARA?.trim() ||
    DEV_DEFAULTS.claraOAuthSecret;

  const willSecret =
    envW.IDP_CLIENT_SECRET?.trim() ||
    envA.IDP_CLIENT_SECRET_WILL?.trim() ||
    DEV_DEFAULTS.willOAuthSecret;

  const jobs = [
    [
      "trefolio",
      TREFOLIO,
      rawT,
      () => {
        const lines = [];
        if (!hasKey(rawT, "IDP_BASE_URL")) lines.push("IDP_BASE_URL=http://localhost:3300");
        if (!hasKey(rawT, "IDP_ISSUER")) lines.push("IDP_ISSUER=https://user.trefolio-dev.com");
        if (!hasKey(rawT, "IDP_CLIENT_ID")) lines.push("IDP_CLIENT_ID=trefolio");
        if (!hasKey(rawT, "IDP_CLIENT_SECRET")) lines.push(`IDP_CLIENT_SECRET=${trefolioSecret}`);
        if (!hasKey(rawT, "IDP_SERVICE_TOKEN")) lines.push(`IDP_SERVICE_TOKEN=${serviceToken}`);
        return lines;
      },
    ],
    [
      "accounts",
      ACCOUNTS,
      rawA,
      () => {
        const lines = [];
        if (!hasKey(rawA, "IDP_ISSUER")) lines.push("IDP_ISSUER=https://user.trefolio-dev.com");
        if (!hasKey(rawA, "IDP_SERVER_ORIGIN")) lines.push("IDP_SERVER_ORIGIN=http://127.0.0.1:3300");
        if (!hasKey(rawA, "IDP_CLIENT_SECRET_TREFOLIO")) lines.push(`IDP_CLIENT_SECRET_TREFOLIO=${trefolioSecret}`);
        if (!hasKey(rawA, "IDP_CLIENT_SECRET_CLARA")) lines.push(`IDP_CLIENT_SECRET_CLARA=${claraSecret}`);
        if (!hasKey(rawA, "IDP_CLIENT_SECRET_WILL")) lines.push(`IDP_CLIENT_SECRET_WILL=${willSecret}`);
        if (!hasKey(rawA, "IDP_SERVICE_TOKEN")) lines.push(`IDP_SERVICE_TOKEN=${serviceToken}`);
        return lines;
      },
    ],
    [
      "clara",
      CLARA,
      rawC,
      () => {
        const lines = [];
        if (!hasKey(rawC, "IDP_BASE_URL")) lines.push("IDP_BASE_URL=http://localhost:3300");
        if (!hasKey(rawC, "IDP_CLIENT_ID")) lines.push("IDP_CLIENT_ID=clara");
        if (!hasKey(rawC, "IDP_CLIENT_SECRET")) lines.push(`IDP_CLIENT_SECRET=${claraSecret}`);
        if (!hasKey(rawC, "IDP_SERVICE_TOKEN")) lines.push(`IDP_SERVICE_TOKEN=${serviceToken}`);
        return lines;
      },
    ],
    [
      "will",
      WILL,
      rawW,
      () => {
        const lines = [];
        if (!hasKey(rawW, "IDP_BASE_URL")) lines.push("IDP_BASE_URL=http://localhost:3300");
        if (!hasKey(rawW, "IDP_CLIENT_ID")) lines.push("IDP_CLIENT_ID=will");
        if (!hasKey(rawW, "IDP_CLIENT_SECRET")) lines.push(`IDP_CLIENT_SECRET=${willSecret}`);
        if (!hasKey(rawW, "IDP_SERVICE_TOKEN")) lines.push(`IDP_SERVICE_TOKEN=${serviceToken}`);
        return lines;
      },
    ],
  ];

  let any = false;
  for (const [name, p, , build] of jobs) {
    const lines = build();
    if (lines.length) {
      appendBlock(p, lines);
      console.log(`${name}: appended ${lines.length} key(s) → ${p}`);
      any = true;
    } else {
      console.log(`${name}: OK`);
    }
  }

  if (!any) console.log("(No missing IdP keys — nothing appended.)");
  if (notes.length) console.log("\n" + [...new Set(notes)].join("\n"));
  console.log("\nNext: export PATH=\"/opt/homebrew/opt/node@22/bin:$PATH\" && npm run dev:unified");
}

main();
