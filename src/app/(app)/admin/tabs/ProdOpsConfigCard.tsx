"use client";

import React, { useEffect, useMemo, useState } from "react";

import type {
  ProdOpsConfig,
  ProdOpsDestination,
  ProdOpsEventType,
} from "@/lib/types";

type ProdOpsBatchData = {
  config: ProdOpsConfig;
  hasSharedSecret: boolean;
  maskedSharedSecret: string;
  secretSource: "env" | "database" | "none";
};

const DEFAULT_CONFIG: ProdOpsConfig = {
  enabled: false,
  baseUrl: "",
  enabledEventTypes: [
    "user_registered",
    "membership_paid",
    "feedback_received",
    "broker_request_created",
    "trial_activated",
  ],
  destinations: [],
};

const EVENT_LABELS: Record<ProdOpsEventType, string> = {
  user_registered: "User registered",
  membership_paid: "Membership paid",
  feedback_received: "Feedback received",
  broker_request_created: "Broker request",
  trial_activated: "Trial activated",
  test_notification: "Test notification",
};

function createDestination(): ProdOpsDestination {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dest-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: "",
    chatId: "",
    enabled: true,
    enabledEventTypes: [...DEFAULT_CONFIG.enabledEventTypes],
  };
}

function sanitizeConfig(config: ProdOpsConfig): ProdOpsConfig {
  return {
    enabled: config.enabled,
    baseUrl: config.baseUrl.trim(),
    enabledEventTypes: [...config.enabledEventTypes],
    destinations: config.destinations.map((destination) => ({
      ...destination,
      label: destination.label.trim(),
      chatId: destination.chatId.trim(),
    })),
  };
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
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialData) return;
    setConfig(initialData.config || DEFAULT_CONFIG);
    setHasSharedSecret(Boolean(initialData.hasSharedSecret));
    setMaskedSharedSecret(initialData.maskedSharedSecret || "");
    setSecretSource(initialData.secretSource || "none");
    setLoading(false);
  }, [initialData]);

  useEffect(() => {
    if (initialData) return;
    fetch("/api/admin/prodops-config", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: ProdOpsBatchData) => {
        setConfig(data.config || DEFAULT_CONFIG);
        setHasSharedSecret(Boolean(data.hasSharedSecret));
        setMaskedSharedSecret(data.maskedSharedSecret || "");
        setSecretSource(data.secretSource || "none");
      })
      .catch(() => setError("Failed to load ProdOps config."))
      .finally(() => setLoading(false));
  }, [initialData]);

  const canRunTest = useMemo(() => {
    return config.enabled && config.baseUrl.trim().length > 0 && hasSharedSecret && config.destinations.length > 0;
  }, [config, hasSharedSecret]);

  function updateDestination(
    id: string,
    updater: (destination: ProdOpsDestination) => ProdOpsDestination,
  ) {
    setConfig((current) => ({
      ...current,
      destinations: current.destinations.map((destination) =>
        destination.id === id ? updater(destination) : destination,
      ),
    }));
  }

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

  function toggleDestinationEventType(id: string, eventType: ProdOpsEventType) {
    updateDestination(id, (destination) => {
      const exists = destination.enabledEventTypes.includes(eventType);
      return {
        ...destination,
        enabledEventTypes: exists
          ? destination.enabledEventTypes.filter((item) => item !== eventType)
          : [...destination.enabledEventTypes, eventType],
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
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to save ProdOps config.");
      }
      setConfig(data.config || DEFAULT_CONFIG);
      setHasSharedSecret(Boolean(data.hasSharedSecret));
      setMaskedSharedSecret(data.maskedSharedSecret || "");
      setSecretSource(data.secretSource || "none");
      setSecretDraft("");
      setStatus("ProdOps settings saved.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save ProdOps config.");
    } finally {
      setSaving(false);
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
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-2xl">
            Queue product-side ops events in trefolio and dispatch them asynchronously to the
            external <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-800">trefolio-prodops</code> service.
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
                Business routes will keep writing to the outbox even when disabled, but the
                dispatcher will only deliver while this switch is on.
              </span>
            </span>
          </label>

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

          <div className="space-y-3">
            <div>
              <label
                htmlFor="prodops-shared-secret"
                className="text-sm font-medium text-gray-900 dark:text-white"
              >
                Shared secret
              </label>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Used to sign each dispatcher request to the external service.
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
              {(
                [
                  "user_registered",
                  "membership_paid",
                  "feedback_received",
                  "broker_request_created",
                  "trial_activated",
                ] as ProdOpsEventType[]
              ).map((eventType) => (
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
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Destinations</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Configure one or more Telegram chats or topics that will receive staff alerts.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((current) => ({
                    ...current,
                    destinations: [...current.destinations, createDestination()],
                  }))
                }
                className="btn-secondary text-xs px-4 py-2"
              >
                Add destination
              </button>
            </div>

            <div className="space-y-4">
              {config.destinations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
                  No Telegram destinations configured yet.
                </div>
              ) : (
                config.destinations.map((destination) => (
                  <div
                    key={destination.id}
                    className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-4 lg:flex-row">
                        <div className="flex-1 space-y-2">
                          <label
                            htmlFor={`prodops-label-${destination.id}`}
                            className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400"
                          >
                            Label
                          </label>
                          <input
                            id={`prodops-label-${destination.id}`}
                            type="text"
                            value={destination.label}
                            onChange={(event) =>
                              updateDestination(destination.id, (current) => ({
                                ...current,
                                label: event.target.value,
                              }))
                            }
                            placeholder="Support team"
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <label
                            htmlFor={`prodops-chat-${destination.id}`}
                            className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400"
                          >
                            Chat ID
                          </label>
                          <input
                            id={`prodops-chat-${destination.id}`}
                            type="text"
                            value={destination.chatId}
                            onChange={(event) =>
                              updateDestination(destination.id, (current) => ({
                                ...current,
                                chatId: event.target.value,
                              }))
                            }
                            placeholder="-1001234567890"
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        <div className="space-y-2 lg:w-40">
                          <label
                            htmlFor={`prodops-thread-${destination.id}`}
                            className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400"
                          >
                            Topic ID
                          </label>
                          <input
                            id={`prodops-thread-${destination.id}`}
                            type="number"
                            min={1}
                            value={destination.messageThreadId ?? ""}
                            onChange={(event) =>
                              updateDestination(destination.id, (current) => ({
                                ...current,
                                messageThreadId: event.target.value
                                  ? Number.parseInt(event.target.value, 10)
                                  : undefined,
                              }))
                            }
                            placeholder="optional"
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            checked={destination.enabled}
                            onChange={(event) =>
                              updateDestination(destination.id, (current) => ({
                                ...current,
                                enabled: event.target.checked,
                              }))
                            }
                          />
                          Destination enabled
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setConfig((current) => ({
                              ...current,
                              destinations: current.destinations.filter((item) => item.id !== destination.id),
                            }))
                          }
                          className="text-sm font-medium text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>

                      <fieldset className="space-y-2">
                        <legend className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                          Destination event filter
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {(
                            [
                              "user_registered",
                              "membership_paid",
                              "feedback_received",
                              "broker_request_created",
                              "trial_activated",
                            ] as ProdOpsEventType[]
                          ).map((eventType) => (
                            <label
                              key={`${destination.id}-${eventType}`}
                              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                checked={destination.enabledEventTypes.includes(eventType)}
                                onChange={() => toggleDestinationEventType(destination.id, eventType)}
                              />
                              <span className="text-gray-700 dark:text-slate-200">
                                {EVENT_LABELS[eventType]}
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  </div>
                ))
              )}
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
