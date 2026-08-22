import { getIdpServiceToken } from "@/lib/idp/config";
import type { OfficeIdentity } from "./office-identity";
import { normalizeSisterAppBaseUrl } from "./sister-app-url";
import type { ClaraSavingsSummary } from "./types";
import { trackExternalProvider } from "@/lib/traffic/provider-track";

const TIMEOUT_MS = 8_000;

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
      note: data.note,
    };
  } catch {
    return { available: false, note: "Clara unreachable" };
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
