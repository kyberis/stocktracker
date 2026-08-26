"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PhaseProgress, ScreeningReportPayload, Cobertura, RealEstateScreeningParams } from "@/lib/real-estate-screening/schemas";
import { useRealEstateCopy } from "./use-real-estate-copy";
import { RealEstateScreeningReportView } from "./RealEstateScreeningReportView";
import { TableSkeleton } from "@/components/Skeleton";

interface RunPayload {
  run: {
    id: string;
    status: string;
    phase: string;
    error: string | null;
    createdAt: string;
    finishedAt: string | null;
    zonas: Array<{ geocod: string; nombre: string }>;
    params: RealEstateScreeningParams;
    stale: boolean;
  };
  progress: PhaseProgress[];
  payload: ScreeningReportPayload | null;
  cobertura: Cobertura | null;
}

export function RealEstateRunProgress({ runId }: { runId: string }) {
  const { copy } = useRealEstateCopy();
  const [data, setData] = useState<RunPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const res = await fetch(`/api/real-estate/screening/${runId}`);
        if (res.status === 404) {
          setError(copy.common.notFound);
          return;
        }
        if (!res.ok) return;
        const json = (await res.json()) as RunPayload;
        if (cancelled) return;
        setData(json);
        const done = ["completed", "partial", "failed"].includes(json.run.status);
        if (!done) timer = setTimeout(() => void poll(), 2000);
      } catch {
        if (!cancelled) timer = setTimeout(() => void poll(), 3000);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [runId, copy.common.notFound]);

  if (error) {
    return (
      <div className="p-8 text-sm text-[color:var(--muted)]">
        {error}{" "}
        <Link href="/real-estate/screening" className="underline">
          {copy.common.back}
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <TableSkeleton />
      </div>
    );
  }

  const done = data.run.status === "completed" || data.run.status === "partial";
  const failed = data.run.status === "failed";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-16">
      <Link href="/real-estate/screening" className="text-sm text-[color:var(--muted)] hover:underline">
        {copy.common.back}
      </Link>
      <h1 className="text-2xl font-bold">{copy.progress.title}</h1>
      <p className="text-xs text-[color:var(--muted)]">{copy.progress.closeHint}</p>
      <ol className="card space-y-2 rounded-[20px] p-4">
        {data.progress.map((p) => {
          const mark = p.status === "done" ? "✓" : p.status === "running" ? "◐" : p.status === "failed" ? "!" : "·";
          const label = copy.progress.phases[p.phase];
          return (
            <li key={p.phase} className="flex items-center gap-3 text-sm">
              <span className="w-5 font-mono" aria-hidden>
                {mark}
              </span>
              <span className={p.status === "done" ? "text-[color:var(--foreground)]" : "text-[color:var(--muted)]"}>
                {label}
                {p.countLabel ? ` · ${p.countLabel}` : ""}
              </span>
            </li>
          );
        })}
      </ol>
      {failed ? (
        <p className="text-sm text-red-600 dark:text-red-400">{data.run.error || "Failed"}</p>
      ) : null}
      {done && data.run.status === "partial" ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
          {copy.progress.partialBanner}
        </p>
      ) : null}
      {done && data.payload ? (
        <RealEstateScreeningReportView
          runId={data.run.id}
          payload={data.payload}
          cobertura={data.cobertura}
          params={data.run.params}
          stale={data.run.stale}
          createdAt={data.run.createdAt}
        />
      ) : !done ? (
        <TableSkeleton />
      ) : null}
    </div>
  );
}
