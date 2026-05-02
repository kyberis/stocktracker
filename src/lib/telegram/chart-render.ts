/**
 * Render `chart` Warren parts into Telegram photos and build allocation
 * charts on demand for the `/chart` command.
 *
 * Kept separate from `format.ts` (which is text-only) and `handler.ts`
 * (which is already large) so the dependency on QuickChart and the photo
 * transport stays in one place.
 */

import type { ChartPartData } from "@/lib/ai/warren/types";
import {
  buildTelegramChartUrl,
  isTelegramChartImageEnabled,
  type TelegramChartSpec,
} from "./charts";
import type { TelegramClient } from "./client";
import { buildPortfolioSnapshot } from "@/lib/ai/warren/build-snapshot";

/**
 * Send a Warren `chart` part as a Telegram photo. Returns `true` when the
 * photo was sent (or sending was attempted), `false` when the spec couldn't
 * be turned into a valid image URL — the caller can then fall back to a
 * text-only summary.
 */
export async function sendChartPart(
  bot: TelegramClient,
  chatId: string,
  data: ChartPartData,
  caption?: string,
): Promise<boolean> {
  const spec = chartPartToTelegramSpec(data);
  if (!spec) return false;
  const url = buildTelegramChartUrl(spec);
  if (!url) return false;

  await bot.sendChatAction(chatId, "upload_photo");
  const sent = await bot.sendPhoto(chatId, url, {
    caption: caption?.slice(0, 1024),
  });
  return Boolean(sent);
}

function chartPartToTelegramSpec(data: ChartPartData): TelegramChartSpec | null {
  if (data.kind === "pie") {
    const slices = (data.slices ?? []).filter((s) => Number.isFinite(s.value) && s.value > 0);
    if (slices.length === 0) return null;
    return { kind: "pie", title: data.title, currency: data.currency, slices };
  }
  if (data.kind === "bar") {
    const labels = data.labels ?? [];
    const values = (data.values ?? []).filter((v) => Number.isFinite(v));
    if (labels.length === 0 || values.length === 0) return null;
    return {
      kind: "bar",
      title: data.title,
      currency: data.currency,
      labels,
      values,
      horizontal: data.horizontal,
    };
  }
  // line
  const labels = data.labels ?? [];
  const values = (data.values ?? []).filter((v) => Number.isFinite(v));
  if (labels.length === 0 || values.length === 0) return null;
  return {
    kind: "line",
    title: data.title,
    currency: data.currency,
    labels,
    values,
  };
}

/**
 * Build an allocation pie chart for the user's active portfolio. Used by the
 * `/chart` command. Returns `null` when there's nothing to chart (no holdings)
 * or chart images are disabled.
 */
export async function buildPortfolioAllocationChart(opts: {
  userId: string;
  portfolioId?: string;
  baseCurrency?: string;
  title: string;
}): Promise<ChartPartData | null> {
  if (!isTelegramChartImageEnabled()) return null;
  try {
    const snapshot = await buildPortfolioSnapshot({
      userId: opts.userId,
      portfolioId: opts.portfolioId,
      baseCurrency: opts.baseCurrency,
    });
    const slices = (snapshot.allocation ?? [])
      .map((a) => ({ label: a.type, value: a.pct }))
      .filter((s) => s.value > 0);
    if (slices.length === 0) return null;
    return {
      kind: "pie",
      title: opts.title,
      currency: snapshot.baseCurrency,
      slices,
    };
  } catch {
    return null;
  }
}
