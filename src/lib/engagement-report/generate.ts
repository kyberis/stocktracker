import { z } from "zod";
import { fetchGatewayChatCompletions } from "@/lib/ai/gateway";
import { getAiModelForFlow } from "@/lib/db/settings";
import { insertAiLog } from "@/lib/db/ai-logs";
import { incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import type { EngagementSnapshot } from "./snapshot";
import { SURVEY_TEMPLATE_IDS, SURVEY_TEMPLATES, type SurveyTemplateId } from "./templates";

const questionSchema = z.object({
  id: z.string().min(1).max(40),
  type: z.enum(["nps", "rating", "text", "single_choice"]),
  prompt: z.string().min(3).max(400),
  options: z.array(z.string().min(1).max(120)).max(8).optional(),
});

export const aiReportOutputSchema = z.object({
  narrativeSections: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        html: z.string().min(1).max(4000),
      }),
    )
    .min(2)
    .max(8),
  insights: z.array(z.string().min(1).max(400)).min(2).max(12),
  recommendations: z.array(z.string().min(1).max(400)).min(2).max(10),
  surveyProposals: z
    .array(
      z.object({
        templateId: z.enum(["winback", "missing_tool", "nps"]),
        title: z.string().min(1).max(160),
        rationale: z.string().min(1).max(800),
        targetUserIds: z.array(z.string()).max(60),
        questionsEn: z.array(questionSchema).min(1).max(4),
        questionsEs: z.array(questionSchema).min(1).max(4),
      }),
    )
    .min(1)
    .max(3),
});

export type AiReportOutput = z.infer<typeof aiReportOutputSchema>;

function compactSnapshotForPrompt(snapshot: EngagementSnapshot) {
  return {
    periodDays: snapshot.periodDays,
    totals: snapshot.totals,
    segmentCounts: Object.fromEntries(
      Object.entries(snapshot.segments).map(([k, v]) => [k, v.count]),
    ),
    powerUsers: snapshot.powerUsers.slice(0, 8),
    dormantSample: snapshot.segments.dormant.users.slice(0, 8),
    churnedSample: snapshot.segments.churned.users.slice(0, 8),
    engagedSample: snapshot.segments.engaged.users.slice(0, 8),
    toolUsage: snapshot.toolUsage,
    topEvents: snapshot.topEvents.slice(0, 15),
    mcpTools: snapshot.mcpTools.slice(0, 10),
    satisfaction: {
      submitted: snapshot.satisfaction.submitted,
      averageRating: snapshot.satisfaction.averageRating,
      ratingDistribution: snapshot.satisfaction.ratingDistribution,
      lowRaters: snapshot.satisfaction.lowRaters.slice(0, 10),
      recentComments: snapshot.satisfaction.recentComments.slice(0, 8),
    },
    feedback: {
      open: snapshot.feedback.open,
      answered: snapshot.feedback.answered,
      closed: snapshot.feedback.closed,
      recent: snapshot.feedback.recent.slice(0, 10),
    },
    emailEligibleTargets: Object.fromEntries(
      SURVEY_TEMPLATE_IDS.map((id) => [
        id,
        {
          count: snapshot.emailEligibleTargets[id].userIds.length,
          userIds: snapshot.emailEligibleTargets[id].userIds,
          rationaleHint: snapshot.emailEligibleTargets[id].rationaleHint,
        },
      ]),
    ),
    templates: SURVEY_TEMPLATE_IDS.map((id) => ({
      id,
      label: SURVEY_TEMPLATES[id].label,
      skeletonEn: SURVEY_TEMPLATES[id].questionSkeletonEn,
      skeletonEs: SURVEY_TEMPLATES[id].questionSkeletonEs,
      maxTargets: SURVEY_TEMPLATES[id].maxTargets,
    })),
  };
}

