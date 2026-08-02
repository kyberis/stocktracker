import { redirect } from "next/navigation";
import { buildAnalisisRedirectHref } from "@/lib/company-analysis/stock-to-analisis-redirect";

interface PageProps {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ exchange?: string }>;
}

/** Legacy /stock/[ticker] → canonical /analisis/[ticker]. */
export default async function StockDetailPage({ params, searchParams }: PageProps) {
  const [{ ticker }, { exchange }] = await Promise.all([params, searchParams]);
  redirect(
    buildAnalisisRedirectHref(decodeURIComponent(ticker), {
      exchange: exchange || undefined,
    }),
  );
}
