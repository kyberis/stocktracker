export function parseNewsPublishedAt(raw: string): Date | null {
  if (!raw) return null;
  if (raw.includes("T") || raw.includes("-")) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  } else if (raw.length >= 8) {
    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(4, 6)) - 1;
    const day = Number(raw.slice(6, 8));
    const hour = raw.length >= 13 ? Number(raw.slice(9, 11)) : 0;
    const min = raw.length >= 13 ? Number(raw.slice(11, 13)) : 0;
    const parsed = new Date(year, month, day, hour, min);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export function formatNewsPublishedFull(raw: string, locale?: string): string {
  const d = parseNewsPublishedAt(raw);
  if (!d) return raw;
  try {
    return d.toLocaleString(locale || undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toISOString();
  }
}

/** Brief/digest: `14 Aug · 14:32`. */
export function formatNewsPublishedShort(raw: string, locale?: string): string {
  const d = parseNewsPublishedAt(raw);
  if (!d) return raw;
  try {
    const day = d.toLocaleDateString(locale || undefined, {
      day: "numeric",
      month: "short",
    });
    const time = d.toLocaleTimeString(locale || undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${day} · ${time}`;
  } catch {
    return d.toISOString();
  }
}

/** Home compact column: two-line day + time. */
export function formatNewsPublishedCompact(
  raw: string,
  locale?: string,
): { day: string; time: string } | null {
  const d = parseNewsPublishedAt(raw);
  if (!d) return null;
  try {
    return {
      day: d.toLocaleDateString(locale || undefined, {
        day: "numeric",
        month: "short",
      }),
      time: d.toLocaleTimeString(locale || undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  } catch {
    return { day: d.toISOString().slice(0, 10), time: "" };
  }
}
