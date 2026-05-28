#!/usr/bin/env npx tsx
/**
 * Enable the aid_beta platform feature flag globally (platform_settings).
 *
 * Usage:
 *   npx tsx scripts/enable-aid-beta.ts
 *   npx tsx scripts/enable-aid-beta.ts --off
 */

import { ensureInitialized } from "../src/lib/db/client";
import { setFeatureEnabled } from "../src/lib/db/settings";

async function main() {
  const off = process.argv.includes("--off");
  await ensureInitialized();
  await setFeatureEnabled("aid_beta", !off);
  console.log(off ? "aid_beta disabled globally" : "aid_beta enabled globally");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
