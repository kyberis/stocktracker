export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import { listThreads, createThread } from "@/lib/db";
import type { DreamTeamAgent, ThreadStatus } from "@/lib/db/dream-team";
import { json401 } from "@/lib/log-unauthorized";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/dream-team/threads", reason: "no_session" });

  const status = req.nextUrl.searchParams.get("status") as ThreadStatus | null;
  const threads = await listThreads(session.userId, status || undefined);
  return NextResponse.json({ threads });
}

const createSchema = z.object({
  agent: z.enum(["warren", "clara", "will"]),
  topic: z.string().max(200).optional(),
  message: z.string().min(1).max(12000),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/dream-team/threads", reason: "no_session" });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  }

  const { agent, topic, message } = parsed.data;
  const thread = await createThread(session.userId, agent as DreamTeamAgent, topic || message.slice(0, 100));
  return NextResponse.json({ thread }, { status: 201 });
}
