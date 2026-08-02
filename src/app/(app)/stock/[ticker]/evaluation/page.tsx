import { redirect } from "next/navigation";
import { buildAnalisisRedirectHref } from "@/lib/company-analysis/stock-to-analisis-redirect";

interface PageProps {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ exchange?: string; reportId?: string }>;
}

/** Legacy /stock/[ticker]/evaluation → /analisis?tab=evaluation. */
export default async function StockEvaluationPage({ params, searchParams }: PageProps) {
  const [{ ticker }, { exchange, reportId }] = await Promise.all([params, searchParams]);
  redirect(
    buildAnalisisRedirectHref(decodeURIComponent(ticker), {
      exchange: exchange || undefined,
      reportId: reportId || undefined,
      tab: "evaluation",
    }),
  );
}
