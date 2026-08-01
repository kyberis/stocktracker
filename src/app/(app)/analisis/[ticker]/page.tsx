import { parseTicker } from "@/lib/company-analysis/ticker";
import AnalisisShell from "./analisis-shell";

interface PageProps {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ exchange?: string }>;
}

export default async function CompanyAnalysisTickerPage({ params, searchParams }: PageProps) {
  const [{ ticker: raw }, { exchange }] = await Promise.all([params, searchParams]);
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

  return <AnalisisShell ticker={ticker} exchange={exchange || ""} />;
}
