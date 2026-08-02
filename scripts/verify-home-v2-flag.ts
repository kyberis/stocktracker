#!/usr/bin/env npx tsx
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { ensureInitialized } from "../src/lib/db/client";
import { findUserByEmail } from "../src/lib/db/users";
import { isFeatureEnabledForUser, resolveAllFlagsForUser } from "../src/lib/db/settings";

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
  await ensureInitialized();
  const email = process.argv[2] || "suarez84@gmail.com";
  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }
  const on = await isFeatureEnabledForUser("home_v2", user.id);
  const flags = await resolveAllFlagsForUser(user.id);
  console.log(
    JSON.stringify(
      {
        email: user.email,
        userId: user.id,
        home_v2: on,
        resolveAllFlags_home_v2: flags.home_v2,
      },
      null,
      2,
    ),
  );
  if (!on) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
