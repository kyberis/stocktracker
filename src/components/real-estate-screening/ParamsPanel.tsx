"use client";

import {
  DEFAULT_SCREENING_PARAMS,
  PLAZO_CREDITO_ANIOS,
  type RealEstateScreeningParams,
  type TipoCompra,
} from "@/lib/real-estate-screening/schemas";
import { fill } from "@/lib/real-estate-screening/copy";
import { useRealEstateCopy } from "./use-real-estate-copy";

export function ParamsPanel({
  params,
  onChange,
  open,
  onToggle,
}: {
  params: RealEstateScreeningParams;
  onChange: (p: RealEstateScreeningParams) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const { copy } = useRealEstateCopy();
  const tipos: { id: TipoCompra; label: string }[] = [
    { id: "segunda_vivienda", label: copy.entry.tipoSegunda },
    { id: "primera_vivienda", label: copy.entry.tipoPrimera },
    { id: "investimento", label: copy.entry.tipoInvestimento },
  ];

  return (
    <div className="mt-4">
      <button
        type="button"
        className="text-sm font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-300"
        onClick={onToggle}
        aria-expanded={open}
      >
        {open ? copy.entry.hideParams : copy.entry.adjustParams}
      </button>
      {open && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">{copy.entry.presupuesto}</span>
            <input
              type="number"
              min={30000}
              max={5000000}
              step={10000}
              value={params.presupuestoMaxEur}
              onChange={(e) =>
                onChange({ ...params, presupuestoMaxEur: Number(e.target.value) || DEFAULT_SCREENING_PARAMS.presupuestoMaxEur })
              }
              className="mt-1 w-full rounded-xl border border-[color:var(--border)] px-3 py-2"
            />
            <input
              type="range"
              min={50000}
              max={800000}
              step={10000}
              value={Math.min(800000, params.presupuestoMaxEur)}
              onChange={(e) => onChange({ ...params, presupuestoMaxEur: Number(e.target.value) })}
              className="mt-2 w-full"
              aria-label={copy.entry.presupuesto}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">{copy.entry.entrada} (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={params.entradaPct}
              onChange={(e) => onChange({ ...params, entradaPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
              className="mt-1 w-full rounded-xl border border-[color:var(--border)] px-3 py-2"
            />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium">{copy.entry.tipoCompra}</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tipos.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChange({ ...params, tipoCompra: t.id })}
                  className={`min-h-11 rounded-full px-3 text-xs font-semibold ${
                    params.tipoCompra === t.id
                      ? "bg-amber-500/20 text-amber-900 dark:text-amber-200"
                      : "bg-[color:var(--surface-soft)] text-[color:var(--muted)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm">
            <span className="font-medium">{copy.entry.superficie} (m²)</span>
            <input
              type="number"
              min={20}
              max={500}
              value={params.superficieMinM2}
              onChange={(e) =>
                onChange({ ...params, superficieMinM2: Number(e.target.value) || DEFAULT_SCREENING_PARAMS.superficieMinM2 })
              }
              className="mt-1 w-full rounded-xl border border-[color:var(--border)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">{copy.entry.plazo}</span>
            <select
              value={params.plazoCreditoAnios}
              onChange={(e) =>
                onChange({
                  ...params,
                  plazoCreditoAnios: Number(e.target.value) as RealEstateScreeningParams["plazoCreditoAnios"],
                })
              }
              className="mt-1 w-full rounded-xl border border-[color:var(--border)] px-3 py-2"
            >
              {PLAZO_CREDITO_ANIOS.map((n) => (
                <option key={n} value={n}>
                  {fill(copy.entry.years, { n })}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

export function ParamsSummary({ params }: { params: RealEstateScreeningParams }) {
  const { copy } = useRealEstateCopy();
  const budget = new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(params.presupuestoMaxEur);
  return (
    <p className="text-sm text-[color:var(--muted)]">
      {fill(copy.entry.summaryBudget, {
        budget,
        entrada: params.entradaPct,
        m2: params.superficieMinM2,
        years: params.plazoCreditoAnios,
      })}
    </p>
  );
}
