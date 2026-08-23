import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CRON_REGISTRY } from "./cron-registry";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("CRON_REGISTRY", () => {
  it("keeps active schedules aligned with vercel.json", () => {
    const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")) as {
      crons: Array<{ path: string; schedule: string }>;
    };
    const byPath = new Map(vercel.crons.map((c) => [c.path, c.schedule]));

    for (const job of CRON_REGISTRY) {
      if (job.paused) {
        expect(byPath.has(job.path)).toBe(false);
        continue;
      }
      expect(byPath.get(job.path), job.name).toBe(job.schedule);
    }
  });

  it("uses hourly backups for kick-on-write queues and */5 for screening-recover", () => {
    expect(CRON_REGISTRY.find((j) => j.name === "prodops-dispatch")?.schedule).toBe("0 * * * *");
    expect(CRON_REGISTRY.find((j) => j.name === "feedback-pipeline")?.schedule).toBe("0 * * * *");
    expect(CRON_REGISTRY.find((j) => j.name === "support-return-watch")?.schedule).toBe("0 * * * *");
    expect(CRON_REGISTRY.find((j) => j.name === "screening-recover")?.schedule).toBe("*/5 * * * *");
  });

  it("uses lazy/less-frequent schedules for warmer crons", () => {
    expect(CRON_REGISTRY.find((j) => j.name === "moat-sync")?.schedule).toBe("0 5 * * *");
    expect(CRON_REGISTRY.find((j) => j.name === "aid-digest")?.schedule).toBe("0 8 * * *");
    expect(CRON_REGISTRY.find((j) => j.name === "aid-finpulse")?.schedule).toBe("0 */6 * * *");
    expect(CRON_REGISTRY.find((j) => j.name === "coverage-reconcile")?.schedule).toBe("15 2 * * 0");
  });

  it("merges lifecycle emails daily and keeps trial-expiration as a daily backup", () => {
    expect(CRON_REGISTRY.find((j) => j.name === "lifecycle-emails")?.schedule).toBe("0 10 * * *");
    expect(CRON_REGISTRY.find((j) => j.name === "trial-expiration")?.schedule).toBe("0 9 * * *");
    expect(CRON_REGISTRY.some((j) => j.name === "trial-invitations")).toBe(false);
    expect(CRON_REGISTRY.some((j) => j.name === "lifecycle-activation")).toBe(false);
    expect(CRON_REGISTRY.some((j) => j.name === "lifecycle-winback")).toBe(false);
    expect(CRON_REGISTRY.find((j) => j.name === "digest-email")?.paused).toBe(true);
  });

  it("lists every registry path in middleware PUBLIC_API_ROUTES", () => {
    const middleware = readFileSync(join(root, "src/middleware.ts"), "utf8");
    for (const job of CRON_REGISTRY) {
      expect(middleware.includes(`"${job.path}"`), job.path).toBe(true);
    }
    for (const alias of [
      "/api/cron/trial-invitations",
      "/api/cron/lifecycle-activation",
      "/api/cron/lifecycle-winback",
    ]) {
      expect(middleware.includes(`"${alias}"`), alias).toBe(true);
    }
  });
});

