import { NextRequest, NextResponse } from "next/server";

import { ensureInitialized } from "@/lib/db/client";
import { rowToDbUser } from "@/lib/db/helpers";
import { effectivePlan } from "@/lib/subscription";

/**
 * Service-to-service endpoint consumed by the trefolio-accounts admin UI.
 *
 * Given an IdP `sub` (and optionally a fallback `?email=`), returns a thin
 * summary of the local trefolio user — used by the unified accounts admin
 * page to render which products each IdP user has linked accounts in.
 *
 * Authenticated with `Authorization: Bearer ${IDP_SERVICE_TOKEN}`. Same
 * shared secret used by `/api/auth/oidc/*` and the user-import scripts.
 */
function unauthorized(req: NextRequest): NextResponse | null {
  const auth = req.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  const expected = process.env.IDP_SERVICE_TOKEN;
  if (!expected || scheme !== "Bearer" || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sub: string }> },
) {
  const fail = unauthorized(req);
  if (fail) return fail;

  const { sub } = await params;
  const fallbackEmail = req.nextUrl.searchParams.get("email")?.toLowerCase() || "";

  const client = await ensureInitialized();

  let row: any =
    (
      await client.execute({
        sql: "SELECT * FROM users WHERE idp_sub = ?",
        args: [sub],
      })
    ).rows[0] ?? null;

  if (!row && fallbackEmail) {
    row =
      (
        await client.execute({
          sql: "SELECT * FROM users WHERE LOWER(email) = LOWER(?)",
          args: [fallbackEmail],
        })
      ).rows[0] ?? null;
  }

  if (!row) {
    return NextResponse.json({ exists: false }, { status: 200 });
  }

  const u = rowToDbUser(row);
  return NextResponse.json({
    exists: true,
    id: u.id,
    email: u.email,
    username: u.username,
    displayName: u.display_name,
    role: u.role,
    plan: effectivePlan(u.plan, u.plan_expires_at || ""),
    planExpiresAt: u.plan_expires_at || null,
    idpSub: u.idp_sub || null,
    authProvider: u.auth_provider,
    emailVerified: Boolean(u.email_verified),
    createdAt: u.created_at,
    lastActiveAt: u.last_active_at || null,
  });
}
