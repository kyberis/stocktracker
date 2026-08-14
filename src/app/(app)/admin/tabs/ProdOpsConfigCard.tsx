"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import type { ProdOpsConfig, ProdOpsEventType } from "@/lib/types";
import { normalizeProdOpsBotUsername } from "@/lib/prodops-link";

type ProdOpsBatchData = {
  config: ProdOpsConfig;
  hasSharedSecret: boolean;
  maskedSharedSecret: string;
  secretSource: "env" | "database" | "none";
};

const EVENT_TYPES: ProdOpsEventType[] = [
  "user_registered",
  "membership_paid",
  "feedback_received",
  "broker_request_created",
  "trial_activated",
  "portfolio_anomaly",
  "screening_provider_quota",
];

const DEFAULT_CONFIG: ProdOpsConfig = {
  enabled: false,
  baseUrl: "",
  botUsername: "",
  enabledEventTypes: [...EVENT_TYPES],
  recipient: null,
  pendingLink: null,
};

const EVENT_LABELS: Record<ProdOpsEventType, string> = {
  user_registered: "User registered",
  membership_paid: "Membership paid",
  feedback_received: "Feedback received",
  broker_request_created: "Broker request",
  trial_activated: "Trial activated",
  portfolio_anomaly: "Portfolio anomaly",
  screening_provider_quota: "Screening provider quota",
  ops_digest: "Ops digest",
  test_notification: "Test notification",
};

function sanitizeConfig(config: ProdOpsConfig): ProdOpsConfig {
  return {
    enabled: config.enabled,
    baseUrl: config.baseUrl.trim(),
    botUsername: normalizeProdOpsBotUsername(config.botUsername),
    enabledEventTypes: [...config.enabledEventTypes],
    recipient: config.recipient
      ? {
          ...config.recipient,
          label: config.recipient.label.trim(),
          chatId: config.recipient.chatId.trim(),
          telegramUsername: config.recipient.telegramUsername?.trim().replace(/^@+/, "") || undefined,
          telegramDisplayName: config.recipient.telegramDisplayName?.trim() || undefined,
        }
      : null,
    pendingLink: config.pendingLink,
  };
}

