import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, updateUserSettings } from "@/lib/db";
import type { ApiProviderName, Language } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const settings = await getUserSettings(session.userId);
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const body = (await req.json()) as Partial<{
      provider: ApiProviderName;
      alphaVantageApiKey: string;
      language: Language;
    }>;

    const updates: {
      provider?: ApiProviderName;
      alphaVantageApiKey?: string;
      language?: Language;
    } = {};

    if (body.provider && (body.provider === "yahoo" || body.provider === "alphavantage")) {
      updates.provider = body.provider;
    }
    if (typeof body.alphaVantageApiKey === "string") {
      updates.alphaVantageApiKey = body.alphaVantageApiKey;
    }
    if (body.language && (body.language === "en" || body.language === "es")) {
      updates.language = body.language;
    }

    const next = await updateUserSettings(session.userId, updates);
    return NextResponse.json(next);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
