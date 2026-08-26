import { NextResponse, type NextRequest } from "next/server";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { requireFeatureQuota } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import { requireRealEstateAccess } from "@/lib/real-estate-screening/guard";
import {
  createRealEstateRunBodySchema,
  RE_SCREENING_PHASES,
} from "@/lib/real-estate-screening/schemas";
import { zoneSelectable } from "@/lib/real-estate-screening/search";
import {
  buildIdempotencyKey,
  createReScreeningRun,
  findRunByIdempotencyKey,
  getZonasByGeocods,
  insertReSteps,
  listReScreeningRunsByUser,
  listReStepsForRun,
} from "@/lib/db/real-estate-screening";
import { continueReScreeningInBackground } from "@/lib/real-estate-screening/orchestrator/drain";
import { progressFromSteps } from "@/lib/real-estate-screening/orchestrator/runner";
import { trackEvent } from "@/lib/db/analytics";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export const GET = withMetrics("/api/real-estate/screening", async (req: NextRequest) => {
  const { session, error } = await requireRealEstateAccess(req);
  if (error || !session) return error;
  const rows = await listReScreeningRunsByUser(session.userId, 20);
  return NextResponse.json({
    runs: rows.map((r) => ({
      id: r.id,
      status: r.status,
      phase: r.phase,
      createdAt: r.createdAt,
      finishedAt: r.finishedAt,
      zonas: safeJson(r.zonasJson, []),
      params: safeJson(r.paramsJson, {}),
    })),
  });
});

export const POST = withMetrics("/api/real-estate/screening", async (req: NextRequest) => {
  const { session, error } = await requireRealEstateAccess(req);
  if (error || !session) return error;

  const parsed = await parseBody(req, createRealEstateRunBodySchema);
  if (!parsed.success) return parsed.error;

  const zonas = await getZonasByGeocods(parsed.data.zoneGeocods);
  if (zonas.length !== parsed.data.zoneGeocods.length) {
    return NextResponse.json({ error: "Unknown zone" }, { status: 400 });
  }
  const blocked = zonas.filter((z) => !zoneSelectable(z));
  if (blocked.length > 0) {
    return NextResponse.json(
      {
        error: "Zone has no official INE coverage",
        geocods: blocked.map((z) => z.geocod),
      },
      { status: 422 },
    );
  }

  const key = buildIdempotencyKey(
    session.userId,
    parsed.data.zoneGeocods,
    parsed.data.params,
    utcDay(),
  );
  const existing = await findRunByIdempotencyKey(session.userId, key);
  if (existing && (existing.status === "completed" || existing.status === "partial" || existing.status === "running" || existing.status === "pending")) {
    return NextResponse.json({ runId: existing.id, reused: true }, { status: 200 });
  }

  const { error: quotaError, quota } = await requireFeatureQuota(req, "real_estate_screening");
  if (quotaError) return quotaError;
  const consumed = Boolean(quota);

  try {
    const run = await createReScreeningRun({
      userId: session.userId,
      zonasJson: JSON.stringify(
        zonas.map((z) => ({ geocod: z.geocod, nombre: z.nombre, distrito: z.distrito })),
      ),
      paramsJson: JSON.stringify(parsed.data.params),
      idempotencyKey: key,
    });
    await insertReSteps(run.id, [...RE_SCREENING_PHASES]);
    continueReScreeningInBackground(run.id);
    void trackEvent(session.userId, "re_screening_run_created", { runId: run.id });
    const steps = await listReStepsForRun(run.id);
    return NextResponse.json(
      { runId: run.id, reused: false, progress: progressFromSteps(steps) },
      { status: 201 },
    );
  } catch (err) {
    console.error("[re-screening] create failed", err instanceof Error ? err.message : err);
    if (consumed) await refundFeatureQuota(session.userId, "real_estate_screening");
    return NextResponse.json({ error: "Could not create run" }, { status: 500 });
  }
});

function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
