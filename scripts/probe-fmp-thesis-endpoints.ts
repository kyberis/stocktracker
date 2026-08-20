#!/usr/bin/env npx tsx
/**
 * Phase 0: probe FMP stable paths the thesis spec may need vs this account's plan.
 *
 * Usage:
 *   npx tsx scripts/probe-fmp-thesis-endpoints.ts
 *
 * Reads FMP_API_KEY from the environment or `.env.production.local`.
 * Prints a capabilities matrix (ok / empty / plan / error). Informational only.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { FMP_CAPABILITY_PROBE } from "../src/lib/mcp/fmp-endpoint-catalog";
import { FMP_STABLE_BASE } from "../src/lib/api-providers/fmp";

function loadDotEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = readFileSync(resolve(path), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[m[1]] = val;
    }
  } catch {
    // ignore
  }
  return out;
}

function classify(status: number, data: unknown): string {
  if (status === 401 || status === 403 || status === 402) return "plan_or_auth";
  if (status === 404) return "not_found";
  if (status < 200 || status >= 300) return `http_${status}`;
  if (data == null) return "empty";
  if (Array.isArray(data)) return data.length === 0 ? "empty_array" : `ok_array:${data.length}`;
  if (typeof data === "object") {
    const rec = data as Record<string, unknown>;
    if (typeof rec["Error Message"] === "string") return "api_error";
    if (typeof rec.error === "string") return "api_error";
    return "ok_object";
  }
  return "ok_other";
}

async function main() {
  const envFile = loadDotEnv(".env.production.local");
  const key =
    process.env.FMP_API_KEY ||
    envFile.FMP_API_KEY ||
    envFile.stocktracker_FMP_API_KEY;
  if (!key) {
    throw new Error("Missing FMP_API_KEY");
  }

  console.log(`FMP capability probe (${FMP_STABLE_BASE})`);
  console.log("path\tstatus\tclass\twhy");
  for (const row of FMP_CAPABILITY_PROBE) {
    const url = new URL(`${FMP_STABLE_BASE}/${row.path}`);
    for (const [k, v] of Object.entries(row.params)) url.searchParams.set(k, v);
    url.searchParams.set("apikey", key);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      const klass = classify(res.status, data);
      console.log(`${row.path}\t${res.status}\t${klass}\t${row.why}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 80) : "error";
      console.log(`${row.path}\t-\tnetwork\t${msg}`);
    }
  }
  console.log(
    "\nNote: earnings actual vs estimate is consensus surprise, not F5 (company guidance vs delivered).",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
