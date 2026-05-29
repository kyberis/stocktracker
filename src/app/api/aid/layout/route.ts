import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser, listCashEntries, listHoldings } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { aidLayoutBodySchema } from "@/lib/schemas";
import {
  getAidLayoutOrderPartial,
  setAidLayoutOrder,
} from "@/lib/db/aid-user-state";
import {
  isValidAidLayoutBody,
  resolveAidLayout,
  type AidLayoutOrder,
} from "@/lib/aid/layout-sections";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

async function aidEnabled(userId: string) {
  return isFeatureEnabledForUser("aid_beta", userId);
}

async function portfolioIsEmpty(userId: string, portfolioId?: string): Promise<boolean> {
  const [holdings, cashEntries] = await Promise.all([
    listHoldings(userId, portfolioId),
    listCashEntries(userId, portfolioId),
  ]);
  return holdings.length === 0 && cashEntries.length === 0;
}

export const GET = withMetrics("/api/aid/layout", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/aid/layout", reason: "no_session" });

  const enabled = await aidEnabled(session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "AID beta is not enabled" }, { status: 403 });
  }

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const isEmpty = await portfolioIsEmpty(session.userId, portfolioId);
  const stored = await getAidLayoutOrderPartial(session.userId);
  const layout = resolveAidLayout(stored, { isEmpty });

  return NextResponse.json({ layout });
});

export const PUT = withMetrics("/api/aid/layout", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/aid/layout", reason: "no_session" });

  const enabled = await aidEnabled(session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "AID beta is not enabled" }, { status: 403 });
  }

  const result = await parseBody(req, aidLayoutBodySchema);
  if (!result.success) return result.error;

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const isEmpty = await portfolioIsEmpty(session.userId, portfolioId);

  if (!isValidAidLayoutBody(result.data, { isEmpty })) {
    return NextResponse.json({ error: "Invalid layout order" }, { status: 400 });
  }

  const layout = result.data as AidLayoutOrder;
  await setAidLayoutOrder(session.userId, layout);
  return NextResponse.json({ layout });
});
