import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { getAppRouteParam } from "@/lib/api-route-params";
import {
  confirmSurveyCampaign,
  getSurveyCampaign,
  listSurveyInvites,
  setSurveyCampaignStatus,
  updateInviteEmailStatus,
  findUserById,
} from "@/lib/db";
import { sendEngagementSurveyEmail } from "@/lib/email";

export const GET = withMetrics("/api/admin/survey-campaigns/[id]", async (req: NextRequest, ctx?: unknown) => {
  const { error } = await requireAdmin(req);
  if (error) return error;
  const id = getAppRouteParam(req, ctx, "id");
  const campaign = await getSurveyCampaign(id);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const invites = await listSurveyInvites(id);
  return NextResponse.json({ campaign, invites });
});

export const POST = withMetrics("/api/admin/survey-campaigns/[id]", async (req: NextRequest, ctx?: unknown) => {
  const { error } = await requireAdmin(req);
  if (error) return error;
  const id = getAppRouteParam(req, ctx, "id");
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  const campaign = await getSurveyCampaign(id);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "confirm") {
    const updated = await confirmSurveyCampaign(id);
    const invites = await listSurveyInvites(id);
    return NextResponse.json({ campaign: updated, invites });
  }

  if (action === "send") {
    if (campaign.status !== "confirmed" && campaign.status !== "draft") {
      return NextResponse.json(
        { error: `Cannot send from status ${campaign.status}` },
        { status: 409 },
      );
    }
    if (!body?.confirmed) {
      return NextResponse.json(
        { error: "Pass confirmed:true after reviewing recipients" },
        { status: 400 },
      );
    }

    if (campaign.status === "draft") {
      await confirmSurveyCampaign(id);
    }
    await setSurveyCampaignStatus(id, "sending");

    const invites = await listSurveyInvites(id);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL || "https://trefolio.com";
    let sent = 0;
    let suppressed = 0;
    let failed = 0;

    for (const invite of invites) {
      if (invite.emailStatus === "sent") {
        sent += 1;
        continue;
      }
      const user = await findUserById(invite.userId);
      if (!user?.email) {
        await updateInviteEmailStatus(invite.id, "skipped");
        suppressed += 1;
        continue;
      }
      const surveyUrl = `${baseUrl}/survey/${invite.token}`;
      const result = await sendEngagementSurveyEmail(
        user.email,
        user.id,
        user.display_name || user.username,
        surveyUrl,
        campaign.title,
        invite.language === "es" ? "es" : "en",
      );
      if (result.suppressed) {
        await updateInviteEmailStatus(invite.id, "suppressed");
        suppressed += 1;
      } else if (result.success) {
        await updateInviteEmailStatus(invite.id, "sent");
        sent += 1;
      } else {
        await updateInviteEmailStatus(invite.id, "failed");
        failed += 1;
      }
    }

    await setSurveyCampaignStatus(id, "sent");
    const updated = await getSurveyCampaign(id);
    const refreshed = await listSurveyInvites(id);
    return NextResponse.json({
      campaign: updated,
      invites: refreshed,
      stats: { sent, suppressed, failed },
    });
  }

  if (action === "cancel") {
    await setSurveyCampaignStatus(id, "cancelled");
    return NextResponse.json({ campaign: await getSurveyCampaign(id) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
});
