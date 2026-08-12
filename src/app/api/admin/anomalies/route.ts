import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/guards";
import {
  getPortfolioAnomalyById,
  listPortfolioAnomalies,
  setPortfolioAnomalyStatus,
} from "@/lib/db";
import { findUserById } from "@/lib/db/users";
import { applySafeAnomalyFixes, runPortfolioAnomalyScan, scanUserPortfolioAnomalies } from "@/lib/portfolio-anomaly";
import { withMetrics } from "@/lib/with-metrics";

const listSchema = z.object({
  status: z.enum(["open", "acked", "fixed", "dismissed", "all"]).optional(),
  severity: z.enum(["error", "warn", "info", "all"]).optional(),
  userId: z.string().optional(),
  page: z.coerce.number().int().min(0).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const GET = withMetrics("/api/admin/anomalies", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const anomaly = await getPortfolioAnomalyById(id);
    if (!anomaly) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const user = await findUserById(anomaly.userId);
    return NextResponse.json({
      anomaly,
      user: user
        ? {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.display_name,
          }
        : null,
    });
  }

  const parsed = listSchema.safeParse({
    status: url.searchParams.get("status") || undefined,
    severity: url.searchParams.get("severity") || undefined,
    userId: url.searchParams.get("userId") || undefined,
    page: url.searchParams.get("page") || undefined,
    pageSize: url.searchParams.get("pageSize") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const page = parsed.data.page ?? 0;
  const pageSize = parsed.data.pageSize ?? 25;
  const { items, total } = await listPortfolioAnomalies({
    status: parsed.data.status ?? "open",
    severity: parsed.data.severity ?? "all",
    userId: parsed.data.userId,
    limit: pageSize,
    offset: page * pageSize,
  });

  const users = await Promise.all(items.map((a) => findUserById(a.userId)));
  const enriched = items.map((anomaly, i) => {
    const user = users[i];
    return {
      ...anomaly,
      username: user?.username || "",
      email: user?.email || "",
      displayName: user?.display_name || "",
    };
  });

  return NextResponse.json({ items: enriched, total, page, pageSize });
});

const actionSchema = z.object({
  action: z.enum(["ack", "dismiss", "apply_safe_fix", "rescan", "rebuild_holdings"]),
  anomalyId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
});

export const POST = withMetrics("/api/admin/anomalies", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { action } = parsed.data;

  if (action === "rescan") {
    const userId = parsed.data.userId;
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    const result = await runPortfolioAnomalyScan({
      userIds: [userId],
      maxLlmExplanations: 1,
      notify: true,
    });
    const scan = await scanUserPortfolioAnomalies(userId);
    return NextResponse.json({ ok: true, result, scan });
  }

  const anomalyId = parsed.data.anomalyId;
  if (!anomalyId) return NextResponse.json({ error: "anomalyId required" }, { status: 400 });
  const anomaly = await getPortfolioAnomalyById(anomalyId);
  if (!anomaly) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "ack") {
    const updated = await setPortfolioAnomalyStatus(anomalyId, "acked", "admin");
    return NextResponse.json({ ok: true, anomaly: updated });
  }

  if (action === "dismiss") {
    const updated = await setPortfolioAnomalyStatus(anomalyId, "dismissed", "admin");
    return NextResponse.json({ ok: true, anomaly: updated });
  }

  if (action === "rebuild_holdings") {
    const { rebuildHoldings } = await import("@/lib/db");
    await rebuildHoldings(anomaly.userId);
    const updated = await setPortfolioAnomalyStatus(anomalyId, "acked", "admin");
    return NextResponse.json({ ok: true, anomaly: updated, rebuilt: true });
  }

  // apply_safe_fix
  const repair = await applySafeAnomalyFixes(
    anomaly.userId,
    anomaly.findings.filter((f) => f.autoFixable),
  );
  const rescan = await scanUserPortfolioAnomalies(anomaly.userId);
  const status = !rescan || rescan.findings.length === 0 ? "fixed" : "acked";
  const updated = await setPortfolioAnomalyStatus(anomalyId, status, "admin");
  return NextResponse.json({
    ok: true,
    anomaly: updated,
    repair,
    remainingFindings: rescan?.findings.length ?? 0,
  });
});
