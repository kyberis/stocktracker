import { getIdpServiceToken } from "@/lib/idp/config";
import type { OfficeIdentity } from "./office-identity";
import { normalizeSisterAppBaseUrl } from "./sister-app-url";
import type { WillNoteHit, WillRecentTagsHit } from "./types";

const TIMEOUT_MS = 8_000;

function getWillBaseUrl(): string | null {
  const base = process.env.WILL_BASE_URL?.trim();
  return base ? normalizeSisterAppBaseUrl(base) : null;
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
    return { available: false, note: "Missing IdP identity — sign in with your unified trefolio account" };
  }

  if (!base || !token) {
    if (process.env.NODE_ENV === "development") {
      return {
        available: true,
        excerpt: "Diversify into infrastructure when surplus allows",
        noteDate: new Date().toISOString().slice(0, 10),
        query,
        note: "Dev stub (Will not configured)",
      };
    }
    return { available: false, note: "Will not configured" };
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
      return {
        available: false,
        note: "No Will account linked to this identity — sign in at will.trefolio.com with the same email",
        query,
      };
    }

    if (!res.ok) {
      return { available: false, note: `Will HTTP ${res.status}`, query };
    }

    const data = (await res.json()) as Partial<WillNoteHit>;
    if (!data.excerpt) {
      return { available: false, note: "No matching notes", query };
    }
    return {
      available: true,
      excerpt: data.excerpt,
      noteDate: data.noteDate,
      query,
    };
  } catch {
    return { available: false, note: "Will unreachable", query };
  } finally {
    clearTimeout(timer);
  }
}

function extractHashtagLabels(text: string): string[] {
  const matches = text.match(/#[\w-]+/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/^#/, "")))].slice(0, 6);
}

/** Recent investment note tags — prefers Will internal API, falls back to hashtag parsing. */
export async function fetchWillRecentTags(identity: OfficeIdentity): Promise<WillRecentTagsHit> {
  const base = getWillBaseUrl();
  const token = getIdpServiceToken();

  if (!canCallSisterApp(identity)) {
    return { available: false, tags: [], note: "Missing IdP identity — sign in with your unified trefolio account" };
  }

  if (!base || !token) {
    if (process.env.NODE_ENV === "development") {
      return {
        available: true,
        tags: [
          { label: "DCA-VWCE", date: new Date().toISOString().slice(0, 10) },
          { label: "infra-rebalance", date: new Date().toISOString().slice(0, 10) },
        ],
        excerpt: "Diversify into infrastructure when surplus allows",
        noteDate: new Date().toISOString().slice(0, 10),
        note: "Dev stub (Will not configured)",
      };
    }
    return { available: false, tags: [], note: "Will not configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL(`${base}/api/internal/office/recent-tags`);
    const payload = identityPayload(identity);
    url.searchParams.set("sub", payload.sub);
    if (payload.email) url.searchParams.set("email", payload.email);
    if (payload.trefolioUserId) url.searchParams.set("trefolioUserId", payload.trefolioUserId);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "X-Trefolio-User-Id": payload.trefolioUserId,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.ok) {
      const data = (await res.json()) as Partial<WillRecentTagsHit>;
      const tags = Array.isArray(data.tags) ? data.tags : [];
      if (tags.length > 0 || data.excerpt) {
        return {
          available: true,
          tags,
          excerpt: data.excerpt,
          noteDate: data.noteDate,
          note: data.note,
        };
      }
    }

    const fallback = await searchWillNotes(identity, "investment thesis watchlist earnings moat");
    if (!fallback.available || !fallback.excerpt) {
      return {
        available: false,
        tags: [],
        note: fallback.note ?? "No matching notes",
      };
    }

    const tags = extractHashtagLabels(fallback.excerpt).map((label) => ({
      label,
      date: fallback.noteDate,
    }));

    return {
      available: true,
      tags,
      excerpt: fallback.excerpt,
      noteDate: fallback.noteDate,
      note: tags.length === 0 ? fallback.note : undefined,
    };
  } catch {
    return { available: false, tags: [], note: "Will unreachable" };
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
