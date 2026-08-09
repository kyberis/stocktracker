#!/usr/bin/env npx tsx
/**
 * Enable screening_estebaranz_eval_enabled globally (platform_settings).
 *
 * Usage (prod Turso via .env.production.local):
 *   set -a && source .env.production.local && set +a && npx tsx scripts/enable-screening-estebaranz-eval.ts
 *   … --off
 */

import { ensureInitialized } from "../src/lib/db/client";
import { isFeatureEnabled, setFeatureEnabled } from "../src/lib/db/settings";

async function main() {
  const off = process.argv.includes("--off");
  await ensureInitialized();
  await setFeatureEnabled("screening_estebaranz_eval_enabled", !off);
  const on = await isFeatureEnabled("screening_estebaranz_eval_enabled");
  console.log(
    off
      ? "screening_estebaranz_eval_enabled disabled globally"
      : `screening_estebaranz_eval_enabled enabled globally (readback=${on})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
