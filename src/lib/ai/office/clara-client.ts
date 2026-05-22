import { getIdpServiceToken } from "@/lib/idp/config";
import type { ClaraSavingsSummary } from "./types";

const TIMEOUT_MS = 8_000;

function getClaraBaseUrl(): string | null {
  const base = process.env.CLARA_BASE_URL?.trim();
  return base ? base.replace(/\/+$/, "") : null;
}

/**
 * Server-side call to Clara internal office API.
 * Returns `{ available: false }` when Clara is not configured or unreachable.
 */
export async function fetchClaraSavingsSummary(idpSub: string): Promise<ClaraSavingsSummary> {
  const base = getClaraBaseUrl();
  const token = getIdpServiceToken();
  if (!base || !token || !idpSub.trim()) {
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
    url.searchParams.set("sub", idpSub.trim());
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

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
  idpSub: string,
  amountEur: number,
): Promise<{ ok: boolean; message: string }> {
  const base = getClaraBaseUrl();
  const token = getIdpServiceToken();
  if (!base || !token || !idpSub.trim()) {
    return { ok: false, message: "Clara not configured" };
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
      },
      body: JSON.stringify({ sub: idpSub.trim(), amountEur }),
      signal: controller.signal,
      cache: "no-store",
    });

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
