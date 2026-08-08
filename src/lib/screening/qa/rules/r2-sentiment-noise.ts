import type { QaIssue } from "@/lib/screening/schemas";
import type { QaRule } from "./types";

/**
 * R2 — Sentiment noise filtering.
 *
 * Web signals labelled `noise` (rumours, single-tweet stories, unconfirmed
 * social posts) must not be quoted verbatim in the Compiler thesis or the
 * per-candidate bullets. If the compiler reused a noise claim, that is a
 * blocking issue.
 */
export const r2SentimentNoise: QaRule = (ctx) => {
  const issues: QaIssue[] = [];
  const web = ctx.webAggregate;
  const draft = ctx.compilerDraft;
  if (!web || !draft) return issues;

  const noiseClaimsByTicker = new Map<string, string[]>();
  for (const t of web.tickers) {
    const noise = t.signals
      .filter((s) => s.kind === "noise")
      .map((s) => s.claim.trim())
      .filter((c) => c.length > 20);
    if (noise.length > 0) noiseClaimsByTicker.set(t.ticker.toUpperCase(), noise);
  }
  if (noiseClaimsByTicker.size === 0) return issues;

  const normalize = (s: string): string =>
    s
      .toLowerCase()
      .replace(/[\s\p{P}]+/gu, " ")
      .trim();
  const summaryNorm = normalize(draft.summary);

  for (const bullet of draft.candidateBullets) {
    const noises = noiseClaimsByTicker.get(bullet.ticker.toUpperCase()) ?? [];
    const bulletNorm = normalize(bullet.bullet);
    for (const noise of noises) {
      const shortSlice = normalize(noise).slice(0, 40);
      if (shortSlice.length < 20) continue;
      if (
        bulletNorm.includes(shortSlice) ||
        summaryNorm.includes(shortSlice)
      ) {
        issues.push({
          issueType: "rule_violation",
          ruleId: "R2",
          agentKind: "compiler",
          ticker: bullet.ticker,
          claimPath: "candidateBullets[].bullet",
          expectedValue: "no verbatim `noise` signals in compiler prose",
          actualValue: noise.slice(0, 200),
          summary:
            "Compiler quoted a Web signal labelled `noise` in the candidate bullet.",
          blocking: true,
        });
        break;
      }
    }
  }
  return issues;
};
