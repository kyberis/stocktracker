import { getIdpServiceToken } from "@/lib/idp/config";
import { getClaraLoginUrl } from "@/lib/clara-public-url";
import type { OfficeIdentity } from "./office-identity";
import { normalizeSisterAppBaseUrl } from "./sister-app-url";
import type { ClaraSavingsSummary } from "./types";
import { trackExternalProvider } from "@/lib/traffic/provider-track";

const TIMEOUT_MS = 8_000;
const CHAT_TIMEOUT_MS = 90_000;

function getClaraBaseUrl(): string | null {
  const base = process.env.CLARA_BASE_URL?.trim();
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

/**
 * Server-side call to Clara internal office API.
 * Returns `{ available: false }` when Clara is not configured or unreachable.
 */
export async function fetchClaraSavingsSummary(identity: OfficeIdentity): Promise<ClaraSavingsSummary> {
  const base = getClaraBaseUrl();
  const token = getIdpServiceToken();

  if (!canCallSisterApp(identity)) {
    return {
      available: false,
      note: "Missing IdP identity — sign in with your unified trefolio account",
    };
  }

  if (!base || !token) {
    if (process.env.NODE_ENV === "development") {
      return {
        available: true,
        emergencyBalanceEur: 12_000,
        emergencyTargetEur: 10_000,
        surplusEur: 800,
        freeInInvestingBucketEur: 1_200,
        note: "Dev stub (Clara not configured)",
      };
    }
    return { available: false, note: "Clara not configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL(`${base}/api/internal/office/savings-summary`);
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
    trackExternalProvider("clara");

    if (res.status === 404) {
      return {
        available: false,
        note: "No Clara account linked to this identity — sign in at clara.trefolio.com with the same email",
      };
    }

    if (!res.ok) {
      return { available: false, note: `Clara HTTP ${res.status}` };
    }

    const data = (await res.json()) as Partial<ClaraSavingsSummary>;
    return {
      available: true,
      emergencyBalanceEur: data.emergencyBalanceEur,
      emergencyTargetEur: data.emergencyTargetEur,
      surplusEur: data.surplusEur,
      freeInInvestingBucketEur: data.freeInInvestingBucketEur,
      monthKey: data.monthKey,
      dayOfMonth: data.dayOfMonth,
      daysInMonth: data.daysInMonth,
      hasMonthRecord: data.hasMonthRecord,
      currency: data.currency,
      incomeReceived: data.incomeReceived,
      incomeExpected: data.incomeExpected,
      plannedExpenses: data.plannedExpenses,
      paidExpenses: data.paidExpenses,
      remainingExpenses: data.remainingExpenses,
      monthBalance: data.monthBalance,
      note: data.note,
    };
  } catch {
    return { available: false, note: "Clara unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

export type EnsureClaraUserResult =
  | { ok: true; created: boolean; id: string; idpSub: string | null }
  | { ok: false; error: string; status?: number };

/**
 * Server-side provision of a Clara local User for the shared IdP identity.
 * Calls Clara `POST /api/internal/office/ensure-user`.
 */
export async function ensureClaraUser(
  identity: OfficeIdentity,
  opts?: { name?: string | null },
): Promise<EnsureClaraUserResult> {
  const base = getClaraBaseUrl();
  const token = getIdpServiceToken();

  if (!identity.idpSub.trim()) {
    return { ok: false, error: "missing_idp_sub", status: 400 };
  }
  if (!identity.email.trim()) {
    return { ok: false, error: "missing_email", status: 400 };
  }

  if (!base || !token) {
    if (process.env.NODE_ENV === "development") {
      return {
        ok: true,
        created: true,
        id: "dev-clara-stub",
        idpSub: identity.idpSub.trim(),
      };
    }
    return { ok: false, error: "clara_not_configured", status: 503 };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/api/internal/office/ensure-user`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Trefolio-User-Id": identity.trefolioUserId,
      },
      body: JSON.stringify({
        ...identityPayload(identity),
        ...(opts?.name ? { name: opts.name } : {}),
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    trackExternalProvider("clara");

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        ok: false,
        error: errBody.error || `Clara HTTP ${res.status}`,
        status: res.status,
      };
    }

    const data = (await res.json()) as {
      ok?: boolean;
      created?: boolean;
      id?: string;
      idpSub?: string | null;
    };
    if (!data.ok || !data.id) {
      return { ok: false, error: "invalid_response", status: 502 };
    }
    return {
      ok: true,
      created: Boolean(data.created),
      id: data.id,
      idpSub: data.idpSub ?? identity.idpSub.trim(),
    };
  } catch {
    return { ok: false, error: "clara_unreachable", status: 503 };
  } finally {
    clearTimeout(timer);
  }
}

export async function proposeClaraSavingsRelease(
  identity: OfficeIdentity,
  amountEur: number,
): Promise<{ ok: boolean; message: string }> {
  const base = getClaraBaseUrl();
  const token = getIdpServiceToken();
  if (!base || !token || !canCallSisterApp(identity)) {
    return { ok: false, message: "Clara not configured or missing identity" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/api/internal/office/propose-release`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Trefolio-User-Id": identity.trefolioUserId,
      },
      body: JSON.stringify({ ...identityPayload(identity), amountEur }),
      signal: controller.signal,
      cache: "no-store",
    });
    trackExternalProvider("clara");

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return { ok: false, message: err || `Clara HTTP ${res.status}` };
    }

    const data = (await res.json()) as { message?: string };
    return { ok: true, message: data.message || "Savings marked for investing" };
  } catch {
    return { ok: false, message: "Clara unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

export type ClaraConsultResult =
  | { available: true; text: string; note?: string }
  | { available: false; proposeClara?: boolean; loginUrl?: string; note?: string };

export async function fetchClaraReply(input: {
  identity: OfficeIdentity;
  message: string;
  language?: string;
}): Promise<ClaraConsultResult> {
  const base = getClaraBaseUrl();
  const token = getIdpServiceToken();
  const loginUrl = getClaraLoginUrl();

  if (!canCallSisterApp(input.identity)) {
    return {
      available: false,
      proposeClara: true,
      loginUrl,
      note: "Missing IdP identity — sign in with your unified trefolio account",
    };
  }

  if (!base || !token) {
    if (process.env.NODE_ENV === "development") {
      return {
        available: true,
        text: "Dev stub (Clara not configured): no live cashflow.",
        note: "Dev stub",
      };
    }
    return { available: false, note: "Clara not configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/api/internal/office/clara-chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Trefolio-User-Id": input.identity.trefolioUserId,
      },
      body: JSON.stringify({
        billingSource: "trefolio",
        ...identityPayload(input.identity),
        message: input.message,
        language: input.language,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    trackExternalProvider("clara");

    if (res.status === 404) {
      const data = (await res.json().catch(() => ({}))) as {
        loginUrl?: string;
        note?: string;
      };
      return {
        available: false,
        proposeClara: true,
        loginUrl: data.loginUrl || loginUrl,
        note: data.note || "No Clara account linked to this identity",
      };
    }

    if (!res.ok) {
      return { available: false, note: `Clara HTTP ${res.status}` };
    }

    const data = (await res.json()) as { available?: boolean; text?: string; note?: string };
    if (data.available && data.text) {
      return { available: true, text: data.text, note: data.note };
    }
    return { available: false, note: data.note || "Clara returned no text" };
  } catch {
    return { available: false, note: "Clara unreachable" };
  } finally {
    clearTimeout(timer);
  }
}
