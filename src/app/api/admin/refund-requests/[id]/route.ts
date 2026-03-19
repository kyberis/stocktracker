import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import {
  getRefundRequestById,
  updateRefundRequestStatus,
  findUserById,
  getUserSettings,
  type RefundRequestStatus,
} from "@/lib/db";
import {
  sendRefundRequestApprovedEmail,
  sendRefundRequestRejectedEmail,
} from "@/lib/refund-request-email";
import { withMetrics } from "@/lib/with-metrics";

const resolveSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  adminNote: z.string().trim().max(2000).optional(),
});

export const PUT = withMetrics("/api/admin/refund-requests/[id]", async (
  req: NextRequest,
  ctx?: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = (ctx as { params: { id: string } }).params;

  const existing = await getRefundRequestById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status !== "pending") {
    return NextResponse.json({ error: "Request already resolved" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await updateRefundRequestStatus(
    id,
    parsed.data.status as RefundRequestStatus,
    parsed.data.adminNote || "",
  );
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [user, settings] = await Promise.all([
    findUserById(existing.userId),
    getUserSettings(existing.userId),
  ]);

  if (user?.email) {
    const emailInput = {
      userId: existing.userId,
      email: user.email,
      displayName: user.display_name || user.username,
      language: settings.language || "en",
      requestId: id,
    };

    const sendFn = parsed.data.status === "approved"
      ? sendRefundRequestApprovedEmail
      : sendRefundRequestRejectedEmail;

    sendFn(emailInput).catch((err) => {
      console.error(`Failed to send refund ${parsed.data.status} email:`, err);
    });
  }

  return NextResponse.json(updated);
});
