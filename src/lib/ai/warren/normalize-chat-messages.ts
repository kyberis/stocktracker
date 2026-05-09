/**
 * Warren web chat sends plain user/assistant text history. If an assistant turn
 * produced only tool-rendered cards with no streamed prose, the UI leaves an
 * empty assistant bubble — we omit it next request and accidentally send two
 * consecutive user messages, which Vercel AI Gateway / Responses rejects.
 */

export type WarrenTextRow = { role: "user" | "assistant"; content: string };

/** Trim, drop empty rows, merge consecutive same-role messages. */
export function normalizeWarrenTextMessages(rows: WarrenTextRow[]): WarrenTextRow[] {
  const trimmed = rows
    .map((r) => ({
      role: r.role,
      content: typeof r.content === "string" ? r.content.trim() : "",
    }))
    .filter((r) => r.content.length > 0);

  const out: WarrenTextRow[] = [];
  for (const row of trimmed) {
    const last = out[out.length - 1];
    if (last && last.role === row.role) {
      last.content = `${last.content}\n\n${row.content}`;
    } else {
      out.push({ role: row.role, content: row.content });
    }
  }
  return out;
}

/** Multipart: merge trailing user caption into prior history when both are text users. */
export function normalizeWarrenTextMessagesWithFinalUser(
  prior: WarrenTextRow[],
  finalUserText: string,
): WarrenTextRow[] {
  const base = normalizeWarrenTextMessages(prior);
  const t = finalUserText.trim();
  if (!t.length) return base;
  const out = [...base];
  const last = out[out.length - 1];
  if (last?.role === "user") {
    last.content = `${last.content}\n\n${t}`;
  } else {
    out.push({ role: "user", content: t });
  }
  return out;
}
