"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Trash2 } from "lucide-react";

import { useI18n } from "@/lib/i18n";

type TokenRow = {
  id: string;
  prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

export default function ProfileMcpPatManager() {
  const { t } = useI18n();
  const [tokens, setTokens] = useState<TokenRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [name, setName] = useState("Claude / Cursor");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/mcp/personal-access-tokens", { credentials: "include" });
    if (res.status === 403) {
      setError(t("profileMcpRequiresIdp"));
      setTokens([]);
      return;
    }
    if (res.status === 503) {
      setError(t("profileMcpIdpUnavailable"));
      setTokens([]);
      return;
    }
    if (!res.ok) {
      setError(t("profileMcpTokensLoadError"));
      setTokens([]);
      return;
    }
    const data = (await res.json()) as { tokens: TokenRow[] };
    setTokens(data.tokens);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createToken() {
    setBusy(true);
    setError(null);
    setNewToken(null);
    try {
      const res = await fetch("/api/mcp/personal-access-tokens", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { token?: string; error?: string; message?: string };
      if (!res.ok) {
        setError(data.message || data.error || t("profileMcpTokenCreateError"));
        return;
      }
      if (data.token) setNewToken(data.token);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm(t("profileMcpRevokeConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mcp/personal-access-tokens/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        setError(t("profileMcpTokenRevokeError"));
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  const copyNewToken = useCallback(async () => {
    if (!newToken) return;
    try {
      await navigator.clipboard.writeText(newToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [newToken]);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      ) : null}

      {newToken ? (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10 p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{t("profileMcpCopyTokenNow")}</p>
          <p className="text-xs text-gray-600 dark:text-slate-400">{t("profileMcpCopyTokenOnce")}</p>
          <code className="block text-xs bg-slate-950 text-emerald-100 px-3 py-3 rounded-lg font-mono break-all">
            {newToken}
          </code>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copyNewToken()} className="btn-primary text-xs inline-flex items-center gap-1.5">
              {tokenCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {tokenCopied ? t("profileMcpCopied") : t("profileMcpCopyConfig")}
            </button>
            <button type="button" onClick={() => setNewToken(null)} className="btn-secondary text-xs">
              {t("profileMcpDismissToken")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[200px]">
          <span className="block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-slate-400 mb-1.5">
            {t("profileMcpTokenLabel")}
          </span>
          <input
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--foreground)]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            disabled={busy || Boolean(error && tokens?.length === 0 && !newToken)}
          />
        </label>
        <button
          type="button"
          onClick={() => void createToken()}
          disabled={busy || Boolean(error && tokens === null)}
          className="btn-primary text-sm disabled:opacity-40"
        >
          {busy ? t("loading") : t("profileMcpManageTokens")}
        </button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t("profileMcpYourTokens")}</h3>
        {tokens === null ? (
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("loading")}</p>
        ) : tokens.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("profileMcpNoTokens")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[color:var(--border)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-[color:var(--muted)]">
                  <th className="px-3 py-2 font-semibold">{t("profileMcpTokenLabel")}</th>
                  <th className="px-3 py-2 font-semibold">{t("profileMcpTokenPrefix")}</th>
                  <th className="px-3 py-2 font-semibold">{t("profileMcpTokenCreated")}</th>
                  <th className="px-3 py-2 font-semibold">{t("profileMcpTokenStatus")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {tokens.map((row) => (
                  <tr key={row.id} className="border-t border-[color:var(--border)]">
                    <td className="px-3 py-2.5 text-[color:var(--foreground)]">{row.name}</td>
                    <td className="px-3 py-2.5 font-mono text-[color:var(--muted)]">{row.prefix}…</td>
                    <td className="px-3 py-2.5 text-[color:var(--muted)]">{row.created_at.slice(0, 10)}</td>
                    <td className="px-3 py-2.5">
                      {row.revoked_at ? (
                        <span className="text-red-500">{t("profileMcpTokenRevoked")}</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">{t("profileMcpTokenActive")}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {!row.revoked_at ? (
                        <button
                          type="button"
                          onClick={() => void revoke(row.id)}
                          disabled={busy}
                          className="btn-secondary text-xs inline-flex items-center gap-1 disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t("profileMcpRevokeToken")}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
