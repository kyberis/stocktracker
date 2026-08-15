import { describe, expect, it } from "vitest";
import * as email from "@/lib/email";
import { buildWeeklyDigestEmailHtml } from "@/lib/weekly-digest-email";
import { EMAIL_TEMPLATE_SEEDS } from "@/lib/db/email-template-seeds";
import { CRON_REGISTRY } from "@/lib/cron-registry";
import {
  EMAIL_FLOWS,
  HARDCODED_EMAIL_SENDERS,
  MIGRATION_SEEDED_TEMPLATE_SLUGS,
  computeFlowStatus,
} from "./registry";

const seedSlugs = new Set(EMAIL_TEMPLATE_SEEDS.map((seed) => seed.slug));
const migrationSlugs = new Set<string>(MIGRATION_SEEDED_TEMPLATE_SLUGS);
const cronNames = new Set(CRON_REGISTRY.map((job) => job.name));

const senderFns: Record<string, unknown> = {
  ...email,
  buildWeeklyDigestEmailHtml,
};

describe("EMAIL_FLOWS registry", () => {
  it("has unique flow ids and a valid entry node", () => {
    const ids = EMAIL_FLOWS.map((flow) => flow.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const flow of EMAIL_FLOWS) {
      expect(flow.nodes.some((node) => node.id === flow.entryNodeId)).toBe(true);
    }
  });

  it("has unique node ids and valid child edges per flow", () => {
    for (const flow of EMAIL_FLOWS) {
      const nodeIds = flow.nodes.map((node) => node.id);
      expect(new Set(nodeIds).size, flow.id).toBe(nodeIds.length);
      const known = new Set(nodeIds);
      for (const node of flow.nodes) {
        for (const child of node.children ?? []) {
          expect(known.has(child), `${flow.id}.${node.id} → ${child}`).toBe(true);
        }
        for (const edgeId of Object.keys(node.edgeLabels ?? {})) {
          expect(known.has(edgeId), `${flow.id}.${node.id} edge ${edgeId}`).toBe(true);
        }
      }
    }
  });

  it("references only known template slugs", () => {
    for (const flow of EMAIL_FLOWS) {
      for (const node of flow.nodes) {
        if (!node.templateSlug) continue;
        const known = seedSlugs.has(node.templateSlug) || migrationSlugs.has(node.templateSlug);
        expect(known, `${flow.id}.${node.id} slug ${node.templateSlug}`).toBe(true);
      }
    }
  });

  it("references only exported hardcoded senders", () => {
    for (const name of HARDCODED_EMAIL_SENDERS) {
      expect(typeof senderFns[name], name).toBe("function");
    }
    for (const flow of EMAIL_FLOWS) {
      for (const node of flow.nodes) {
        if (!node.hardcodedSender) continue;
        expect(HARDCODED_EMAIL_SENDERS).toContain(node.hardcodedSender);
      }
    }
  });

  it("references only registered cron jobs", () => {
    for (const flow of EMAIL_FLOWS) {
      for (const node of flow.nodes) {
        if (!node.cronId) continue;
        expect(cronNames.has(node.cronId), `${flow.id}.${node.id} cron ${node.cronId}`).toBe(true);
      }
    }
  });
});

describe("computeFlowStatus", () => {
  it("returns paused when any cron is paused", () => {
    expect(computeFlowStatus({ gatingFlags: [{ enabled: true }], crons: [{ paused: true }] })).toBe(
      "paused",
    );
  });

  it("returns flag_off when a gating flag is off", () => {
    expect(
      computeFlowStatus({
        gatingFlags: [{ enabled: true }, { enabled: false }],
        crons: [{}],
      }),
    ).toBe("flag_off");
  });

  it("returns enabled when gating flags are on", () => {
    expect(computeFlowStatus({ gatingFlags: [{ enabled: true }], crons: [{}] })).toBe("enabled");
  });

  it("returns always_on when there are no gating flags", () => {
    expect(computeFlowStatus({ gatingFlags: [], crons: [{}] })).toBe("always_on");
  });
});
