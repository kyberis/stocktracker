#!/usr/bin/env npx tsx
/**
 * Enable portfolio_anomaly_agent globally and add portfolio_anomaly to ProdOps
 * enabled event types (global + linked recipient filters when present).
 *
 * Usage:
 *   npx tsx scripts/enable-portfolio-anomaly-agent.ts
 *   npx tsx scripts/enable-portfolio-anomaly-agent.ts --off
 */

import { ensureInitialized } from "../src/lib/db/client";
import {
  getProdOpsConfig,
  isFeatureEnabled,
  setFeatureEnabled,
  setProdOpsConfig,
} from "../src/lib/db/settings";
import type { ProdOpsEventType } from "../src/lib/types";

function withEvent(
  types: ProdOpsEventType[],
  event: ProdOpsEventType,
  enabled: boolean,
): ProdOpsEventType[] {
  const set = new Set(types);
  if (enabled) set.add(event);
  else set.delete(event);
  return [...set];
}

async function main() {
  const off = process.argv.includes("--off");
  const enable = !off;
  await ensureInitialized();

  await setFeatureEnabled("portfolio_anomaly_agent", enable);
  const flagOn = await isFeatureEnabled("portfolio_anomaly_agent");

  const config = await getProdOpsConfig();
  const next = {
    ...config,
    enabledEventTypes: withEvent(config.enabledEventTypes, "portfolio_anomaly", enable),
    recipient: config.recipient
      ? {
          ...config.recipient,
          enabledEventTypes: withEvent(
            config.recipient.enabledEventTypes,
            "portfolio_anomaly",
            enable,
          ),
        }
      : null,
  };
  await setProdOpsConfig(next);

  console.log(
    enable
      ? "portfolio_anomaly_agent enabled; ProdOps event portfolio_anomaly enabled"
      : "portfolio_anomaly_agent disabled; ProdOps event portfolio_anomaly disabled",
  );
  console.log(`flag=${flagOn} prodopsEnabledTypes=${next.enabledEventTypes.join(",")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
