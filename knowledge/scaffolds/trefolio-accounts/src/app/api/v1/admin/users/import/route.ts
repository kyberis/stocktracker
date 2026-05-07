import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const db = new PrismaClient();

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().email(),
  /// bcrypt hash, transferred verbatim. The IdP never sees plaintext passwords from migration.
  passwordHash: z.string().optional(),
  name: z.string().optional(),
  locale: z.string().optional(),
  googleId: z.string().optional(),
  appleId: z.string().optional(),
  emailVerified: z.boolean().optional(),
  /// Initial entitlement to seed (so paid users keep Pro through migration).
  plan: z.enum(["free", "pro"]).optional(),
  proUntil: z.string().datetime().optional(),
  /// Stripe customer to attach (so the user can manage billing without re-checkout).
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
});

/**
 * POST /v1/admin/users/import
 * Service-to-service. Used by trefolio/Clara/Will migration scripts.
 *
 * Idempotent on `email`: if a user with that email exists, returns its
 * `sub` and applies any updates from the body. If not, creates one.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  const expected = process.env.IDP_SERVICE_TOKEN;
  if (!expected || scheme !== "Bearer" || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const existing = await db.user.findUnique({ where: { email: body.email } });

  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: {
          name: body.name ?? existing.name ?? undefined,
          locale: body.locale ?? existing.locale,
          // Only set passwordHash if the user doesn't already have one.
          passwordHash: existing.passwordHash ?? body.passwordHash,
          googleId: existing.googleId ?? body.googleId,
          appleId: existing.appleId ?? body.appleId,
          emailVerifiedAt: body.emailVerified && !existing.emailVerifiedAt ? new Date() : existing.emailVerifiedAt,
        },
      })
    : await db.user.create({
        data: {
          email: body.email,
          name: body.name,
          locale: body.locale ?? "en",
          passwordHash: body.passwordHash,
          googleId: body.googleId,
          appleId: body.appleId,
          emailVerifiedAt: body.emailVerified ? new Date() : undefined,
          authProvider: body.googleId ? "google" : body.appleId ? "apple" : "credentials",
        },
      });

  if (body.plan) {
    await db.entitlement.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan: body.plan,
        proUntil: body.proUntil ? new Date(body.proUntil) : null,
        source: body.stripeCustomerId ? "stripe" : "grant",
      },
      update: {
        plan: body.plan,
        proUntil: body.proUntil ? new Date(body.proUntil) : null,
      },
    });
  }

  if (body.stripeCustomerId) {
    await db.stripeCustomer.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stripeCustomerId: body.stripeCustomerId,
        stripeSubscriptionId: body.stripeSubscriptionId,
        currentPeriodEnd: body.proUntil ? new Date(body.proUntil) : null,
      },
      update: {
        stripeCustomerId: body.stripeCustomerId,
        stripeSubscriptionId: body.stripeSubscriptionId,
        currentPeriodEnd: body.proUntil ? new Date(body.proUntil) : undefined,
      },
    });
  }

  return NextResponse.json({ sub: user.id, email: user.email, created: !existing });
}
