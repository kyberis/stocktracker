"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import type { NotificationChannel } from "@/lib/types";
import TierFeatureBadge from "./TierFeatureBadge";

interface TelegramQuotaInfo {
  remainingToday: number;
  remainingMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
}

interface NotificationPrefs {
  alertChannels: NotificationChannel[];
  telegramChatId: string;
  telegramLinked: boolean;
  alertDeviceEnabled: boolean;
  emailNotificationsEnabled: boolean;
  telegramQuota?: TelegramQuotaInfo;
}

export default function NotificationChannels() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { telegramEnabled } = useSettings();
  const plan = user?.plan || "free";
  const isPaid = plan === "pro";
  const isPro = plan === "pro";
  const hasDevice = !!user?.devicePortfolioId || !!user?.deviceProEligible;

  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkPending, setLinkPending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/preferences");
      if (res.ok) {
        const data = await res.json();
        setPrefs({
          alertChannels: data.alertChannels,
          telegramChatId: data.telegramChatId || "",
          telegramLinked: !!data.telegramLinked,
          alertDeviceEnabled: data.alertDeviceEnabled,
          emailNotificationsEnabled: data.emailNotificationsEnabled,
          telegramQuota: data.telegramQuota,
        });
        if (data.telegramLinked && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setLinkPending(false);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrefs();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchPrefs]);

  const [pushSupported] = useState(() => typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  const toggleChannel = async (channel: NotificationChannel, enabled: boolean) => {
    if (!prefs) return;
    const current = new Set(prefs.alertChannels);
    if (enabled) current.add(channel);
    else current.delete(channel);
    const newChannels = [...current].join(",");

    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertChannels: newChannels }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrefs({
          alertChannels: data.alertChannels,
          telegramChatId: data.telegramChatId || "",
          telegramLinked: !!data.telegramLinked,
          alertDeviceEnabled: data.alertDeviceEnabled,
          emailNotificationsEnabled: data.emailNotificationsEnabled,
          telegramQuota: prefs.telegramQuota,
        });
        void fetchPrefs();
      }
    } catch { /* ignore */ }
  };

  const startTelegramLink = async () => {
    setLinking(true);
    setLinkError("");
    try {
      const res = await fetch("/api/notifications/telegram/link", { method: "POST" });
      if (!res.ok) {
        setLinkError(t("telegramLinkError"));
        setLinking(false);
        return;
      }
      const data = await res.json();
      if (data.deepLink && typeof window !== "undefined") {
        window.open(data.deepLink, "_blank", "noopener,noreferrer");
        setLinkPending(true);
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => { void fetchPrefs(); }, 2500);
        setTimeout(() => {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setLinkPending(false);
        }, 120_000);
      }
    } catch {
      setLinkError(t("telegramLinkError"));
    }
    setLinking(false);
  };

  const disconnectTelegram = async () => {
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramDisconnect: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrefs({
          alertChannels: data.alertChannels,
          telegramChatId: data.telegramChatId || "",
          telegramLinked: !!data.telegramLinked,
          alertDeviceEnabled: data.alertDeviceEnabled,
          emailNotificationsEnabled: data.emailNotificationsEnabled,
          telegramQuota: prefs?.telegramQuota,
        });
      }
    } catch { /* ignore */ }
  };

  const handleEnablePush = async () => {
    if (!pushSupported) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const vapidRes = await fetch("/api/notifications/push/vapid-key");
      if (!vapidRes.ok) return;
      const { publicKey } = await vapidRes.json();

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!)));
      const auth = btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!)));

      await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh, auth },
        }),
      });
      setPushSubscribed(true);
      if (!prefs?.alertChannels.includes("push")) {
        toggleChannel("push", true);
      }
    } catch (err) {
      console.error("Failed to enable push:", err);
    }
  };

  const handleDisablePush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/notifications/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushSubscribed(false);
      toggleChannel("push", false);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!pushSupported) return;
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setPushSubscribed(!!sub))
    );
  }, [pushSupported]);

  if (loading) return null;

  const channels = prefs?.alertChannels || [];

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("notificationChannels")}</h2>

      <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t("emailNotificationsLabel")}</p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500">{t("emailNotificationsDesc")}</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={prefs?.emailNotificationsEnabled ?? true}
            onChange={async (e) => {
              const enabled = e.target.checked;
              try {
                const res = await fetch("/api/notifications/preferences", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ emailNotificationsEnabled: enabled }),
                });
                if (res.ok) {
                  const data = await res.json();
                  setPrefs((p) => p ? { ...p, emailNotificationsEnabled: data.emailNotificationsEnabled } : p);
                }
              } catch { /* ignore */ }
            }}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
        </label>
      </div>

      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">{t("channelEmail")} <TierFeatureBadge requiredPlan="pro" size="xs" /></p>
            {!isPaid && <p className="text-[10px] text-amber-500">{t("channelRequiresStarter")}</p>}
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={channels.includes("email")} onChange={(e) => toggleChannel("email", e.target.checked)} disabled={!isPaid} className="sr-only peer" />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-disabled:opacity-40" />
        </label>
      </div>

      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">{t("channelPush")} <TierFeatureBadge requiredPlan="pro" size="xs" /></p>
            {!isPaid && <p className="text-[10px] text-amber-500">{t("channelRequiresStarter")}</p>}
          </div>
        </div>
        {isPaid && pushSupported && (
          pushSubscribed ? (
            <button type="button" onClick={handleDisablePush} className="text-xs text-red-500 hover:text-red-700">{t("pushDisable")}</button>
          ) : (
            <button type="button" onClick={handleEnablePush} className="btn-primary text-xs">{t("pushEnable")}</button>
          )
        )}
        {!pushSupported && isPaid && (
          <span className="text-xs text-gray-400">Not supported</span>
        )}
      </div>

      {telegramEnabled && (
        <div className="py-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-sky-600 dark:text-sky-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">{t("channelTelegram")} <TierFeatureBadge requiredPlan="pro" size="xs" /></p>
                {!isPro && <p className="text-[10px] text-amber-500">{t("channelRequiresPro")}</p>}
              </div>
            </div>
            {isPro && prefs?.telegramLinked && (
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={channels.includes("telegram")} onChange={(e) => toggleChannel("telegram", e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            )}
          </div>
          {isPro && !prefs?.telegramLinked && (
            <div className="ml-11 space-y-2">
              <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("telegramConnectHint")}</p>
              <button type="button" onClick={() => void startTelegramLink()} disabled={linking} className="btn-primary text-xs disabled:opacity-40">
                {linking ? t("loading") : t("telegramOpenBot")}
              </button>
              {linkPending && <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{t("telegramLinkPending")}</p>}
              {linkError && <p className="text-[10px] text-red-500">{linkError}</p>}
            </div>
          )}
          {isPro && prefs?.telegramLinked && (
            <>
              <div className="ml-11 flex flex-wrap items-center gap-2">
                <p className="text-[10px] text-emerald-500">{t("telegramLinked")}</p>
                <button type="button" onClick={() => void disconnectTelegram()} className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
                  {t("telegramDisconnect")}
                </button>
              </div>
              {prefs.telegramQuota && (
                <p className="ml-11 text-[10px] text-gray-400 dark:text-gray-500">
                  {prefs.telegramQuota.remainingToday}/{prefs.telegramQuota.dailyLimit} {t("tgQuotaToday")}
                  {" · "}
                  {prefs.telegramQuota.remainingMonth}/{prefs.telegramQuota.monthlyLimit} {t("tgQuotaMonth")}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {hasDevice && (
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-500/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">{t("channelDevice")} <TierFeatureBadge requiredPlan="pro" size="xs" /></p>
              {!isPro && <p className="text-[10px] text-amber-500">{t("channelRequiresPro")}</p>}
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={channels.includes("device")} onChange={(e) => toggleChannel("device", e.target.checked)} disabled={!isPro} className="sr-only peer" />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-disabled:opacity-40" />
          </label>
        </div>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
