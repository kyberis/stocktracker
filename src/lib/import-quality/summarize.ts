import { fetchGatewayChatCompletions } from "@/lib/ai/gateway";
import type { ImportQualityFinding } from "./types";

/**
 * Short AI narrative of import quality findings. Falls back to a deterministic
 * English summary when the gateway is unavailable.
 */
export async function summarizeImportQuality(args: {
  findings: ImportQualityFinding[];
  broker?: string;
  locale?: string;
  headers?: Headers;
}): Promise<string> {
  const { findings, broker, locale = "en", headers } = args;
  if (findings.length === 0) {
    return locale.startsWith("es")
      ? "No se detectaron problemas de calidad en los datos importados."
      : "No data-quality issues were detected in the imported data.";
  }

  const deterministic = buildDeterministicSummary(findings, locale);
  const compact = findings.slice(0, 20).map((f) => ({
    severity: f.severity,
    code: f.code,
    ticker: f.ticker,
    message: f.message,
    fixed: Boolean(f.fixed),
    autoFixable: f.autoFixable,
  }));

  try {
    const lang = locale.startsWith("es") ? "Spanish" : "English";
    const res = await fetchGatewayChatCompletions(
      {
        model: "openai/gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 280,
        messages: [
          {
            role: "system",
            content:
              `You are a portfolio data-quality assistant for trefolio. ` +
              `Explain import/market cross-check findings in 2-4 short sentences of ${lang}. ` +
              `Mention what was auto-fixed vs what the user should review. ` +
              `Do not give investment advice. Say the summary is AI-generated and may be inaccurate.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              broker: broker || "unknown",
              findings: compact,
            }),
          },
        ],
      },
      { headers },
    );
    if (!res.ok) return deterministic;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    return text || deterministic;
  } catch {
    return deterministic;
  }
}

export function buildDeterministicSummary(
  findings: ImportQualityFinding[],
  locale = "en",
): string {
  const fixed = findings.filter((f) => f.fixed).length;
  const review = findings.filter((f) => !f.fixed && f.severity !== "info").length;
  if (locale.startsWith("es")) {
    return (
      `Se encontraron ${findings.length} aviso(s) de calidad de datos` +
      (fixed ? `; ${fixed} corregido(s) automáticamente` : "") +
      (review ? `; ${review} requieren revisión` : "") +
      `. Resumen generado automáticamente (sin IA).`
    );
  }
  return (
    `Found ${findings.length} data-quality notice(s)` +
    (fixed ? `; ${fixed} auto-fixed` : "") +
    (review ? `; ${review} need review` : "") +
    `. Deterministic summary (AI unavailable).`
  );
}
