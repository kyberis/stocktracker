"use client";

import { useState } from "react";

/**
 * Shown only on Vercel Preview when PREVIEW_LOGIN_* env vars are set.
 * Does not embed the secret; the operator pastes it once.
 */
export function PreviewLoginHint() {
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);

  function go() {
    const s = secret.trim();
    if (!s || busy) return;
    setBusy(true);
    const url = `/api/auth/preview-login?secret=${encodeURIComponent(s)}&redirect=${encodeURIComponent("/")}`;
    window.location.href = url;
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(420px,92vw)] -translate-x-1/2 rounded-xl border border-amber-500/40 bg-amber-50/95 p-3 shadow-lg dark:bg-amber-950/90">
      <p className="mb-2 text-xs font-medium text-amber-900 dark:text-amber-100">
        Vercel Preview — sign in as the predefined preview user
      </p>
      <div className="flex gap-2">
        <input
          type="password"
          autoComplete="off"
          placeholder="PREVIEW_LOGIN_SECRET"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
          }}
          className="min-w-0 flex-1 rounded-md border border-amber-600/30 bg-white px-2 py-1.5 text-sm dark:bg-slate-900"
        />
        <button
          type="button"
          onClick={go}
          disabled={busy || !secret.trim()}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Enter
        </button>
      </div>
    </div>
  );
}
