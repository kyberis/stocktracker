"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEFAULT_SCREENING_PARAMS,
  realEstateScreeningParamsSchema,
  type RealEstateScreeningParams,
  type ZonaCatalogo,
} from "@/lib/real-estate-screening/schemas";
import { ZoneMultiSelect } from "./ZoneMultiSelect";
import { ParamsPanel, ParamsSummary } from "./ParamsPanel";
import { useRealEstateCopy } from "./use-real-estate-copy";

const DRAFT_KEY = "trefolio-re-screening-draft";

interface RecentRun {
  id: string;
  status: string;
  createdAt: string;
  zonas: Array<{ nombre?: string }>;
}

export function RealEstateEntry() {
  const { copy } = useRealEstateCopy();
  const router = useRouter();
  const [zones, setZones] = useState<ZonaCatalogo[]>([]);
  const [params, setParams] = useState<RealEstateScreeningParams>(DEFAULT_SCREENING_PARAMS);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recent, setRecent] = useState<RecentRun[]>([]);
  const [quota, setQuota] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { zones?: ZonaCatalogo[]; params?: RealEstateScreeningParams };
      if (parsed.zones) setZones(parsed.zones);
      if (parsed.params) {
        const ok = realEstateScreeningParamsSchema.safeParse(parsed.params);
        if (ok.success) setParams(ok.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ zones, params }));
    } catch {
      // ignore
    }
  }, [zones, params]);

  useEffect(() => {
    void fetch("/api/real-estate/screening")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.runs) setRecent(data.runs as RecentRun[]);
      })
      .catch(() => {});
  }, []);

  const paramsValid = useMemo(() => realEstateScreeningParamsSchema.safeParse(params).success, [params]);
  const canSubmit = zones.length > 0 && paramsValid && !submitting;

  async function onAnalyze() {
    setError(null);
    if (zones.length === 0) {
      setError(copy.entry.needZone);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/real-estate/screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zoneGeocods: zones.map((z) => z.geocod),
          params,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 || res.status === 403) {
        setQuota(copy.quota.exhausted);
        setSubmitting(false);
        return;
      }
      if (!res.ok || !data.runId) {
        setError(typeof data.error === "string" ? data.error : copy.entry.needZone);
        setSubmitting(false);
        return;
      }
      router.push(`/real-estate/screening/runs/${data.runId}`);
    } catch {
      setError(copy.entry.needZone);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-16">
      <div>
        <Link href="/" className="text-sm text-[color:var(--muted)] hover:underline">
          {copy.common.backHome}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[color:var(--foreground)]">{copy.entry.title}</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{copy.entry.subtitle}</p>
      </div>

      <section className="card rounded-[20px] p-5">
        <ZoneMultiSelect selected={zones} onChange={setZones} />
        <ParamsPanel
          params={params}
          onChange={setParams}
          open={paramsOpen}
          onToggle={() => setParamsOpen((v) => !v)}
        />
        <div className="mt-4 space-y-2">
          <ParamsSummary params={params} />
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          {quota ? <p className="text-sm text-amber-800 dark:text-amber-300">{quota}</p> : null}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void onAnalyze()}
            className="btn-primary min-h-11 w-full rounded-xl px-4 text-sm font-semibold disabled:opacity-50 sm:w-auto"
          >
            {copy.entry.analyze}
          </button>
        </div>
      </section>

      <p className="text-xs text-[color:var(--muted)]">{copy.common.disclaimerShort}</p>

      <section>
        <h2 className="text-sm font-semibold">{copy.entry.recentTitle}</h2>
        {recent.length === 0 ? (
          <p className="mt-1 text-sm text-[color:var(--muted)]">{copy.entry.recentEmpty}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {recent.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/real-estate/screening/runs/${r.id}`}
                  className="text-sm text-amber-800 hover:underline dark:text-amber-300"
                >
                  {r.zonas.map((z) => z.nombre).filter(Boolean).join(", ") || r.id} · {r.status}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
