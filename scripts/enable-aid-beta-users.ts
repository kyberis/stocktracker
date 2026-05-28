#!/usr/bin/env npx tsx
/**
 * Enable aid_beta for specific users (per-user override) and/or globally.
 *
 * Usage:
 *   npx tsx scripts/enable-aid-beta-users.ts user@example.com other@example.com
 *   npx tsx scripts/enable-aid-beta-users.ts --global
 *   npx tsx scripts/enable-aid-beta-users.ts --global user@example.com
 *   npx tsx scripts/enable-aid-beta-users.ts --off user@example.com
 */

import { ensureInitialized } from "../src/lib/db/client";
import { findUserByEmail } from "../src/lib/db/users";
import { setFeatureEnabled, setFeatureFlagOverride } from "../src/lib/db/settings";

async function main() {
  const args = process.argv.slice(2);
  const off = args.includes("--off");
  const global = args.includes("--global");
  const emails = args.filter((a) => !a.startsWith("--"));

  await ensureInitialized();

  if (global) {
    await setFeatureEnabled("aid_beta", !off);
    console.log(off ? "aid_beta disabled globally" : "aid_beta enabled globally");
  }

  for (const email of emails) {
    const user = await findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      console.warn(`User not found: ${email}`);
      continue;
    }
    await setFeatureFlagOverride("aid_beta", user.id, !off);
    console.log(`${off ? "Disabled" : "Enabled"} aid_beta for ${email} (${user.id})`);
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
