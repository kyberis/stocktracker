import { getIdpServiceToken } from "@/lib/idp/config";
import type { WillNoteHit } from "./types";

const TIMEOUT_MS = 8_000;

function getWillBaseUrl(): string | null {
  const base = process.env.WILL_BASE_URL?.trim();
  return base ? base.replace(/\/+$/, "") : null;
}

export async function searchWillNotes(idpSub: string, query: string): Promise<WillNoteHit> {
  const base = getWillBaseUrl();
  const token = getIdpServiceToken();
  if (!base || !token || !idpSub.trim()) {
    if (process.env.NODE_ENV === "development") {
      return {
        available: true,
        excerpt: "Diversify into infrastructure when surplus allows",
        noteDate: new Date().toISOString().slice(0, 10),
        query,
      };
    }
    return { available: false };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/api/internal/office/search-notes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ sub: idpSub.trim(), query }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      return { available: false };
    }

    const data = (await res.json()) as Partial<WillNoteHit>;
    return {
      available: true,
      excerpt: data.excerpt,
      noteDate: data.noteDate,
      query,
    };
  } catch {
    return { available: false };
  } finally {
    clearTimeout(timer);
  }
}

export async function createWillOfficeNote(
  idpSub: string,
  text: string,
): Promise<{ ok: boolean; message: string }> {
  const base = getWillBaseUrl();
  const token = getIdpServiceToken();
  if (!base || !token || !idpSub.trim()) {
    return { ok: false, message: "Will not configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/api/internal/office/log-note`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ sub: idpSub.trim(), text }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, message: `Will HTTP ${res.status}` };
    }

    return { ok: true, message: "Note logged" };
  } catch {
    return { ok: false, message: "Will unreachable" };
  } finally {
    clearTimeout(timer);
  }
}
