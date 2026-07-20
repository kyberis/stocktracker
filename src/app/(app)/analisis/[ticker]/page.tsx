import { parseTicker } from "@/lib/company-analysis/ticker";
import CompanyAnalysisReportView from "@/components/company-analysis/CompanyAnalysisReport";

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export default async function CompanyAnalysisTickerPage({ params }: PageProps) {
  const { ticker: raw } = await params;
  const ticker = parseTicker(decodeURIComponent(raw));

  if (!ticker) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="card p-6 text-sm text-[color:var(--muted)]">
          Invalid ticker. Use a symbol matching A-Z, 0-9, dot or hyphen (max 10 chars).
        </div>
      </main>
    );
  }

  return (
    <main>
      <CompanyAnalysisReportView ticker={ticker} />
    </main>
  );
}
