import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { findUserById, resetUserHoldings } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { adminResetDataSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/admin/reset-data", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await parseBody(req, adminResetDataSchema);
  if (!result.success) return result.error;
  const { userId, mode } = result.data;

  const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

  const inserted = await resetUserHoldings(user.id, mode === "seed");
  return NextResponse.json({ ok: true, inserted });
});
