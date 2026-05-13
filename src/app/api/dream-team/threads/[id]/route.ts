export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import { getThread, updateThreadStatus } from "@/lib/db";
import type { ThreadStatus } from "@/lib/db/dream-team";
import { json401 } from "@/lib/log-unauthorized";

const patchSchema = z.object({
  status: z.enum(["active", "minimized", "closed", "archived"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/dream-team/thread", reason: "no_session" });

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await updateThreadStatus(id, session.userId, parsed.data.status as ThreadStatus);
  return NextResponse.json({ ok: true });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/dream-team/thread", reason: "no_session" });

  const { id } = await params;
  const thread = await getThread(id, session.userId);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ thread });
}
