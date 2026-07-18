"use client";

import { useState } from "react";

/**
 * Primary preview sign-in UI (Vercel Preview with PREVIEW_LOGIN_* configured).
 */
export function PreviewLoginHint({ asPrimary = false }: { asPrimary?: boolean }) {
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function go() {
    const s = secret.trim();
    if (!s || busy) return;
    setBusy(true);
    setError(null);
    const url = `/api/auth/preview-login?secret=${encodeURIComponent(s)}&redirect=${encodeURIComponent("/")}`;
    window.location.href = url;
  }

  const form = (
    <>
      <p className={asPrimary ? "mb-4 text-sm text-slate-600 dark:text-slate-300 text-center" : "mb-2 text-xs font-medium text-amber-900 dark:text-amber-100"}>
        {asPrimary
          ? "This Vercel Preview is not connected to the account IdP. Paste PREVIEW_LOGIN_SECRET to continue as the preview user."
          : "Vercel Preview — sign in as the predefined preview user"}
      </p>
      <div className="flex gap-2">
        <input
          type="password"
          autoComplete="off"
          autoFocus={asPrimary}
          placeholder="PREVIEW_LOGIN_SECRET"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
          }}
          className="min-w-0 flex-1 rounded-md border border-amber-600/30 bg-white px-2 py-1.5 text-sm dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={go}
          disabled={busy || !secret.trim()}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : "Enter"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </>
  );

  if (asPrimary) {
    return (
      <main className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-white dark:bg-slate-900 p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 text-center">
            Preview sign-in
          </h1>
          <div className="mt-4">{form}</div>
        </div>
      </main>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(420px,92vw)] -translate-x-1/2 rounded-xl border border-amber-500/40 bg-amber-50/95 p-3 shadow-lg dark:bg-amber-950/90">
      {form}
    </div>
  );
}
