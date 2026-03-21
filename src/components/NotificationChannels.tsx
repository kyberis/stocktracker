"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import type { NotificationChannel } from "@/lib/types";
import TierFeatureBadge from "./TierFeatureBadge";

interface WhatsAppQuotaInfo {
  remainingToday: number;
  remainingMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
}

interface NotificationPrefs {
  alertChannels: NotificationChannel[];
  whatsappPhone: string;
  whatsappVerified: boolean;
  alertDeviceEnabled: boolean;
  emailNotificationsEnabled: boolean;
  whatsappQuota?: WhatsAppQuotaInfo;
}

export default function NotificationChannels() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { whatsappEnabled } = useSettings();
  const plan = user?.plan || "free";
  const isStarter = plan === "starter" || plan === "pro";
  const isPro = plan === "pro";
  const hasDevice = !!user?.devicePortfolioId || !!user?.deviceProEligible;

  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [verifySent, setVerifySent] = useState(false);
  const [changingNumber, setChangingNumber] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [pushSupported] = useState(() => typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/preferences");
      if (res.ok) {
        const data = await res.json();
        setPrefs(data);
        setPhone(data.whatsappPhone || "");
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

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
        setPrefs(data);
      }
    } catch { /* ignore */ }
  };

  const handleVerifyWhatsApp = async () => {
    if (!phone || phone.length < 10) return;
    setVerifying(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/notifications/whatsapp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (res.ok) {
        setVerifySent(true);
        setConfirmError("");
      } else {
        setVerifyError(t("whatsappSendError"));
      }
    } catch {
      setVerifyError(t("whatsappSendError"));
    }
    setVerifying(false);
  };

  const handleConfirmWhatsApp = async () => {
    if (!verifyCode) return;
    setConfirming(true);
    setConfirmError("");
    try {
      const res = await fetch("/api/notifications/whatsapp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });
      if (res.ok) {
        setVerifySent(false);
        setVerifyCode("");
        setChangingNumber(false);
        setConfirmError("");
        fetchPrefs();
      } else {
        const data = await res.json().catch(() => null);
        if (data?.error?.includes("expired")) {
          setConfirmError(t("whatsappCodeExpired"));
          setVerifySent(false);
        } else {
          setConfirmError(t("whatsappConfirmError"));
        }
      }
    } catch {
      setConfirmError(t("whatsappConfirmError"));
    }
    setConfirming(false);
  };

  const handleEnablePush = async () => {
    if (!pushSupported) return;
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
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

      {/* Master email notifications toggle */}
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
                  setPrefs(data);
                }
              } catch { /* ignore */ }
            }}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
        </label>
      </div>

      {/* Email */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">{t("channelEmail")} <TierFeatureBadge requiredPlan="starter" size="xs" /></p>
            {!isStarter && <p className="text-[10px] text-amber-500">{t("channelRequiresStarter")}</p>}
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={channels.includes("email")} onChange={(e) => toggleChannel("email", e.target.checked)} disabled={!isStarter} className="sr-only peer" />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-disabled:opacity-40" />
        </label>
      </div>

      {/* Push */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">{t("channelPush")} <TierFeatureBadge requiredPlan="starter" size="xs" /></p>
            {!isStarter && <p className="text-[10px] text-amber-500">{t("channelRequiresStarter")}</p>}
          </div>
        </div>
        {isStarter && pushSupported && (
          pushSubscribed ? (
            <button onClick={handleDisablePush} className="text-xs text-red-500 hover:text-red-700">{t("pushDisable")}</button>
          ) : (
            <button onClick={handleEnablePush} className="btn-primary text-xs">{t("pushEnable")}</button>
          )
        )}
        {!pushSupported && isStarter && (
          <span className="text-xs text-gray-400">Not supported</span>
        )}
      </div>

      {/* WhatsApp */}
      {whatsappEnabled && <div className="py-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">{t("channelWhatsApp")} <TierFeatureBadge requiredPlan="pro" size="xs" /></p>
              {!isPro && <p className="text-[10px] text-amber-500">{t("channelRequiresPro")}</p>}
            </div>
          </div>
          {isPro && prefs?.whatsappVerified && (
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={channels.includes("whatsapp")} onChange={(e) => toggleChannel("whatsapp", e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          )}
        </div>
        {isPro && (!prefs?.whatsappVerified || changingNumber) && (
          <div className="ml-11 space-y-2">
            {!verifySent ? (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setVerifyError(""); }}
                    placeholder={t("whatsappPhonePlaceholder")}
                    className="flex-1 text-sm"
                  />
                  <button onClick={handleVerifyWhatsApp} disabled={verifying || phone.length < 10} className="btn-primary text-xs disabled:opacity-40">
                    {verifying ? t("loading") : t("whatsappVerify")}
                  </button>
                  {changingNumber && (
                    <button onClick={() => { setChangingNumber(false); setVerifySent(false); setPhone(prefs?.whatsappPhone || ""); setVerifyError(""); }} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      {t("cancel")}
                    </button>
                  )}
                </div>
                {verifyError && <p className="text-[10px] text-red-500">{verifyError}</p>}
              </>
            ) : (
              <>
                <p className="text-[10px] text-emerald-500">{t("whatsappCodeSent")}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => { setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setConfirmError(""); }}
                    placeholder={t("whatsappCodePlaceholder")}
                    className="flex-1 text-sm"
                  />
                  <button onClick={handleConfirmWhatsApp} disabled={confirming || verifyCode.length < 6} className="btn-primary text-xs disabled:opacity-40">
                    {confirming ? t("loading") : t("whatsappConfirm")}
                  </button>
                  <button onClick={() => { setVerifySent(false); setVerifyCode(""); setConfirmError(""); }} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {t("cancel")}
                  </button>
                </div>
                {confirmError && <p className="text-[10px] text-red-500">{confirmError}</p>}
              </>
            )}
          </div>
        )}
        {isPro && prefs?.whatsappVerified && !changingNumber && (
          <>
            <div className="ml-11 flex items-center gap-2">
              <p className="text-[10px] text-emerald-500">{t("whatsappVerified")}: {prefs.whatsappPhone}</p>
              <button onClick={() => { setChangingNumber(true); setVerifySent(false); setVerifyCode(""); }} className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
                {t("whatsappChangeNumber")}
              </button>
            </div>
            {prefs.whatsappQuota && (
              <p className="ml-11 text-[10px] text-gray-400 dark:text-gray-500">
                {prefs.whatsappQuota.remainingToday}/{prefs.whatsappQuota.dailyLimit} {t("waQuotaToday")}
                {" · "}
                {prefs.whatsappQuota.remainingMonth}/{prefs.whatsappQuota.monthlyLimit} {t("waQuotaMonth")}
              </p>
            )}
          </>
        )}
      </div>}

      {/* Device */}
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
