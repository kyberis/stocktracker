import { getIdpServiceToken } from "@/lib/idp/config";
import type { OfficeIdentity } from "./office-identity";
import type { WillNoteHit } from "./types";

const TIMEOUT_MS = 8_000;

function getWillBaseUrl(): string | null {
  const base = process.env.WILL_BASE_URL?.trim();
  return base ? base.replace(/\/+$/, "") : null;
}

function identityPayload(identity: OfficeIdentity) {
  return {
    sub: identity.idpSub.trim(),
    email: identity.email.trim(),
    trefolioUserId: identity.trefolioUserId,
  };
}

function canCallSisterApp(identity: OfficeIdentity): boolean {
  return Boolean(identity.idpSub.trim() || identity.email.trim());
}

export async function searchWillNotes(identity: OfficeIdentity, query: string): Promise<WillNoteHit> {
  const base = getWillBaseUrl();
  const token = getIdpServiceToken();

  if (!canCallSisterApp(identity)) {
    return { available: false };
  }

  if (!base || !token) {
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
        "X-Trefolio-User-Id": identity.trefolioUserId,
      },
      body: JSON.stringify({ ...identityPayload(identity), query }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.status === 404) {
      return { available: false };
    }

    if (!res.ok) {
      return { available: false };
    }

    const data = (await res.json()) as Partial<WillNoteHit>;
    return {
      available: Boolean(data.excerpt),
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
  identity: OfficeIdentity,
  text: string,
): Promise<{ ok: boolean; message: string }> {
  const base = getWillBaseUrl();
  const token = getIdpServiceToken();
  if (!base || !token || !canCallSisterApp(identity)) {
    return { ok: false, message: "Will not configured or missing identity" };
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
        "X-Trefolio-User-Id": identity.trefolioUserId,
      },
      body: JSON.stringify({ ...identityPayload(identity), text }),
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
