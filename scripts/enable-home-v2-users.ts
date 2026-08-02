#!/usr/bin/env npx tsx
/**
 * Enable home_v2 for specific users (per-user override) and/or globally.
 *
 * Usage:
 *   npx tsx scripts/enable-home-v2-users.ts user@example.com
 *   npx tsx scripts/enable-home-v2-users.ts --off user@example.com
 *   npx tsx scripts/enable-home-v2-users.ts --global
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { ensureInitialized } from "../src/lib/db/client";
import { findUserByEmail } from "../src/lib/db/users";
import { setFeatureEnabled, setFeatureFlagOverride } from "../src/lib/db/settings";

function loadEnvFile(name: string) {
  const envPath = resolve(process.cwd(), name);
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env.production.local");
  const args = process.argv.slice(2);
  const off = args.includes("--off");
  const global = args.includes("--global");
  const emails = args.filter((a) => !a.startsWith("--"));

  await ensureInitialized();

  if (global) {
    await setFeatureEnabled("home_v2", !off);
    console.log(off ? "home_v2 disabled globally" : "home_v2 enabled globally");
  }

  for (const email of emails) {
    const user = await findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      console.warn(`User not found: ${email}`);
      continue;
    }
    await setFeatureFlagOverride("home_v2", user.id, !off);
    console.log(`${off ? "Disabled" : "Enabled"} home_v2 for ${email} (${user.id})`);
  }

  if (!global && emails.length === 0) {
    console.error("Provide --global and/or one or more user emails.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
