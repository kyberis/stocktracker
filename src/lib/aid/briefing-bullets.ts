/** Strip redundant titles the model often prepends (UI already labels the section). */
export function stripAidBriefingPrefix(text: string): string {
  return text
    .replace(
      /^(morning\s+brief(?:ing)?|resumen\s+matinal|briefing\s+matinal|brief\s+du\s+matin|morgenbriefing)\s*[:\-–—]\s*/i,
      "",
    )
    .trim();
}

/** Parse stored briefing (newline / bullet / legacy sentence) into display bullets. */
export function parseAidBriefingBullets(briefing: string): string[] {
  const cleaned = stripAidBriefingPrefix(briefing);
  if (!cleaned) return [];

  try {
    const parsed = JSON.parse(cleaned) as { bullets?: unknown };
    if (Array.isArray(parsed?.bullets)) {
      return parsed.bullets
        .map((b) => stripAidBriefingPrefix(String(b)).slice(0, 120))
        .filter(Boolean)
        .slice(0, 4);
    }
  } catch {
    /* plain text */
  }

  const lines = cleaned
    .split(/\n+/)
    .map((line) => stripAidBriefingPrefix(line.replace(/^[-•*]\s+/, "").trim()))
    .filter(Boolean)
    .map((line) => line.slice(0, 120));

  if (lines.length > 1) return lines.slice(0, 4);
  return lines.length === 1 ? lines : [];
}
