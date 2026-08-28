"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n, type TranslationKey } from "@/lib/i18n";

interface LinkStatus {
  enabled: boolean;
  botUsername: string | null;
  linked: boolean;
  linkedAt: string | null;
  chatIdMasked: string | null;
  languageCode: string | null;
}

interface GeneratedLink {
  token: string;
  deepLink: string;
  botUsername: string;
  expiresAt: string;
}

/**
 * Card on the profile page that lets the user connect, relink, or disconnect
 * their Telegram account from Clover. Renders nothing if the platform feature
 * flag is off, so we don't advertise an unconfigured integration.
 */
export default function CloverTelegramConnectCard() {
  const { t } = useI18n();
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [link, setLink] = useState<GeneratedLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkPending, setLinkPending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const relinkBaselineRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setLinkPending(false);
  }, []);

  const refresh = useCallback(async (): Promise<LinkStatus | null> => {
    try {
      const res = await fetch("/api/integrations/telegram/clover/link", { method: "GET" });
      if (!res.ok) {
        const disabled: LinkStatus = {
          enabled: false,
          botUsername: null,
          linked: false,
          linkedAt: null,
          chatIdMasked: null,
          languageCode: null,
        };
        setStatus(disabled);
        return disabled;
      }
      const next = (await res.json()) as LinkStatus;
      setStatus(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh]);

  const startPolling = useCallback(
    (baselineChatId: string | null) => {
      relinkBaselineRef.current = baselineChatId;
      setLinkPending(true);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        void (async () => {
          const res = await fetch("/api/integrations/telegram/clover/link", { method: "GET" });
          if (!res.ok) return;
          const next = (await res.json()) as LinkStatus;
          setStatus(next);
          const relinked =
            next.linked &&
            (relinkBaselineRef.current === null ||
              next.chatIdMasked !== relinkBaselineRef.current ||
              !relinkBaselineRef.current);
          if (relinked) {
            stopPolling();
            setLink(null);
          }
        })();
      }, 2500);
      setTimeout(() => stopPolling(), 120_000);
    },
    [stopPolling],
  );

  const onGenerate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/telegram/clover/link", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : t("telegramLinkError"));
        return;
      }
      const generated = json as GeneratedLink;
      setLink(generated);
      startPolling(status?.chatIdMasked ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("telegramLinkError"));
    } finally {
      setBusy(false);
    }
  }, [startPolling, status?.chatIdMasked, t]);

  const onUnlink = useCallback(async () => {
    setBusy(true);
    setError(null);
    stopPolling();
    try {
      const res = await fetch("/api/integrations/telegram/clover/link", { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(typeof json?.error === "string" ? json.error : t("telegramLinkError"));
      } else {
        setLink(null);
        await refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("telegramLinkError"));
    } finally {
      setBusy(false);
    }
  }, [refresh, stopPolling, t]);

  const onLinkDone = useCallback(async () => {
    stopPolling();
    setLink(null);
    await refresh();
  }, [refresh, stopPolling]);

  if (!status) return null;
  if (!status.enabled) return null;

  const title = t("cloverTelegramTitle");
  const botHandle = status.botUsername || link?.botUsername || "cloveraiassistant_bot";

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center">
            <TelegramGlyph />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">{t("cloverTelegramSubtitle")}</p>
          </div>
        </div>
      </div>

      {link ? (
        <LinkInstructions
          link={link}
          botHandle={botHandle}
          linkPending={linkPending}
          onDone={() => void onLinkDone()}
          t={t}
        />
      ) : status.linked ? (
        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-700/50">
          <div className="text-sm">
            <p className="font-medium text-emerald-600 dark:text-emerald-400">{t("telegramLinked")}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {t("telegramLinkedDetails")
                .replace("{date}", status.linkedAt ? new Date(status.linkedAt).toLocaleDateString() : "")
                .replace("{chatId}", status.chatIdMasked || "•••")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void onGenerate()}
              disabled={busy}
              className="btn-primary text-xs disabled:opacity-40"
            >
              {busy ? t("loading") : t("telegramRelink")}
            </button>
            <button
              onClick={() => void onUnlink()}
              disabled={busy}
              className="btn-secondary text-xs disabled:opacity-40"
            >
              {busy ? t("loading") : t("telegramDisconnect")}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("telegramRelinkHint")}</p>
        </div>
      ) : (
        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-700/50">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {t("cloverTelegramHint")}
          </p>
          <button onClick={() => void onGenerate()} disabled={busy} className="btn-primary text-xs disabled:opacity-40">
            {busy ? t("loading") : t("telegramConnectClover")}
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function LinkInstructions({
  link,
  botHandle,
  linkPending,
  onDone,
  t,
}: {
  link: GeneratedLink;
  botHandle: string;
  linkPending: boolean;
  onDone: () => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-700/50">
      <p className="text-sm text-gray-600 dark:text-slate-300">{t("telegramOpenLinkHint")}</p>
      <a
        href={link.deepLink}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary text-xs inline-flex"
      >
        {t("telegramOpenInTelegram")}
      </a>
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 break-all">
        <code className="text-xs text-gray-700 dark:text-slate-300">{link.deepLink}</code>
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-400">
        {t("telegramStartCommandHint")
          .replace("{token}", link.token)
          .replace("{bot}", `@${botHandle}`)}
      </p>
      <p className="text-xs text-gray-400 dark:text-slate-500">
        {t("telegramTokenExpires").replace("{date}", new Date(link.expiresAt).toLocaleString())}
      </p>
      {linkPending && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">{t("telegramLinkPending")}</p>
      )}
      <button onClick={onDone} className="btn-secondary text-xs">
        {t("telegramLinkDone")}
      </button>
    </div>
  );
}

function TelegramGlyph() {
  return (
    <svg
      className="w-5 h-5 text-sky-500"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M21.5 4.3L18.4 19c-.2 1-.8 1.3-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.9.4l.3-4.6L17 7.1c.4-.3-.1-.5-.6-.2L7.6 12.3 3.7 11c-.9-.3-.9-.9.2-1.4L20.3 3c.7-.3 1.4.2 1.2 1.3z" />
    </svg>
  );
}
