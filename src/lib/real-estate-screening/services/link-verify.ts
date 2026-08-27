import type { ListingDetail } from "./portal";

export interface LinkVerifyResult {
  verified: boolean;
  reason: string;
}

/**
 * Confirm the listing URL still matches the dataset (price + typology).
 * Stub adapter is treated as verified. A live adapter must fetch the URL.
 */
export async function verifyListingLink(
  detail: ListingDetail,
  expected: { precio: number; tipologia: string },
  fetchImpl?: typeof fetch,
): Promise<LinkVerifyResult> {
  if (detail.url.includes("idealista.pt/imovel/") && detail.html) {
    const priceRaw = /class="info-data-price"[^>]*>([^<]+)/i.exec(detail.html)?.[1] ?? "";
    const price = Number(priceRaw.replace(/[^\d]/g, ""));
    const title = /class="main-info__title-main"[^>]*>([^<]+)/i.exec(detail.html)?.[1] ?? "";
    if (price && Math.abs(price - expected.precio) / expected.precio > 0.08) {
      return { verified: false, reason: "price mismatch vs dataset" };
    }
    if (expected.tipologia && title && !title.toUpperCase().includes(expected.tipologia.toUpperCase())) {
      return { verified: false, reason: "typology mismatch vs dataset" };
    }
    return { verified: true, reason: "fixture selectors match" };
  }

  if (!fetchImpl) {
    return { verified: false, reason: "live fetch not enabled" };
  }
  try {
    const res = await fetchImpl(detail.url, { redirect: "follow", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { verified: false, reason: `HTTP ${res.status}` };
    const html = await res.text();
    return verifyListingLink({ ...detail, html }, expected);
  } catch (err) {
    return { verified: false, reason: err instanceof Error ? err.message : "fetch failed" };
  }
}
