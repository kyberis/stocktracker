"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { ScreeningEntryCta } from "@/components/screening/ScreeningEntryCta";

type Candidate = {
  ticker: string;
  name: string;
  sector: string;
  marketCap: number | null;
};

type SectorBlock = {
  label: string;
  pct: number;
  candidates: Candidate[];
};

type ResearchPayload = {
  sectors: SectorBlock[];
  recommendationKey: string | null;
};

export default function DiversifyResearchPage() {
  const { t } = useI18n();
  const track = useTrack();
  const router = useRouter();
  const { activePortfolioId, demoMode } = usePortfolio();
  const [data, setData] = useState<ResearchPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (demoMode) {
      setData({ sectors: [], recommendationKey: null });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const qs = activePortfolioId
        ? `?portfolioId=${encodeURIComponent(activePortfolioId)}`
        : "";
      const res = await fetch(`/api/home-v2/diversify-research${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setData({ sectors: [], recommendationKey: null });
        return;
      }
      setData((await res.json()) as ResearchPayload);
    } catch {
      setData({ sectors: [], recommendationKey: null });
    } finally {
      setLoading(false);
    }
  }, [activePortfolioId, demoMode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markActed() {
    if (!data?.recommendationKey || busy) {
      router.push("/");
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/home-v2/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: data.recommendationKey, action: "acted" }),
      });
      track("home_rec_acted", { kind: "diversify", key: data.recommendationKey });
    } finally {
      setBusy(false);
      router.push("/");
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
        {t("homeRecDiversifyResearchEyebrow")}
      </p>
      <h1 className="mt-1 text-xl font-bold text-[color:var(--foreground)] sm:text-2xl">
        {t("homeRecDiversifyResearchTitle")}
      </h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        {t("homeRecDiversifyResearchBody")}
      </p>

      {loading ? (
        <div className="card mt-6 h-40 animate-pulse rounded-xl bg-[color:var(--surface-soft)]" />
      ) : !data?.sectors.length ? (
        <div className="card mt-6 rounded-[20px] p-6 text-sm text-[color:var(--muted)]">
          {t("homeRecDiversifyResearchEmpty")}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {data.sectors.map((sector) => (
            <section
              key={sector.label}
              className="card rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5"
              aria-labelledby={`sector-${sector.label}`}
            >
              <h2
                id={`sector-${sector.label}`}
                className="text-base font-bold text-[color:var(--foreground)]"
              >
                {sector.label} · {sector.pct}%
              </h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {sector.pct <= 0
                  ? t("homeRecSectorNone")
                  : t("homeRecSectorLow")}
              </p>
              {sector.candidates.length === 0 ? (
                <p className="mt-3 text-sm text-[color:var(--muted)]">
                  {t("homeRecNoCandidates")}
                </p>
              ) : (
                <ul className="mt-3 list-none space-y-2 p-0">
                  {sector.candidates.map((c) => (
                    <li
                      key={c.ticker}
                      className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--foreground)]">
                          {c.ticker}
                          <span className="ml-2 font-normal text-[color:var(--muted)]">
                            {c.name}
                          </span>
                        </p>
                      </div>
                      <Link
                        href={`/analisis/${encodeURIComponent(c.ticker)}`}
                        onClick={() =>
                          track("home_rec_candidate_clicked", {
                            ticker: c.ticker,
                            sector: sector.label,
                          })
                        }
                        className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-700 dark:text-teal-300"
                      >
                        {t("homeRecAnalyzeLink")}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <ScreeningEntryCta className="mt-6" />

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void markActed()}
          className="btn-primary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
        >
          {t("homeRecTookAction")}
        </button>
        <Link
          href="/"
          className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
        >
          {t("homeRecBackHome")}
        </Link>
      </div>

      <p className="mt-4 text-[11px] text-[color:var(--muted)]">
        {t("homeRecDisclaimerFull")}
      </p>
    </main>
  );
}
