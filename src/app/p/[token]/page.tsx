import type { Metadata } from "next";
import PublicFooter from "@/components/PublicFooter";

export const dynamic = "force-dynamic";

interface ShareData {
  displayName: string;
  showValues: boolean;
  holdings: Array<{
    ticker: string;
    name: string;
    shares?: number;
    purchasePrice?: number;
    displayCurrency: string;
    exchange: string;
    assetType: string;
    sector?: string;
    region?: string;
    assetClass?: string;
  }>;
  holdingsCount: number;
  error?: string;
}

async function getShareData(token: string): Promise<ShareData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/p/${token}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(
  props: { params: Promise<{ token: string }> }
): Promise<Metadata> {
  const { token } = await props.params;
  const data = await getShareData(token);
  if (!data) {
    return {
      title: "Portfolio Not Found — trefolio",
      robots: { index: false },
    };
  }

  return {
    title: `${data.displayName}'s Portfolio — trefolio`,
    description: `View ${data.displayName}'s investment portfolio on trefolio — the European investor's portfolio tracker.`,
    robots: { index: false },
    openGraph: {
      title: `${data.displayName}'s Portfolio — trefolio`,
      description: `View this portfolio on trefolio`,
      images: ["/og-default.png"],
    },
  };
}

export default async function PublicPortfolioPage(
  props: { params: Promise<{ token: string }> }
) {
  const { token } = await props.params;
  const data = await getShareData(token);

  if (!data) {
    return (
      <>
        <main className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Portfolio Not Found</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              This portfolio link may have been disabled or the URL is invalid.
            </p>
            <a href="/" className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium">
              Track your portfolio free →
            </a>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  // Group holdings by asset type for simple display
  const byType: Record<string, typeof data.holdings> = {};
  data.holdings.forEach((h) => {
    const key = h.assetType || "stock";
    if (!byType[key]) byType[key] = [];
    byType[key].push(h);
  });

  return (
    <>
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-7 h-7 rounded-lg" viewBox="0 0 32 32" aria-label="trefolio logo">
              <defs>
                <linearGradient id="pa" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#6ee7b7"/><stop offset="100%" stopColor="#10b981"/></linearGradient>
              </defs>
              <rect width="32" height="32" rx="7" fill="#0f172a"/>
              <g transform="translate(16,16) rotate(45)">
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#pa)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#pa)" transform="rotate(90)" opacity=".8"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#pa)" transform="rotate(180)" opacity=".6"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#pa)" transform="rotate(270)" opacity=".9"/>
                <circle cx="0" cy="0" r="1.2" fill="#0f172a" opacity=".35"/>
              </g>
            </svg>
            <span className="text-sm font-bold text-gray-900 dark:text-white">trefolio</span>
          </div>
          <a
            href="/"
            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Track your portfolio free →
          </a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {data.displayName}&rsquo;s Portfolio
          </h1>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
            {data.holdingsCount} {data.holdingsCount === 1 ? "holding" : "holdings"}
          </p>
        </div>

        {/* Holdings table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm" aria-label={`${data.displayName}'s portfolio holdings`}>
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-slate-400">Ticker</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-slate-400">Name</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-slate-400">Exchange</th>
                {data.showValues && (
                  <>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-slate-400">Shares</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {data.holdings.map((h) => (
                <tr key={h.ticker} className="border-b border-gray-50 dark:border-slate-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-white">{h.ticker}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300 max-w-xs truncate">{h.name}</td>
                  <td className="px-4 py-3 text-gray-400 dark:text-slate-500 text-xs">{h.exchange || "—"}</td>
                  {data.showValues && h.shares != null && (
                    <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">{h.shares}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-6 text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Track your own portfolio for free
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
            Join European investors tracking their portfolios with trefolio.
          </p>
          <a
            href="/signup"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
          >
            Get Started Free →
          </a>
        </div>

        {/* Financial disclaimer — required by legal-advisor skill */}
        <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center leading-relaxed">
          This portfolio is shared for informational purposes only. trefolio is not a financial advisor.
          Past performance does not guarantee future results. This content does not constitute investment advice.
        </p>
      </div>
    </main>
    <PublicFooter />
  </>
  );
}
