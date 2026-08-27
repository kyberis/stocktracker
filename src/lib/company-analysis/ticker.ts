import { z } from "zod";
import { looksLikeIsin } from "@/lib/isin";

/** Strict ticker pattern from the company-analysis product spec. */
export const TICKER_PATTERN = /^[A-Z0-9.\-]{1,10}$/;

export const TickerSchema = z
  .string()
  .trim()
  .transform((s) => s.toUpperCase())
  .refine((s) => TICKER_PATTERN.test(s), {
    message: "Invalid ticker format",
  });

export function parseTicker(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const result = TickerSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** Optional `?isin=` on /analisis and company-analysis (too long for the ticker path). */
export function parseIsinParam(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined;
  const upper = raw.trim().toUpperCase();
  return looksLikeIsin(upper) ? upper : undefined;
}
