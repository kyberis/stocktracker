import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getPortfolioAnomalyById,
  getProdOpsConfig,
  getProdOpsSharedSecret,
  setPortfolioAnomalyStatus,
} from "@/lib/db";
import { applySafeAnomalyFixes, scanUserPortfolioAnomalies } from "@/lib/portfolio-anomaly";
import { verifyProdOpsBodySignature } from "@/lib/prodops";
import { withMetrics } from "@/lib/with-metrics";

const actionSchema = z.object({
  chatId: z.string().min(1).max(120),
  actionId: z.string().min(1).max(80),
  anomalyId: z.string().uuid().optional(),
  callbackQueryId: z.string().max(120).optional(),
});

function parseActionCallback(actionId: string): {
  anomalyId: string;
  action: "ack" | "apply_safe_fix" | "dismiss";
} | null {
  // Format: pa|{anomalyId}|{action}
  const parts = actionId.split("|");
  if (parts.length !== 3 || parts[0] !== "pa") return null;
  const anomalyId = parts[1];
  const action = parts[2];
  if (!anomalyId || !["ack", "apply_safe_fix", "dismiss"].includes(action)) return null;
  return { anomalyId, action: action as "ack" | "apply_safe_fix" | "dismiss" };
}

export const POST = withMetrics("/api/internal/prodops-action", async (req: NextRequest) => {
  const secret = await getProdOpsSharedSecret();
  if (!secret.trim()) {
    return NextResponse.json({ error: "ProdOps shared secret is missing" }, { status: 503 });
  }

  const body = await req.text().catch(() => "");
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const timestamp = req.headers.get("x-prodops-timestamp") || "";
  const signature = req.headers.get("x-prodops-signature") || "";
  const verified = verifyProdOpsBodySignature({
    body,
    secret,
    timestamp,
    signature,
  });
  if (!verified) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const config = await getProdOpsConfig();
  if (!config.recipient?.chatId || config.recipient.chatId !== parsed.data.chatId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const decoded = parseActionCallback(parsed.data.actionId);
  if (!decoded) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const anomaly = await getPortfolioAnomalyById(decoded.anomalyId);
  if (!anomaly) {
    return NextResponse.json({
      ok: true,
      replyHtml: "Anomaly not found (may already be cleaned up).",
    });
  }

  if (decoded.action === "ack") {
    await setPortfolioAnomalyStatus(anomaly.id, "acked", "telegram");
    return NextResponse.json({
      ok: true,
      replyHtml: `Acked anomaly <code>${anomaly.id.slice(0, 8)}</code> (${anomaly.codes.join(", ") || "no codes"}).`,
    });
  }

  if (decoded.action === "dismiss") {
    await setPortfolioAnomalyStatus(anomaly.id, "dismissed", "telegram");
    return NextResponse.json({
      ok: true,
      replyHtml: `Dismissed anomaly <code>${anomaly.id.slice(0, 8)}</code>.`,
    });
  }

  // apply_safe_fix — only autoFixable findings
  const repair = await applySafeAnomalyFixes(
    anomaly.userId,
    anomaly.findings.filter((f) => f.autoFixable && f.fixAction !== "rebuild_holdings"),
  );
  const rescan = await scanUserPortfolioAnomalies(anomaly.userId);
  const status = !rescan || rescan.findings.length === 0 ? "fixed" : "acked";
  await setPortfolioAnomalyStatus(anomaly.id, status, "telegram");

  return NextResponse.json({
    ok: true,
    replyHtml:
      `Safe fix on <code>${anomaly.id.slice(0, 8)}</code>: ` +
      `${repair.fixedCount} applied` +
      (repair.deletedGhosts ? `, ${repair.deletedGhosts} ghosts removed` : "") +
      `. Remaining findings: ${rescan?.findings.length ?? 0}` +
      (status === "fixed" ? " — marked fixed." : " — marked acked."),
  });
});
