import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const SRC_ROOT = join(__dirname, "..", "..", "src");
const ALLOWED_CALLERS = new Set([
  join(SRC_ROOT, "hooks", "use-upcoming-ex-dividends.ts"),
  join(SRC_ROOT, "app", "api", "ex-dividend", "route.ts"),
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * TRF-004-B: "one metric, one calculation" applied to the ex-dividend list —
 * every screen must go through useUpcomingExDividends (which dedupes tickers
 * before the /api/ex-dividend cap) rather than re-implementing its own
 * fetch+parse. This is the guard TRF-026 exists because the app didn't have.
 */
describe("useUpcomingExDividends is the only /api/ex-dividend caller", () => {
  it("no component fetches /api/ex-dividend directly", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      if (ALLOWED_CALLERS.has(file)) continue;
      const content = readFileSync(file, "utf-8");
      if (content.includes("/api/ex-dividend")) offenders.push(file.replace(SRC_ROOT, "src"));
    }
    expect(offenders, `Fetch /api/ex-dividend via useUpcomingExDividends instead: ${offenders.join(", ")}`).toEqual([]);
  });
});