function fallbackOutput(snapshot: EngagementSnapshot): AiReportOutput {
  const engagedPct =
    snapshot.totals.totalUsers > 0
      ? Math.round((snapshot.segments.engaged.count / snapshot.totals.totalUsers) * 100)
      : 0;
  const proposals = SURVEY_TEMPLATE_IDS.map((templateId) => {
    const t = SURVEY_TEMPLATES[templateId];
    const targets = snapshot.emailEligibleTargets[templateId];
    return {
      templateId,
      title: t.label,
      rationale: targets.rationaleHint,
      targetUserIds: targets.userIds.slice(0, t.maxTargets),
      questionsEn: t.questionSkeletonEn.map((prompt, i) => ({
        id: `${templateId}_en_${i + 1}`,
        type: (templateId === "nps" && i === 0 ? "nps" : "text") as "nps" | "text",
        prompt,
      })),
      questionsEs: t.questionSkeletonEs.map((prompt, i) => ({
        id: `${templateId}_es_${i + 1}`,
        type: (templateId === "nps" && i === 0 ? "nps" : "text") as "nps" | "text",
        prompt,
      })),
    };
  }).filter((p) => p.targetUserIds.length > 0);

  return {
    narrativeSections: [
      {
        title: "Engagement overview",
        html: `<p>In the last <strong>${snapshot.periodDays} days</strong>, trefolio recorded <strong>${snapshot.totals.eventsInWindow}</strong> analytics events across <strong>${snapshot.totals.totalUsers}</strong> accounts. About <strong>${engagedPct}%</strong> of users were engaged in the last 7 days (${snapshot.segments.engaged.count} users). Warm: ${snapshot.segments.warm.count}, dormant: ${snapshot.segments.dormant.count}, churned: ${snapshot.segments.churned.count}, never active: ${snapshot.segments.never_active.count}.</p>`,
      },
      {
        title: "Tools and satisfaction",
        html: `<p>Top tool buckets by event volume: ${snapshot.toolUsage
          .slice(0, 4)
          .map((t) => `${t.label} (${t.count})`)
          .join(", ") || "n/a"}. In-app CSAT average is <strong>${snapshot.satisfaction.averageRating || "—"}</strong> from ${snapshot.satisfaction.submitted} submitted ratings. Open feedback tickets: ${snapshot.feedback.open}.</p>`,
      },
    ],
    insights: [
      `${snapshot.powerUsers.length} power users drive a large share of recent activity.`,
      `Dormant + churned cohort size: ${snapshot.segments.dormant.count + snapshot.segments.churned.count}.`,
      `Low CSAT (≤3★) sample size: ${snapshot.satisfaction.lowRaters.length}.`,
    ],
    recommendations: [
      "Email a winback survey to dormant/churned users who still allow product emails.",
      "Ask narrow-usage engaged users which tool they miss.",
      "Run an NPS pulse for engaged/warm users and recent low raters.",
    ],
    surveyProposals:
      proposals.length > 0
        ? proposals
        : [
            {
              templateId: "nps" as SurveyTemplateId,
              title: SURVEY_TEMPLATES.nps.label,
              rationale: "No email-eligible targets matched; keep ready for next cohort.",
              targetUserIds: [],
              questionsEn: SURVEY_TEMPLATES.nps.questionSkeletonEn.map((prompt, i) => ({
                id: `nps_en_${i + 1}`,
                type: (i === 0 ? "nps" : "text") as "nps" | "text",
                prompt,
              })),
              questionsEs: SURVEY_TEMPLATES.nps.questionSkeletonEs.map((prompt, i) => ({
                id: `nps_es_${i + 1}`,
                type: (i === 0 ? "nps" : "text") as "nps" | "text",
                prompt,
              })),
            },
          ],
  };
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in model output");
  return JSON.parse(body.slice(start, end + 1));
}

