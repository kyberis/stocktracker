/**
 * Truncate marketing / profile copy at the last sentence (or last space),
 * never mid-word. Spec §5.2: NRG was cut at "residential, com".
 */
export function truncateAtLastSentence(text: string, max = 400): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const period = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("."));
  if (period >= 40) return slice.slice(0, period + 1).trim();
  const space = slice.lastIndexOf(" ");
  if (space >= 20) return slice.slice(0, space).trim();
  return slice.trim();
}
