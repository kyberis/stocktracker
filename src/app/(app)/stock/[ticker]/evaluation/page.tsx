import EvaluationShell from "./evaluation-shell";

interface PageProps {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ exchange?: string; reportId?: string }>;
}

export default async function StockEvaluationPage({ params, searchParams }: PageProps) {
  const [{ ticker }, { exchange, reportId }] = await Promise.all([
    params,
    searchParams,
  ]);

  return (
    <EvaluationShell
      ticker={decodeURIComponent(ticker)}
      exchange={exchange || ""}
      reportId={reportId}
    />
  );
}
