import { NextRequest, NextResponse } from "next/server";
import { getDueSchedules, markScheduleRun, createThread, addMessage } from "@/lib/db";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth("dream-team-schedules", req);
  if (authError) return authError;

  const run = withCronLogging("dream-team-schedules", async () => {
    const now = new Date().toISOString();
    const due = await getDueSchedules(now);

    let executed = 0;
    let errors = 0;

    for (const schedule of due) {
      try {
        const thread = await createThread(
          schedule.userId,
          schedule.agent,
          `[Scheduled] ${schedule.prompt.slice(0, 80)}`,
        );
        await addMessage(thread.id, "user", schedule.prompt);

        const nextRunAt = computeNextRun(schedule.cronExpr);
        await markScheduleRun(schedule.id, nextRunAt);
        executed++;
      } catch (err) {
        console.error(`[dream-team-schedules] Error executing schedule ${schedule.id}:`, err);
        errors++;
      }
    }

    return { due: due.length, executed, errors };
  });

  return run();
}

function computeNextRun(cronExpr: string): string {
  const parts = cronExpr.split(/\s+/);
  if (parts.length < 5) return new Date(Date.now() + 86400000).toISOString();

  const now = new Date();
  const [minute, hour, dayOfMonth, , dayOfWeek] = parts;
  const next = new Date(now);

  if (dayOfWeek !== "*" && dayOfMonth === "*") {
    const targetDay = Number(dayOfWeek);
    const daysUntil = (targetDay - now.getUTCDay() + 7) % 7 || 7;
    next.setUTCDate(now.getUTCDate() + daysUntil);
  } else if (dayOfMonth !== "*") {
    const targetDate = Number(dayOfMonth);
    next.setUTCMonth(now.getUTCMonth() + 1);
    next.setUTCDate(targetDate);
  } else {
    next.setUTCDate(now.getUTCDate() + 1);
  }

  if (hour !== "*") next.setUTCHours(Number(hour));
  if (minute !== "*") next.setUTCMinutes(Number(minute));
  next.setUTCSeconds(0, 0);

  return next.toISOString();
}
