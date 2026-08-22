"use client";

import Link from "next/link";
import { useState } from "react";
import AgentIntroBriefing from "./AgentIntroBriefing";
import AgentIntroConvergence from "./AgentIntroConvergence";
import { MockBehindLayer } from "./AgentIntroMockShared";
import styles from "./agent-intro.module.css";

type Variant = "convergence" | "briefing";
type UserState = "portfolio" | "empty";

export default function AgentIntroMockPreview() {
  const [variant, setVariant] = useState<Variant>("convergence");
  const [userState, setUserState] = useState<UserState>("portfolio");
  const [playKey, setPlayKey] = useState(0);
  const [behindVisible, setBehindVisible] = useState(false);

  const replay = () => {
    setBehindVisible(false);
    setPlayKey((k) => k + 1);
  };

  const empty = userState === "empty";

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div
        role="status"
        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
      >
        <strong className="font-semibold">Mock de diseño</strong>
        <span className="mx-1.5">—</span>
        Intro animada Warren + Clara al entrar a trefolio.com. No es funcionalidad de producción.
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--foreground)]">Intro de agentes</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Dos versiones para comparar. Tras la animación se despliega el dashboard o el empty state.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
        >
          Volver al home
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-[color:var(--border)] p-1">
          <button
            type="button"
            onClick={() => {
              setVariant("convergence");
              replay();
            }}
            className={`min-h-10 rounded-full px-4 text-xs font-semibold transition-colors ${
              variant === "convergence"
                ? "bg-emerald-500 text-white"
                : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            }`}
          >
            A · Convergencia
          </button>
          <button
            type="button"
            onClick={() => {
              setVariant("briefing");
              replay();
            }}
            className={`min-h-10 rounded-full px-4 text-xs font-semibold transition-colors ${
              variant === "briefing"
                ? "bg-emerald-500 text-white"
                : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            }`}
          >
            B · Briefing
          </button>
        </div>

        <div className="inline-flex rounded-full border border-[color:var(--border)] p-1">
          <button
            type="button"
            onClick={() => {
              setUserState("portfolio");
              replay();
            }}
            className={`min-h-10 rounded-full px-4 text-xs font-semibold transition-colors ${
              userState === "portfolio"
                ? "bg-[color:var(--surface-highlight)] text-[color:var(--foreground)]"
                : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            }`}
          >
            Con cartera
          </button>
          <button
            type="button"
            onClick={() => {
              setUserState("empty");
              replay();
            }}
            className={`min-h-10 rounded-full px-4 text-xs font-semibold transition-colors ${
              userState === "empty"
                ? "bg-[color:var(--surface-highlight)] text-[color:var(--foreground)]"
                : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            }`}
          >
            Usuario nuevo
          </button>
        </div>

        <button type="button" onClick={replay} className="btn-secondary min-h-10 px-4 text-xs font-semibold">
          Reproducir intro
        </button>
      </div>

      <div className={styles.mockViewport}>
        <MockBehindLayer visible={behindVisible} empty={empty} />
        {variant === "convergence" ? (
          <AgentIntroConvergence
            key={`mock-conv-${playKey}`}
            playKey={playKey}
            contained
            dashboardReady
            onComplete={() => setBehindVisible(true)}
            onSkip={() => setBehindVisible(true)}
          />
        ) : (
          <AgentIntroBriefing
            key={`mock-brief-${playKey}`}
            playKey={playKey}
            contained
            dashboardReady
            onComplete={() => setBehindVisible(true)}
            onSkip={() => setBehindVisible(true)}
          />
        )}
      </div>

      <section className="card space-y-3 p-4 text-sm text-[color:var(--muted)]">
        <h2 className="text-sm font-semibold text-[color:var(--foreground)]">Notas del mock</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-[color:var(--foreground)]">A · Convergencia</strong> (~3,2 s): entrada lateral,
            fusión orbital, logo trefolio, crossfade al dashboard.
          </li>
          <li>
            <strong className="text-[color:var(--foreground)]">B · Briefing</strong> (~4,0 s): burbujas tipo Agent
            Office, puente esmeralda/ámbar, logo y chips de agentes.
          </li>
          <li>
            Producción usa el experimento <span className="font-mono text-xs">agent_intro</span> (control / convergencia
            / briefing) — lanza desde <span className="font-mono text-xs">/admin/experiments</span>.
          </li>
        </ul>
      </section>
    </main>
  );
}
