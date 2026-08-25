import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import {
  createSurveyCampaign,
  listSurveyCampaigns,
  listSurveyResponses,
  getUserSettings,
  findUserById,
} from "@/lib/db";
import {
  isSurveyTemplateId,
  type SurveyQuestionDraft,
  type SurveyTemplateId,
} from "@/lib/engagement-report/templates";

const questionSchema = z.object({
  id: z.string().min(1).max(40),
  type: z.enum(["nps", "rating", "text", "single_choice"]),
  prompt: z.string().min(1).max(400),
  options: z.array(z.string()).max(8).optional(),
});

const createSchema = z.object({
  templateId: z.string(),
  title: z.string().min(1).max(160),
  rationale: z.string().min(1).max(800),
  reportId: z.string().min(1).optional().nullable(),
  targetUserIds: z.array(z.string().min(1)).min(1).max(60),
  questionsEn: z.array(questionSchema).min(1).max(4),
  questionsEs: z.array(questionSchema).min(1).max(4),
});

export const GET = withMetrics("/api/admin/survey-campaigns", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const include = req.nextUrl.searchParams.get("include");
  const campaigns = await listSurveyCampaigns(50);
  if (include === "responses") {
    const responses = await listSurveyResponses(100);
    return NextResponse.json({ campaigns, responses });
  }
  return NextResponse.json({ campaigns });
});

export const POST = withMetrics("/api/admin/survey-campaigns", async (req: NextRequest) => {
  const { session, error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  if (!isSurveyTemplateId(parsed.data.templateId)) {
    return NextResponse.json({ error: "Unknown templateId" }, { status: 400 });
  }

  const templateId = parsed.data.templateId as SurveyTemplateId;
  const uniqueIds = [...new Set(parsed.data.targetUserIds)];
  const targets: { userId: string; language: string; questions: SurveyQuestionDraft[] }[] = [];

  for (const userId of uniqueIds) {
    const user = await findUserById(userId);
    if (!user?.email) continue;
    const settings = await getUserSettings(userId);
    if (!settings.emailNotificationsEnabled) continue;
    const language = settings.language === "es" ? "es" : "en";
    targets.push({
      userId,
      language,
      questions: language === "es" ? parsed.data.questionsEs : parsed.data.questionsEn,
    });
  }

  if (targets.length === 0) {
    return NextResponse.json(
      { error: "No email-eligible targets (missing email or notifications disabled)" },
      { status: 422 },
    );
  }

  const { campaign, invites } = await createSurveyCampaign({
    templateId,
    title: parsed.data.title,
    rationale: parsed.data.rationale,
    reportId: parsed.data.reportId || null,
    createdBy: session!.userId,
    questionsEn: parsed.data.questionsEn,
    questionsEs: parsed.data.questionsEs,
    targets,
  });

  return NextResponse.json({
    campaign,
    inviteCount: invites.length,
    invites: invites.map((i) => ({
      id: i.id,
      userId: i.userId,
      language: i.language,
      emailStatus: i.emailStatus,
    })),
  });
});
