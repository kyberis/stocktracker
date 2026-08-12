/**
 * Create a draft experiment from the CLI (for LLM / local use).
 *
 * Usage:
 *   npx tsx scripts/create-experiment.ts \
 *     --key my_feature_test \
 *     --name "My feature test" \
 *     --variants control:50,treatment:50 \
 *     --metrics my_feature_cta,holding_add \
 *     [--description "..."]
 *
 * Requires DATABASE_URL (or local Turso) the same way as the app.
 * Leaves status=draft — launch from /admin/experiments.
 */

import { createExperiment, type ExperimentVariant } from "../src/lib/db/experiments";

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function parseVariants(raw: string): ExperimentVariant[] {
  return raw.split(",").map((part) => {
    const [key, weightRaw] = part.trim().split(":");
    return { key: (key || "").trim(), weight: Number(weightRaw) || 0 };
  });
}

async function main() {
  const key = arg("key");
  const name = arg("name");
  const variantsRaw = arg("variants");
  const metricsRaw = arg("metrics");
  const description = arg("description") || "";

  if (!key || !name || !variantsRaw || !metricsRaw) {
    console.error(
      "Required: --key --name --variants control:50,treatment:50 --metrics event_a,event_b",
    );
    process.exit(1);
  }

  const experiment = await createExperiment({
    key,
    name,
    description,
    variants: parseVariants(variantsRaw),
    metrics: metricsRaw.split(",").map((m) => m.trim()).filter(Boolean),
  });

  console.log(JSON.stringify(experiment, null, 2));
  console.log("\nDraft created. Launch from /admin/experiments when ready.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