export async function generateEngagementNarrative(
  snapshot: EngagementSnapshot,
  options?: { headers?: Headers; adminUserId?: string },
): Promise<{ output: AiReportOutput; usedFallback: boolean; model: string }> {
  const model = await getAiModelForFlow("engagement_report");
  const compact = compactSnapshotForPrompt(snapshot);
  const systemPrompt = `You are a product analytics advisor for trefolio (European multi-currency portfolio tracker).
Write an admin-only engagement report narrative in English.
Rules:
- Be concrete: cite the numbers provided. No invented metrics.
- Name specific users by username when helpful (admin-only context).
- Do NOT give personalized investment advice.
- Propose surveys ONLY from templates: winback, missing_tool, nps.
- Adapt question wording (EN and ES). Prefer the provided skeletons.
- targetUserIds MUST be a subset of emailEligibleTargets[template].userIds.
- Return STRICT JSON matching the schema. No markdown outside JSON.
- HTML in narrativeSections may use <p>, <ul>, <li>, <strong>, <em> only.`;

  const userPrompt = `Snapshot JSON:\n${JSON.stringify(compact)}

JSON schema keys:
{
  "narrativeSections": [{"title": string, "html": string}],
  "insights": string[],
  "recommendations": string[],
  "surveyProposals": [{
    "templateId": "winback"|"missing_tool"|"nps",
    "title": string,
    "rationale": string,
    "targetUserIds": string[],
    "questionsEn": [{"id": string, "type": "nps"|"rating"|"text"|"single_choice", "prompt": string, "options"?: string[]}],
    "questionsEs": [{"id": string, "type": "nps"|"rating"|"text"|"single_choice", "prompt": string, "options"?: string[]}]
  }]
}`;

  try {
    const res = await fetchGatewayChatCompletions(
      {
        model,
        max_tokens: 3500,
        temperature: 0.35,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      },
      { headers: options?.headers },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[engagement-report] AI Gateway error:", errText.slice(0, 300));
      return { output: fallbackOutput(snapshot), usedFallback: true, model };
    }

    const aiData = await res.json();
    const content = String(aiData.choices?.[0]?.message?.content ?? "").trim();
    const tokensUsed = Number(aiData.usage?.total_tokens || 0);

    insertAiLog({
      userId: options?.adminUserId || "admin",
      source: "engagement_report",
      model,
      promptSystem: systemPrompt,
      promptUser: userPrompt.slice(0, 4000),
      durationMs: 0,
      tokensInput: Number(aiData.usage?.prompt_tokens || 0),
      tokensOutput: Number(aiData.usage?.completion_tokens || 0),
    }).catch(() => {});
    incrementGlobalAiCalls().catch(() => {});
    if (tokensUsed) incrementGlobalAiTokens(tokensUsed).catch(() => {});

    const parsed = aiReportOutputSchema.safeParse(extractJsonObject(content));
    if (!parsed.success) {
      console.error("[engagement-report] Zod parse failed:", parsed.error.message);
      return { output: fallbackOutput(snapshot), usedFallback: true, model };
    }

    // Clamp targets to eligible IDs
    const clamped: AiReportOutput = {
      ...parsed.data,
      surveyProposals: parsed.data.surveyProposals.map((p) => {
        const allowed = new Set(snapshot.emailEligibleTargets[p.templateId].userIds);
        const targetUserIds = p.targetUserIds.filter((id) => allowed.has(id)).slice(
          0,
          SURVEY_TEMPLATES[p.templateId].maxTargets,
        );
        // If model emptied targets wrongly, restore eligible defaults
        const restored =
          targetUserIds.length > 0
            ? targetUserIds
            : snapshot.emailEligibleTargets[p.templateId].userIds.slice(
                0,
                SURVEY_TEMPLATES[p.templateId].maxTargets,
              );
        return { ...p, targetUserIds: restored };
      }),
    };

    return { output: clamped, usedFallback: false, model };
  } catch (err) {
    console.error("[engagement-report] generate failed:", err);
    return { output: fallbackOutput(snapshot), usedFallback: true, model };
  }
}
