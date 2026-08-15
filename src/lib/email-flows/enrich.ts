import { isFeatureEnabled, listEmailTemplatesBySlugs, getTemplateSendAggregatesBySlugs } from "@/lib/db";
import type { EmailTemplate, TemplateSendWindowStats } from "@/lib/db/email-templates";
import { getCronJob } from "@/lib/cron-registry";
import type { PlatformFeature } from "@/lib/db/settings";
import { getCodeOwnedEmailPreview } from "@/lib/email";
import { buildWeeklyDigestEmailHtml } from "@/lib/weekly-digest-email";
import {
  EMAIL_FLOWS,
  HARDCODED_EMAIL_SENDERS,
  computeFlowStatus,
  listFlowCronIds,
  listFlowFeatureFlags,
  listFlowTemplateSlugs,
  type CodeOwnedPreview,
  type EnrichedEmailFlow,
  type EnrichedEmailFlowsResponse,
  type EnrichedTemplatePreview,
} from "./registry";
import { getEmailNodeEnabledMap } from "./toggles";

export type { EnrichedEmailFlow, EnrichedEmailFlowsResponse, EnrichedTemplatePreview };

function toPreview(template: EmailTemplate, stats: TemplateSendWindowStats | null): EnrichedTemplatePreview {
  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    subject: template.subject,
    subjectEs: template.subjectEs,
    bodyHtml: template.bodyHtml,
    bodyHtmlEs: template.bodyHtmlEs,
    bodyText: template.bodyText,
    bodyTextEs: template.bodyTextEs,
    category: template.category,
    stats,
  };
}

export async function enrichEmailFlows(): Promise<EnrichedEmailFlowsResponse> {
  const flagKeys = listFlowFeatureFlags();
  const cronIds = listFlowCronIds();
  const slugs = listFlowTemplateSlugs();

  const [flagEntries, templates, statsMap, nodeEnabled] = await Promise.all([
    Promise.all(flagKeys.map(async (key) => [key, await isFeatureEnabled(key)] as const)),
    listEmailTemplatesBySlugs(slugs),
    getTemplateSendAggregatesBySlugs(slugs),
    getEmailNodeEnabledMap(),
  ]);

  const flags = Object.fromEntries(flagEntries) as Record<string, boolean>;
  const crons: EnrichedEmailFlowsResponse["crons"] = {};
  for (const id of cronIds) {
    const job = getCronJob(id);
    if (job) {
      crons[id] = {
        name: job.name,
        path: job.path,
        schedule: job.schedule,
        description: job.description,
        paused: job.paused,
      };
    }
  }

  const templatesBySlug: Record<string, EnrichedTemplatePreview> = {};
  for (const template of templates) {
    templatesBySlug[template.slug] = toPreview(template, statsMap.get(template.slug) ?? null);
  }

  const flows: EnrichedEmailFlow[] = EMAIL_FLOWS.map((flow) => {
    const gating = (flow.gatingFlags ?? []).map((key: PlatformFeature) => ({
      enabled: flags[key] === true,
    }));
    const flowCronIds = new Set(flow.nodes.map((node) => node.cronId).filter(Boolean) as string[]);
    const flowCrons = [...flowCronIds].map((id) => crons[id] ?? {});
    return {
      ...flow,
      status: computeFlowStatus({ gatingFlags: gating, crons: flowCrons }),
    };
  });

  const codePreviews: Record<string, CodeOwnedPreview> = {};
  for (const sender of HARDCODED_EMAIL_SENDERS) {
    if (sender === "buildWeeklyDigestEmailHtml") {
      const html = buildWeeklyDigestEmailHtml(
        "Your portfolio was steady this week, led by AAPL.",
        {
          totalValue: 24500,
          weekChange: 320,
          currency: "EUR",
          bestPerformer: { ticker: "AAPL", changePct: 2.4 },
          dividendsReceived: 12.5,
        },
        process.env.APP_BASE_URL || "https://trefolio.com",
        "2026-08-03",
        "2026-08-10",
      );
      codePreviews[sender] = {
        subject: "Your Weekly Portfolio Digest — 2026-08-03 to 2026-08-10",
        subjectEs: "Tu resumen semanal de cartera — 2026-08-03 a 2026-08-10",
        bodyHtml: html,
        bodyHtmlEs: html,
      };
      continue;
    }
    const en = getCodeOwnedEmailPreview(sender, "en");
    const es = getCodeOwnedEmailPreview(sender, "es");
    codePreviews[sender] = {
      subject: en.subject,
      subjectEs: es.subject,
      bodyHtml: en.html,
      bodyHtmlEs: es.html,
    };
  }

  return { flows, flags, crons, templates: templatesBySlug, nodeEnabled, codePreviews };
}