function isPendingLinkActive(config: ProdOpsConfig): boolean {
  const expiresAt = config.pendingLink?.tokenExpiresAt;
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

function formatDateTime(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export default function ProdOpsConfigCard({
  initialData,
}: {
  initialData?: ProdOpsBatchData;
}) {
  const [config, setConfig] = useState<ProdOpsConfig>(initialData?.config || DEFAULT_CONFIG);
  const [secretDraft, setSecretDraft] = useState("");
  const [hasSharedSecret, setHasSharedSecret] = useState(initialData?.hasSharedSecret || false);
  const [maskedSharedSecret, setMaskedSharedSecret] = useState(initialData?.maskedSharedSecret || "");
  const [secretSource, setSecretSource] = useState<"env" | "database" | "none">(
    initialData?.secretSource || "none",
  );
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [cachedDeepLink, setCachedDeepLink] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const hydrate = useCallback((data: ProdOpsBatchData) => {
    setConfig(data.config || DEFAULT_CONFIG);
    setHasSharedSecret(Boolean(data.hasSharedSecret));
    setMaskedSharedSecret(data.maskedSharedSecret || "");
    setSecretSource(data.secretSource || "none");
  }, []);

  const fetchConfig = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const response = await fetch("/api/admin/prodops-config", { cache: "no-store" });
        const data = (await response.json()) as ProdOpsBatchData;
        if (!response.ok) {
          throw new Error("Failed to load ProdOps config.");
        }
        hydrate(data);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to load ProdOps config.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [hydrate],
  );

  useEffect(() => {
    if (!initialData) return;
    hydrate(initialData);
    setLoading(false);
  }, [hydrate, initialData]);

  useEffect(() => {
    if (initialData) return;
    fetchConfig();
  }, [fetchConfig, initialData]);

  useEffect(() => {
    if (!isPendingLinkActive(config)) return;
    const intervalId = window.setInterval(() => {
      fetchConfig(true);
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [config, fetchConfig]);

  const recipientState = useMemo(() => {
    if (config.recipient?.source === "telegram_link") return "linked";
    if (config.recipient?.source === "legacy_manual" && config.recipient.chatId) return "legacy";
    if (isPendingLinkActive(config)) return "pending";
    if (config.pendingLink) return "expired";
    return "unlinked";
  }, [config]);

  const canRunTest = useMemo(() => {
    return (
      config.enabled &&
      config.baseUrl.trim().length > 0 &&
      hasSharedSecret &&
      Boolean(config.recipient?.chatId) &&
      config.recipient?.enabled !== false
    );
  }, [config, hasSharedSecret]);

  const canStartLink = useMemo(() => {
    return config.botUsername.trim().length > 0 && hasSharedSecret;
  }, [config.botUsername, hasSharedSecret]);

  function toggleEventType(eventType: ProdOpsEventType) {
    setConfig((current) => {
      const exists = current.enabledEventTypes.includes(eventType);
      return {
        ...current,
        enabledEventTypes: exists
          ? current.enabledEventTypes.filter((item) => item !== eventType)
          : [...current.enabledEventTypes, eventType],
      };
    });
  }

  function toggleRecipientEventType(eventType: ProdOpsEventType) {
    setConfig((current) => {
      if (!current.recipient) return current;
      const exists = current.recipient.enabledEventTypes.includes(eventType);
      return {
        ...current,
        recipient: {
          ...current.recipient,
          enabledEventTypes: exists
            ? current.recipient.enabledEventTypes.filter((item) => item !== eventType)
            : [...current.recipient.enabledEventTypes, eventType],
        },
      };
    });
  }

  async function saveConfig() {
    setSaving(true);
    setStatus("");
    setError("");
    try {
      const response = await fetch("/api/admin/prodops-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sanitizeConfig(config),
          sharedSecret: secretDraft.trim() ? secretDraft.trim() : undefined,
        }),
      });
      const data = (await response.json()) as ProdOpsBatchData & { error?: string };
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to save ProdOps config.");
      }
      hydrate(data);
      setSecretDraft("");
      setStatus("ProdOps settings saved.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save ProdOps config.");
    } finally {
      setSaving(false);
    }
  }

  async function startLinkFlow() {
    setLinking(true);
    setStatus("");
    setError("");
    try {
      const response = await fetch("/api/admin/prodops-config/link", {
        method: "POST",
      });
      const data = (await response.json()) as {
        ok?: boolean;
        deepLink?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!response.ok || !data.deepLink) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to create Telegram link.");
      }
      setCachedDeepLink(data.deepLink);
      await fetchConfig(true);
      setStatus(
        `Open Telegram and press Start from the account that should receive ops alerts before ${formatDateTime(
          data.expiresAt,
        )}.`,
      );
      if (typeof window !== "undefined") {
        window.open(data.deepLink, "_blank", "noopener,noreferrer");
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to create Telegram link.");
    } finally {
      setLinking(false);
    }
  }

  async function unlinkRecipient() {
    setUnlinking(true);
    setStatus("");
    setError("");
    try {
      const response = await fetch("/api/admin/prodops-config/link", {
        method: "DELETE",
      });
      const data = (await response.json()) as ProdOpsBatchData & { error?: string };
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to unlink Telegram recipient.");
      }
      hydrate(data);
      setCachedDeepLink("");
      setStatus("ProdOps Telegram recipient unlinked.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to unlink Telegram recipient.");
    } finally {
      setUnlinking(false);
    }
  }

  async function sendTestNotification() {
    setTesting(true);
    setStatus("");
    setError("");
    try {
      const response = await fetch("/api/admin/prodops-config/test", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to queue test notification.");
      }
      setStatus("Test notification queued. The next ProdOps cron run will dispatch it.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to queue test notification.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">ProdOps Telegram</h3>
          <p className="mt-1 max-w-2xl text-xs text-gray-500 dark:text-slate-400">
            Single staff ops bot (<code className="rounded bg-gray-100 px-1 py-0.5 dark:bg-slate-800">@trefoliobot</code>
            ). Product events, IdP signups/billing, and the daily digest all go through{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 dark:bg-slate-800">trefolio-prodops</code>.
            Generate the Telegram link here or from{" "}
            <a
              href="https://user.trefolio.com/agents"
              className="text-emerald-700 underline dark:text-emerald-400"
            >
              user.trefolio.com/agents
            </a>
            — both mint the same recipient.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-300">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              config.enabled ? "bg-emerald-500" : "bg-gray-400 dark:bg-slate-500"
            }`}
            aria-hidden="true"
          />
          {config.enabled ? "Enabled" : "Disabled"}
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">Loading ProdOps config…</p>
      ) : (
        <div className="mt-5 space-y-6">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              checked={config.enabled}
              onChange={(event) =>
                setConfig((current) => ({ ...current, enabled: event.target.checked }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">
                Enable operational notifications
              </span>
              <span className="block text-xs text-gray-500 dark:text-slate-400">
                Business routes keep writing to the outbox even when disabled, but dispatch only
                runs while this switch is on.
              </span>
            </span>
          </label>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="prodops-base-url"
                className="block text-sm font-medium text-gray-900 dark:text-white"
              >
                ProdOps base URL
              </label>
              <input
                id="prodops-base-url"
                type="url"
                value={config.baseUrl}
                onChange={(event) =>
                  setConfig((current) => ({ ...current, baseUrl: event.target.value }))
                }
                placeholder="https://ops.trefolio.com"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Local dev example: <code>http://localhost:3400</code>
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="prodops-bot-username"
                className="block text-sm font-medium text-gray-900 dark:text-white"
              >
                Telegram bot username
              </label>
              <input
                id="prodops-bot-username"
                type="text"
                value={config.botUsername}
                onChange={(event) =>
                  setConfig((current) => ({ ...current, botUsername: event.target.value }))
                }
                placeholder="trefoliobot"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Used to generate the Telegram deep link opened from admin.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="prodops-shared-secret"
                className="text-sm font-medium text-gray-900 dark:text-white"
              >
                Shared secret
              </label>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Used to sign dispatcher requests and the link-completion callback from the external
                bot service.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                id="prodops-shared-secret"
                type="password"
                value={secretDraft}
                onChange={(event) => setSecretDraft(event.target.value)}
                placeholder={hasSharedSecret ? "Enter a new secret to rotate it" : "Enter shared secret"}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <div className="min-w-0 text-xs text-gray-500 dark:text-slate-400">
                {hasSharedSecret ? (
                  <>
                    <span className="font-medium text-gray-700 dark:text-slate-200">
                      {maskedSharedSecret || "Configured"}
                    </span>{" "}
                    via {secretSource === "env" ? "environment" : "database"}.
                  </>
                ) : (
                  "No shared secret configured yet."
                )}
              </div>
            </div>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-gray-900 dark:text-white">
              Enabled event types
            </legend>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {EVENT_TYPES.map((eventType) => (
                <label
                  key={eventType}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    checked={config.enabledEventTypes.includes(eventType)}
                    onChange={() => toggleEventType(eventType)}
                  />
                  <span className="text-gray-700 dark:text-slate-200">{EVENT_LABELS[eventType]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Recipient DM</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Link the Telegram account that should receive staff alerts by opening the bot and
                  pressing Start, like the Clara and Will account-link flows.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                {recipientState === "linked"
                  ? "Linked"
                  : recipientState === "pending"
                    ? "Pending"
                    : recipientState === "expired"
                      ? "Expired"
                      : recipientState === "legacy"
                        ? "Legacy manual"
                        : "Unlinked"}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700">
              <div className="space-y-4">
                {recipientState === "linked" && config.recipient ? (
                  <div className="space-y-2 text-sm text-gray-700 dark:text-slate-200">
                    <p className="font-medium">{config.recipient.label}</p>
                    <p>
                      {config.recipient.telegramUsername ? (
                        <>
                          Telegram username: <code>@{config.recipient.telegramUsername}</code>
                        </>
                      ) : (
                        <>
                          Telegram user id: <code>{config.recipient.telegramUserId || "unknown"}</code>
                        </>
                      )}
                    </p>
                    {config.recipient.telegramDisplayName ? (
                      <p>
                        Display name: <code>{config.recipient.telegramDisplayName}</code>
                      </p>
                    ) : null}
                    <p>
                      Chat id: <code>{config.recipient.chatId}</code>
                    </p>
                    <p>
                      Linked at: <code>{formatDateTime(config.recipient.linkedAt)}</code>
                    </p>
                  </div>
                ) : null}

                {recipientState === "legacy" && config.recipient ? (
                  <div className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-medium">Legacy manual destination detected.</p>
                    <p>
                      Current chat id: <code>{config.recipient.chatId}</code>
                    </p>
                    <p>
                      Relink it through Telegram to verify the DM recipient and stop depending on a
                      pasted chat id.
                    </p>
                  </div>
                ) : null}

                {recipientState === "pending" ? (
                  <div className="space-y-2 text-sm text-gray-700 dark:text-slate-200">
                    <p className="font-medium">Waiting for Telegram confirmation.</p>
                    <p>
                      Open the bot from the account that should receive ops alerts and press Start
                      before <code>{formatDateTime(config.pendingLink?.tokenExpiresAt)}</code>.
                    </p>
                  </div>
                ) : null}

                {recipientState === "expired" ? (
                  <div className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-medium">The last Telegram link expired.</p>
                    <p>Generate a new link and press Start again from the recipient account.</p>
                  </div>
                ) : null}

                {recipientState === "unlinked" ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    No Telegram recipient is linked yet.
                  </p>
                ) : null}

                {cachedDeepLink ? (
                  <div className="space-y-2">
                    <label
                      htmlFor="prodops-telegram-link"
                      className="block text-xs font-medium text-gray-700 dark:text-slate-300"
                    >
                      Telegram recipient link
                    </label>
                    <input
                      id="prodops-telegram-link"
                      readOnly
                      value={cachedDeepLink}
                      onFocus={(event) => event.currentTarget.select()}
                      aria-describedby="prodops-telegram-link-help"
                      className="w-full rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2 font-mono text-xs text-[color:var(--foreground)]"
                    />
                    <p
                      id="prodops-telegram-link-help"
                      className="text-xs text-gray-500 dark:text-slate-400"
                    >
                      Copy the full URL into Telegram. Do not reuse an older t.me link from chat
                      history.
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={startLinkFlow}
                    disabled={linking || !canStartLink}
                    className="btn-secondary px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {linking
                      ? "Preparing…"
                      : recipientState === "linked"
                        ? "Relink recipient"
                        : recipientState === "pending"
                          ? "Generate new link"
                          : "Link Telegram recipient"}
                  </button>
                  {config.recipient ? (
                    <button
                      type="button"
                      onClick={unlinkRecipient}
                      disabled={unlinking}
                      className="btn-secondary px-4 py-2 text-sm text-red-600 disabled:opacity-60 dark:text-red-300"
                    >
                      {unlinking ? "Unlinking…" : "Unlink recipient"}
                    </button>
                  ) : null}
                </div>

                {!canStartLink ? (
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Set both the Telegram bot username and the shared secret before starting the
                    link flow.
                  </p>
                ) : null}

                {config.recipient ? (
                  <>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        checked={config.recipient.enabled}
                        onChange={(event) =>
                          setConfig((current) => ({
                            ...current,
                            recipient: current.recipient
                              ? { ...current.recipient, enabled: event.target.checked }
                              : null,
                          }))
                        }
                      />
                      Recipient enabled
                    </label>

                    <fieldset className="space-y-2">
                      <legend className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        Recipient event filter
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {EVENT_TYPES.map((eventType) => (
                          <label
                            key={`recipient-${eventType}`}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              checked={config.recipient?.enabledEventTypes.includes(eventType) ?? false}
                              onChange={() => toggleRecipientEventType(eventType)}
                            />
                            <span className="text-gray-700 dark:text-slate-200">
                              {EVENT_LABELS[eventType]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </>
                ) : null}
              </div>
            </div>
          </section>

          {(status || error) && (
            <div
              aria-live="polite"
              className={`rounded-lg px-4 py-3 text-sm ${
                error
                  ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              }`}
            >
              {error || status}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={saveConfig}
              disabled={saving}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save ProdOps settings"}
            </button>
            <button
              type="button"
              onClick={sendTestNotification}
              disabled={testing || !canRunTest}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-60"
            >
              {testing ? "Queueing…" : "Send test notification"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
