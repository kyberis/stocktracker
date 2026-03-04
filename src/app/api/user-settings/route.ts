import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, updateUserSettings, getGlobalAlphaVantageApiKey, getGlobalOpenAIApiKey } from "@/lib/db";
import type { ApiProviderName, Language, RefreshInterval } from "@/lib/types";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/user-settings", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const [settings, globalAvKey, globalOpenAIKey] = await Promise.all([
    getUserSettings(session.userId),
    getGlobalAlphaVantageApiKey(),
    getGlobalOpenAIApiKey(),
  ]);

  return NextResponse.json({
    provider: settings.provider,
    language: settings.language,
    refreshInterval: settings.refreshInterval,
    hasGlobalAvKey: globalAvKey.length > 0,
    hasOpenAIKey: globalOpenAIKey.length > 0,
  });
});

export const PUT = withMetrics("/api/user-settings", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const body = (await req.json()) as Partial<{
      provider: ApiProviderName;
      language: Language;
      refreshInterval: RefreshInterval;
    }>;

    const updates: {
      provider?: ApiProviderName;
      language?: Language;
      refreshInterval?: RefreshInterval;
    } = {};

    if (body.provider && (body.provider === "yahoo" || body.provider === "alphavantage")) {
      updates.provider = body.provider;
    }
    if (body.language && (body.language === "en" || body.language === "es")) {
      updates.language = body.language;
    }
    if (body.refreshInterval && [15, 30, 60].includes(body.refreshInterval)) {
      updates.refreshInterval = body.refreshInterval;
    }

    const next = await updateUserSettings(session.userId, updates);
    return NextResponse.json({
      provider: next.provider,
      language: next.language,
      refreshInterval: next.refreshInterval,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
});
