export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import { listSchedules, createSchedule, updateSchedule, deleteSchedule } from "@/lib/db";
import type { DreamTeamAgent } from "@/lib/db/dream-team";
import { json401 } from "@/lib/log-unauthorized";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/dream-team/schedules", reason: "no_session" });

  const schedules = await listSchedules(session.userId);
  return NextResponse.json({ schedules });
}

const createSchema = z.object({
  agent: z.enum(["warren", "clara", "will"]),
  prompt: z.string().min(1).max(2000),
  cronExpr: z.string().min(5).max(100),
  timezone: z.string().max(100).default("Europe/Madrid"),
  nextRunAt: z.string(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/dream-team/schedules", reason: "no_session" });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  }

  const { agent, prompt, cronExpr, timezone, nextRunAt } = parsed.data;
  const schedule = await createSchedule(session.userId, agent as DreamTeamAgent, prompt, cronExpr, timezone, nextRunAt);
  return NextResponse.json({ schedule }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string(),
  enabled: z.boolean().optional(),
  prompt: z.string().max(2000).optional(),
  cronExpr: z.string().max(100).optional(),
  timezone: z.string().max(100).optional(),
  nextRunAt: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/dream-team/schedules", reason: "no_session" });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;
  await updateSchedule(id, session.userId, updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/dream-team/schedules", reason: "no_session" });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteSchedule(id, session.userId);
  return NextResponse.json({ ok: true });
}
