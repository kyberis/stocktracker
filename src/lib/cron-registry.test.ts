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
});
