import { z } from "zod";

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
