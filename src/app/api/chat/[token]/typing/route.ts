import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { updateTypingStatus } from "@/lib/db";

export const POST = withMetrics(
  "/api/chat/[token]/typing",
  async (req: NextRequest) => {
    const { session, error } = await requireSession(req);
    if (error || !session) return error!;

    const segments = req.nextUrl.pathname.split("/");
    const token = segments[segments.indexOf("chat") + 1] || "";
    if (!token || token.length < 8) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    await updateTypingStatus(token, session.userId);
    return new NextResponse(null, { status: 204 });
  }
);
