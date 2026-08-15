import { isFeatureEnabled, listEmailTemplatesBySlugs, getTemplateSendAggregatesBySlugs } from "@/lib/db";
import type { EmailTemplate, TemplateSendWindowStats } from "@/lib/db/email-templates";
import { getCronJob } from "@/lib/cron-registry";
import type { PlatformFeature } from "@/lib/db/settings";
import {
  EMAIL_FLOWS,
  computeFlowStatus,
  listFlowCronIds,
  listFlowFeatureFlags,
  listFlowTemplateSlugs,
  type EnrichedEmailFlow,
  type EnrichedEmailFlowsResponse,
  type EnrichedTemplatePreview,
} from "./registry";

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

  const [flagEntries, templates, statsMap] = await Promise.all([
    Promise.all(flagKeys.map(async (key) => [key, await isFeatureEnabled(key)] as const)),
    listEmailTemplatesBySlugs(slugs),
    getTemplateSendAggregatesBySlugs(slugs),
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

  return { flows, flags, crons, templates: templatesBySlug };
}
