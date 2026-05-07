import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveEntitlements, freeClaims } from "@/lib/entitlements/resolve";

const db = new PrismaClient();

export const dynamic = "force-dynamic";

/**
 * GET /v1/entitlements/:sub
 * Service-to-service. Returns canonical entitlement claims for a user.
 *
 * Auth: Bearer IDP_SERVICE_TOKEN. Per-app secrets are NOT acceptable here
 * because this endpoint reveals the entitlement of any user the caller asks for.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sub: string }> },
) {
  const auth = req.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  const expected = process.env.IDP_SERVICE_TOKEN;
  if (!expected || scheme !== "Bearer" || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { sub } = await params;
  const ent = await db.entitlement.findUnique({ where: { userId: sub } });
  const claims = ent ? resolveEntitlements(ent) : freeClaims();

  return NextResponse.json({
    sub,
    plan: ent?.plan ?? "free",
    proUntil: ent?.proUntil?.toISOString() ?? null,
    source: ent?.source ?? null,
    entitlements: claims,
  });
}
