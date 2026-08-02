import { redirect } from "next/navigation";
import { analisisCryptoRedirectHref } from "@/lib/asset-detail-href";
import { buildAnalisisRedirectHref } from "@/lib/company-analysis/stock-to-analisis-redirect";

interface PageProps {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ exchange?: string }>;
}

/** Legacy /stock/[ticker] → crypto page or canonical /analisis/[ticker]. */
export default async function StockDetailPage({ params, searchParams }: PageProps) {
  const [{ ticker: raw }, { exchange }] = await Promise.all([params, searchParams]);
  const ticker = decodeURIComponent(raw);
  const cryptoHref = analisisCryptoRedirectHref(ticker, exchange);
  if (cryptoHref) redirect(cryptoHref);
  redirect(
    buildAnalisisRedirectHref(ticker, {
      exchange: exchange || undefined,
    }),
  );
}
