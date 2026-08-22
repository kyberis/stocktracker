"use client";

import styles from "./agent-intro.module.css";

export function MockDashboardContent() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 pt-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-400">Home</p>
        <p className="text-xs text-slate-400">Tu check-in diario de cartera</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-slate-400">Valor total</p>
        <p className="text-2xl font-bold tabular-nums text-white">€ 42.318,50</p>
        <p className="text-sm font-semibold text-emerald-400 tabular-nums">+€ 612,40 (+1,47%) hoy</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Top mover</p>
          <p className="text-sm font-semibold text-white">NVDA +3,2%</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Dividendo</p>
          <p className="text-sm font-semibold text-white">MSFT ex-div mañana</p>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-4 py-2 text-xs font-semibold text-slate-300">
          Posiciones
        </div>
        <div className="divide-y divide-[color:var(--border)]">
          {[
            ["AAPL", "€ 8.420"],
            ["MSFT", "€ 6.110"],
            ["NVDA", "€ 5.980"],
          ].map(([ticker, value]) => (
            <div key={ticker} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="font-semibold text-white">{ticker}</span>
              <span className="tabular-nums text-slate-300">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MockEmptyContent() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 pt-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 18L9 11.25l4.306 4.307a11.955 11.955 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
          />
        </svg>
      </div>
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">Bienvenido a trefolio</h2>
        <p className="mx-auto max-w-md text-sm text-slate-400">
          Importa el CSV de tu bróker o añade tu primera acción manualmente.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="card flex flex-col items-center p-5">
          <p className="mb-1 text-sm font-semibold text-white">Importar cartera</p>
          <p className="text-xs text-slate-400">CSV del bróker en segundos</p>
        </div>
        <div className="card flex flex-col items-center p-5">
          <p className="mb-1 text-sm font-semibold text-white">Añadir acción</p>
          <p className="text-xs text-slate-400">Entrada manual rápida</p>
        </div>
      </div>
    </div>
  );
}

export function MockBehindLayer({
  visible,
  empty,
}: {
  visible: boolean;
  empty: boolean;
}) {
  return (
    <div className={`${styles.behind} ${visible ? styles.behindVisible : ""}`} aria-hidden={!visible}>
      {empty ? <MockEmptyContent /> : <MockDashboardContent />}
    </div>
  );
}
