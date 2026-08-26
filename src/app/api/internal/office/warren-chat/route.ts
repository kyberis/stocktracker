export const dynamic = "force-dynamic";
export const maxDuration = 120;

import type { ModelMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { formatClaraCashflowAppendix } from "@/lib/ai/office/clara-cashflow-appendix";
import { fetchClaraSavingsSummary } from "@/lib/ai/office/clara-client";
import { resolveOfficeIdentity } from "@/lib/ai/office/office-identity";
import {
  resolveClaraWarrenUser,
  trefolioPublicSignupUrl,
} from "@/lib/ai/office/resolve-clara-warren-user";
import { buildPortfolioSnapshot } from "@/lib/ai/warren/build-snapshot";
import { runWarrenTurn } from "@/lib/ai/warren/run-turn";
import { sanitizeWarrenPortfolioLabel } from "@/lib/ai/prompt-safety";
import { findUserById, listPortfolios } from "@/lib/db";
import { verifyIdpServiceBearer } from "@/lib/idp/service-auth";
import { effectivePlan } from "@/lib/subscription";
import type { SubscriptionPlan } from "@/lib/types";

const textMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(12_000),
  })
  .strict();

const requestSchema = z
  .object({
    billingSource: z.literal("clara"),
    sub: z.string().max(200).optional().default(""),
    email: z.string().max(320).optional().default(""),
    message: z.string().min(1).max(4_000),
    language: z.string().max(16).optional(),
    messages: z.array(textMessageSchema).max(20).optional(),
  })
  .strict();

/**
 * Clara → Warren: full Warren turn for a linked trefolio user.
 * Auth: Bearer IDP_SERVICE_TOKEN.
 * Quota: does NOT consume `ai_consult` — Clara already billed the daily cap.
 */
export async function POST(req: NextRequest) {
  if (!verifyIdpServiceBearer(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const userId = await resolveClaraWarrenUser({
    sub: body.sub,
    email: body.email,
  });
  if (!userId) {
    return NextResponse.json(
      {
        available: false,
        hasAccount: false,
        signupUrl: trefolioPublicSignupUrl(),
        note: "No trefolio account linked to this identity",
      },
      { status: 404 },
    );
  }

  const dbUser = await findUserById(userId);
  if (!dbUser) {
    return NextResponse.json(
      {
        available: false,
        hasAccount: false,
        signupUrl: trefolioPublicSignupUrl(),
      },
      { status: 404 },
    );
  }

  const portfolios = await listPortfolios(userId).catch(() => []);
  const active = portfolios.find((p) => p.isDefault) || portfolios[0];
  const subscriptionPlan = effectivePlan(
    (dbUser.plan || "free") as SubscriptionPlan,
    dbUser.plan_expires_at || "",
  ) as SubscriptionPlan;

  const snapshot = await buildPortfolioSnapshot({
    userId,
    portfolioId: active?.id,
    baseCurrency: "EUR",
    enrichForPortfolioAi: true,
  });

  const history = (body.messages ?? []).map(
    (m): ModelMessage =>
      m.role === "assistant"
        ? { role: "assistant", content: m.content }
        : { role: "user", content: m.content },
  );
  const messages: ModelMessage[] =
    history.length > 0
      ? [...history, { role: "user", content: body.message }]
      : [{ role: "user", content: body.message }];

  const identity = await resolveOfficeIdentity(userId);
  const claraCash = identity
    ? await fetchClaraSavingsSummary(identity)
    : { available: false as const, note: "Missing trefolio identity for Clara snapshot" };

  try {
    const result = await runWarrenTurn({
      userId,
      channel: "clara",
      language: body.language,
      baseCurrency: "EUR",
      activePortfolioId: active?.id,
      activePortfolioName: sanitizeWarrenPortfolioLabel(active?.name ?? ""),
      snapshot,
      officeIdentity: identity,
      messages,
      gatewayHeaders: req.headers,
      subscriptionPlan,
      systemAppendix: formatClaraCashflowAppendix(claraCash),
    });

    return NextResponse.json({
      available: true,
      text: result.text,
      parts: result.parts,
      note: "Warren reply billed against Clara daily quota, not trefolio ai_consult.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Warren unreachable";
    return NextResponse.json(
      { available: false, note: message },
      { status: 502 },
    );
  }
}
