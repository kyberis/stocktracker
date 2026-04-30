"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

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
 * Card on the profile page that lets the user connect or disconnect their
 * Telegram account from Warren. Renders nothing if the platform feature flag
 * is off, so we don't advertise an unconfigured integration.
 */
export default function TelegramConnectCard() {
  const { t } = useI18n();
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [link, setLink] = useState<GeneratedLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/telegram/link", { method: "GET" });
      if (!res.ok) {
        setStatus({
          enabled: false,
          botUsername: null,
          linked: false,
          linkedAt: null,
          chatIdMasked: null,
          languageCode: null,
        });
        return;
      }
      setStatus((await res.json()) as LinkStatus);
    } catch {
      // ignore — leave the previous status if any
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onGenerate = useCallback(async () => {
    setBusy(true);
    setError(null);
    setLink(null);
    try {
      const res = await fetch("/api/integrations/telegram/link", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Failed to generate link");
      } else {
        setLink(json as GeneratedLink);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }, []);

  const onUnlink = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/telegram/link", { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(typeof json?.error === "string" ? json.error : "Failed to unlink");
      } else {
        setLink(null);
        await refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  if (!status) return null;
  if (!status.enabled) return null;

  const title = t("warrenName") || "Warren";

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center">
            <TelegramGlyph />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title} on Telegram
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Chat with Warren from anywhere — full read/write portfolio access with confirmation.
            </p>
          </div>
        </div>
      </div>

      {status.linked ? (
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-slate-700/50">
          <div className="text-sm">
            <p className="font-medium text-emerald-600 dark:text-emerald-400">Connected</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Linked {status.linkedAt ? new Date(status.linkedAt).toLocaleDateString() : ""} ·{" "}
              chat {status.chatIdMasked || "•••"}
            </p>
          </div>
          <button
            onClick={onUnlink}
            disabled={busy}
            className="btn-secondary text-xs disabled:opacity-40"
          >
            {busy ? t("loading") : "Disconnect"}
          </button>
        </div>
      ) : (
        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-700/50">
          {!link ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Generate a one-time link to bind your trefolio account to{" "}
                <strong>@{status.botUsername || "the Warren bot"}</strong>. The link expires in 15 minutes.
              </p>
              <button onClick={onGenerate} disabled={busy} className="btn-primary text-xs">
                {busy ? t("loading") : "Connect Telegram"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Open this link from a device that has Telegram installed:
              </p>
              <a
                href={link.deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs inline-flex"
              >
                Open in Telegram
              </a>
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 break-all">
                <code className="text-xs text-gray-700 dark:text-slate-300">{link.deepLink}</code>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Or open Telegram and send <code>/start {link.token}</code> to{" "}
                <strong>@{link.botUsername}</strong>.
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Token expires {new Date(link.expiresAt).toLocaleString()}.
              </p>
              <button
                onClick={async () => {
                  setLink(null);
                  await refresh();
                }}
                className="btn-secondary text-xs"
              >
                I&apos;ve linked it
              </button>
            </div>
          )}
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
