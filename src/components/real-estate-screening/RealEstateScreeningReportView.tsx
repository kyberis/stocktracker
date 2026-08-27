"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "@/lib/theme-context";
import { fill } from "@/lib/real-estate-screening/copy";
import {
  reportStaleAfterDays,
  type Cobertura,
  type RealEstateScreeningParams,
  type ScreeningReportPayload,
} from "@/lib/real-estate-screening/schemas";
import { useRealEstateCopy } from "./use-real-estate-copy";

const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function RealEstateScreeningReportView({
  runId,
  payload,
  cobertura,
  params,
  stale,
  createdAt,
}: {
  runId: string;
  payload: ScreeningReportPayload;
  cobertura: Cobertura | null;
  params: RealEstateScreeningParams;
  stale: boolean;
  createdAt: string;
}) {
  const { copy } = useRealEstateCopy();
  const { isDark } = useTheme();
  const [sortKey, setSortKey] = useState<"nombre" | "precioM2Actual" | "yieldBrutaPct">("nombre");
  const [compareId, setCompareId] = useState("");
  const [compareRuns, setCompareRuns] = useState<Array<{ id: string; createdAt: string }>>([]);

  const tick = isDark ? "#94a3b8" : "#9ca3af";
  const axis = isDark ? "#334155" : "#e5e7eb";

  const scatter = payload.candidates
    .filter((c) => c.descuentoVsMedianaPct != null && c.yieldNetaPct != null)
    .map((c) => ({
      x: c.descuentoVsMedianaPct as number,
      y: c.yieldNetaPct as number,
      name: c.titulo,
    }));

  const sortedZonas = useMemo(() => {
    return [...payload.zonas].sort((a, b) => {
      if (sortKey === "nombre") return a.nombre.localeCompare(b.nombre);
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return Number(bv) - Number(av);
    });
  }, [payload.zonas, sortKey]);

  const byConcelho = useMemo(() => {
    const map = new Map<string, typeof payload.candidates>();
    for (const c of payload.candidates) {
      const list = map.get(c.concelho) ?? [];
      list.push(c);
      map.set(c.concelho, list);
    }
    return [...map.entries()];
  }, [payload.candidates]);

  function exportCsv() {
    const header = [
      "id",
      "title",
      "concelho",
      "price",
      "m2",
      "eur_m2",
      "rent",
      "cf_var",
      "cf_fix",
      "cf_stress",
      "url",
    ];
    const lines = [
      header.join(","),
      ...payload.candidates.map((c) =>
        [
          csvEscape(c.listingId),
          csvEscape(c.titulo),
          csvEscape(c.concelho),
          c.precio,
          c.areaUsadaM2,
          c.eurM2.toFixed(0),
          c.rentaEstimada ?? "",
          c.scenarios[0]?.cashflow.toFixed(0) ?? "",
          c.scenarios[1]?.cashflow.toFixed(0) ?? "",
          c.scenarios[2]?.cashflow.toFixed(0) ?? "",
          csvEscape(c.urlVerified ? c.url : ""),
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `zone-screening-${runId}.csv`;
    a.click();
  }

  async function loadCompare() {
    const res = await fetch("/api/real-estate/screening");
    if (!res.ok) return;
    const data = await res.json();
    setCompareRuns(
      (data.runs as Array<{ id: string; status: string; createdAt: string }>)
        .filter((r) => r.id !== runId && (r.status === "completed" || r.status === "partial"))
        .map((r) => ({ id: r.id, createdAt: r.createdAt })),
    );
  }

  const empty = payload.candidates.length === 0;

  return (
    <div className="space-y-8">
      <p className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs text-[color:var(--muted)]">
        {copy.common.disclaimerFull}
      </p>

      {stale ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <p className="font-semibold">{fill(copy.report.staleTitle, { n: reportStaleAfterDays })}</p>
          <p className="mt-1 text-[color:var(--muted)]">{copy.report.staleBody}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary min-h-11 rounded-xl px-3 text-sm" onClick={exportCsv}>
          {copy.report.exportCsv}
        </button>
        <Link
          href="/real-estate/screening"
          className="btn-secondary inline-flex min-h-11 items-center rounded-xl px-3 text-sm"
        >
          {copy.report.rerun}
        </Link>
        <button
          type="button"
          className="btn-secondary min-h-11 rounded-xl px-3 text-sm"
          onClick={() => void loadCompare()}
        >
          {copy.report.compare}
        </button>
        {compareRuns.length > 0 ? (
          <select
            value={compareId}
            onChange={(e) => setCompareId(e.target.value)}
            className="min-h-11 rounded-xl border border-[color:var(--border)] px-2 text-sm"
            aria-label={copy.report.comparePick}
          >
            <option value="">{copy.report.comparePick}</option>
            {compareRuns.map((r) => (
              <option key={r.id} value={r.id}>
                {r.createdAt.slice(0, 10)} · {r.id.slice(0, 8)}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {compareId ? (
        <p className="text-sm">
          <Link href={`/real-estate/screening/runs/${compareId}`} className="underline">
            {compareId.slice(0, 8)}
          </Link>
          {" vs "}
          {runId.slice(0, 8)} · {createdAt.slice(0, 10)}
        </p>
      ) : null}

      {empty ? (
        <section className="card rounded-[20px] p-5">
          <h2 className="text-lg font-bold">{copy.report.emptyTitle}</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">{payload.emptyReason || copy.report.emptyBody}</p>
        </section>
      ) : null}

      <section className="card rounded-[20px] p-5">
        <h2 className="text-lg font-bold">{copy.report.conclusions}</h2>
        <ol className="mt-3 space-y-3">
          {payload.conclusions.map((c, i) => (
            <li key={i}>
              <p className="font-semibold">{c.title}</p>
              <p className="text-sm text-[color:var(--muted)]">{c.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card rounded-[20px] p-5">
        <h2 className="text-lg font-bold">{copy.report.arithmetic}</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[color:var(--muted)]">{copy.report.downPayment}</dt>
            <dd className="font-semibold">
              {eur(payload.arithmetic.entradaEur)} ({payload.arithmetic.entradaPct}%)
            </dd>
          </div>
          <div>
            <dt className="text-[color:var(--muted)]">{copy.report.purchaseCosts}</dt>
            <dd className="font-semibold">{eur(payload.arithmetic.costesCompraTipicos)}</dd>
          </div>
          <div>
            <dt className="text-[color:var(--muted)]">{copy.report.cashAtClose}</dt>
            <dd className="font-semibold">{eur(payload.arithmetic.cajaCierreTipica)}</dd>
          </div>
          <div>
            <dt className="text-[color:var(--muted)]">{copy.report.installment}</dt>
            <dd className="font-semibold">
              var {eur(payload.arithmetic.cuotaVariavel)} · fix {eur(payload.arithmetic.cuotaFixa)} · stress{" "}
              {eur(payload.arithmetic.cuotaStress)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card overflow-x-auto rounded-[20px] p-5">
        <h2 className="text-lg font-bold">{copy.report.gapTitle}</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="text-[color:var(--muted)]">
              <th className="py-1">Zona</th>
              <th>Pedido €/m²</th>
              <th>INE €/m²</th>
              <th>Gap</th>
            </tr>
          </thead>
          <tbody>
            {payload.brechaPedidoVsFirmado.map((g) => (
              <tr key={`${g.geocod}-${g.tipologia}`} className="border-t border-[color:var(--border)]">
                <td className="py-2">{g.nombre}</td>
                <td>{g.pedidoM2 != null ? g.pedidoM2.toFixed(1) : "—"}</td>
                <td>{g.firmadoM2 != null ? g.firmadoM2.toFixed(1) : "—"}</td>
                <td>{g.brechaPct != null ? `${g.brechaPct.toFixed(0)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto rounded-[20px] p-5">
        <h2 className="text-lg font-bold">{copy.report.creditTable}</h2>
        <p className="text-xs text-[color:var(--muted)]">{copy.report.formula}</p>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="text-[color:var(--muted)]">
              <th className="py-1">Candidato</th>
              <th>Var</th>
              <th>Fix</th>
              <th>Stress</th>
            </tr>
          </thead>
          <tbody>
            {payload.candidates.map((c) => (
              <tr key={c.listingId} className="border-t border-[color:var(--border)]">
                <td className="py-2">{c.titulo}</td>
                {c.scenarios.map((s) => (
                  <td key={s.scenario} title={s.formula}>
                    {eur(s.cashflow)}
                    <div className="text-[10px] text-[color:var(--muted)]">cov {s.cobertura.toFixed(2)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card rounded-[20px] p-5">
        <h2 className="text-lg font-bold">{copy.report.fiscalTitle}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {payload.candidates.map((c) => (
            <li key={c.listingId}>
              <span className="font-medium">{c.titulo}:</span> {c.fiscalMejor.kind} ({(c.fiscalMejor.tasa * 100).toFixed(0)}
              %) vs {c.fiscalAlternativa.kind} — {c.fiscalMejor.note}
            </li>
          ))}
        </ul>
      </section>

      <section className="card rounded-[20px] p-5">
        <h2 className="text-lg font-bold">{copy.report.scatterTitle}</h2>
        {scatter.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--muted)]">—</p>
        ) : (
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <XAxis
                  dataKey="x"
                  name="discount"
                  tick={{ fill: tick, fontSize: 11 }}
                  stroke={axis}
                  label={{ value: "Δ vs median %", position: "insideBottom", offset: -2, fill: tick }}
                />
                <YAxis
                  dataKey="y"
                  name="yield"
                  tick={{ fill: tick, fontSize: 11 }}
                  stroke={axis}
                  label={{ value: "net yield %", angle: -90, position: "insideLeft", fill: tick }}
                />
                <Tooltip />
                <Scatter data={scatter} fill="#d97706" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="card rounded-[20px] p-5">
        <h2 className="text-lg font-bold">{copy.report.mapTitle}</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{copy.report.mapUnavailable}</p>
      </section>

      <section className="card overflow-x-auto rounded-[20px] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{copy.report.allZones}</h2>
          <label className="text-xs">
            {copy.report.sort}{" "}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              className="rounded-lg border border-[color:var(--border)] px-2 py-1"
            >
              <option value="nombre">A–Z</option>
              <option value="precioM2Actual">€/m²</option>
              <option value="yieldBrutaPct">yield</option>
            </select>
          </label>
        </div>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="text-[color:var(--muted)]">
              <th className="py-1">Zona</th>
              <th>€/m²</th>
              <th>5y avg</th>
              <th>CAGR</th>
              <th>Yield</th>
            </tr>
          </thead>
          <tbody>
            {sortedZonas.map((z) => (
              <tr key={z.geocod} className="border-t border-[color:var(--border)]">
                <td className="py-2">
                  {z.nombre}
                  {z.failed ? <span className="ml-1 text-[10px] text-amber-700">failed</span> : null}
                </td>
                <td>{z.precioM2Actual ?? "—"}</td>
                <td>{z.precioM2Media5a != null ? z.precioM2Media5a.toFixed(0) : "—"}</td>
                <td>{z.cagrPct != null ? `${z.cagrPct.toFixed(1)}%` : "—"}</td>
                <td>{z.yieldBrutaPct != null ? `${z.yieldBrutaPct.toFixed(1)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-bold">{copy.report.candidates}</h2>
        <div className="mt-3 space-y-6">
          {byConcelho.map(([concelho, cards]) => (
            <div key={concelho}>
              <h3 className="mb-2 font-semibold">{concelho}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {cards.map((c) => (
                  <article key={c.listingId} className="card rounded-[20px] p-4 text-sm">
                    <h4 className="font-semibold">{c.titulo}</h4>
                    <p className="text-[color:var(--muted)]">
                      {eur(c.precio)} · {c.areaUsadaM2} m² · {c.eurM2.toFixed(0)} €/m²
                    </p>
                    <p>
                      Rent {c.rentaEstimada != null ? eur(c.rentaEstimada) : "—"} · cov{" "}
                      {c.cobertura != null ? c.cobertura.toFixed(2) : "—"} · close {eur(c.cajaCierre)}
                    </p>
                    <p className="text-xs text-[color:var(--muted)]">
                      var {c.scenarios[0] ? eur(c.scenarios[0].cashflow) : "—"} · fix{" "}
                      {c.scenarios[1] ? eur(c.scenarios[1].cashflow) : "—"} · stress{" "}
                      {c.scenarios[2] ? eur(c.scenarios[2].cashflow) : "—"}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{c.rentaExplicacion}</p>
                    {c.rentaBajaConfianza ? (
                      <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">{copy.report.lowConfidence}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.flags.map((f) => (
                        <span
                          key={f.kind}
                          title={f.quote}
                          className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold"
                        >
                          {f.kind}
                        </span>
                      ))}
                      <span className="rounded bg-[color:var(--surface-soft)] px-1.5 py-0.5 text-[10px]">
                        {c.urlVerified ? copy.report.verified : copy.report.unverified}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-3 text-xs">
                      {c.urlVerified ? (
                        <a href={c.url} target="_blank" rel="noreferrer" className="underline">
                          Listing
                        </a>
                      ) : (
                        <span className="text-[color:var(--muted)]">{copy.report.unverified}</span>
                      )}
                      {c.searchUrl ? (
                        <a href={c.searchUrl} target="_blank" rel="noreferrer" className="underline">
                          Search
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card rounded-[20px] p-5">
        <h2 className="text-lg font-bold">{copy.report.discarded}</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {payload.discarded.map((d) => (
            <li key={d.listingId}>
              <p className="font-medium">{d.titulo}</p>
              <p className="text-[color:var(--muted)]">{d.reason}</p>
              {d.flags.map((f) => (
                <blockquote key={f.kind} className="mt-1 border-l-2 border-amber-500/40 pl-2 text-xs italic">
                  {f.kind}: “{f.quote}”
                </blockquote>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <section className="card rounded-[20px] p-5 text-sm">
        <h2 className="text-lg font-bold">{copy.report.method}</h2>
        <p className="mt-2 text-xs text-[color:var(--muted)]">{copy.report.coverageSample}</p>
        {cobertura ? (
          <p className="mt-2">
            Seen {cobertura.anunciosVistos} listings ({cobertura.anunciosUnicos} unique). Failed zones:{" "}
            {cobertura.zonasFallidas.length === 0
              ? "none"
              : cobertura.zonasFallidas.map((z) => `${z.nombre} (${z.reason})`).join("; ")}
            .
          </p>
        ) : null}
        <ul className="mt-2 list-disc pl-5 text-[color:var(--muted)]">
          {payload.method.supuestos.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="mt-2 font-medium">Not covered</p>
        <ul className="list-disc pl-5 text-[color:var(--muted)]">
          {payload.method.noCubierto.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs">
          Budget snapshot: {eur(params.presupuestoMaxEur)}, {params.entradaPct}% down, {params.superficieMinM2} m²,{" "}
          {params.plazoCreditoAnios}y.
        </p>
      </section>
    </div>
  );
}
