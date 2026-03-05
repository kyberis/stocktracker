"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import type { ApiProviderName } from "@/lib/types";
import ProCompareCard from "@/components/ProCompareCard";

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const { provider, hasGlobalAvKey, setProvider } = useSettings();
  const { t } = useI18n();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [localProvider, setLocalProvider] = useState<ApiProviderName>(provider);
  const [dataSaved, setDataSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [billingSync, setBillingSync] = useState<"idle" | "syncing" | "done" | "timeout">("idle");
  const billingSyncRan = useRef(false);

  const returnedFromCheckout = searchParams.get("billing") === "success";
  const needsSync = user && user.plan !== "pro";

  useEffect(() => {
    if (!needsSync) return;
    if (billingSyncRan.current) return;
    billingSyncRan.current = true;

    let cancelled = false;
    const sync = async () => {
      setBillingSync("syncing");
      try {
        const res = await fetch("/api/billing/sync", { method: "POST" });
        const data = await res.json().catch(() => null);
        if (!cancelled && data?.plan === "pro") {
          await refreshUser();
          setBillingSync("done");
          return;
        }
      } catch { /* fall through to polling when returning from checkout */ }

      if (!returnedFromCheckout) {
        if (!cancelled) setBillingSync("idle");
        return;
      }

      const MAX_POLLS = 5;
      const POLL_MS = 2000;
      for (let i = 0; i < MAX_POLLS && !cancelled; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        await refreshUser();
        const fresh = await fetch("/api/auth/me", { cache: "no-store" });
        const me = await fresh.json().catch(() => null);
        if (me?.user?.plan === "pro") {
          if (!cancelled) setBillingSync("done");
          return;
        }
      }
      if (!cancelled) setBillingSync("timeout");
    };
    sync();
    return () => { cancelled = true; };
  }, [needsSync, returnedFromCheckout, refreshUser]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user]);

  useEffect(() => {
    setLocalProvider(provider);
  }, [provider]);

  const handleSaveProfile = async () => {
    setProfileError("");
    setProfileSaved(false);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, avatarUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setProfileError(data?.error || "Failed to save profile.");
        return;
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      refreshUser();
    } catch {
      setProfileError("Network error.");
    }
  };

  const handleSaveDataSettings = () => {
    setProvider(localProvider);
    setDataSaved(true);
    setTimeout(() => setDataSaved(false), 2000);
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg("");
    setPasswordError("");

    if (newPassword.length < 4) {
      setPasswordError("Password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setPasswordError(data?.error || "Failed to change password.");
        return;
      }
      setPasswordMsg("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => setPasswordMsg(""), 3000);
    } catch {
      setPasswordError("Network error.");
    }
  };

  const handleDeleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    setDeleteError("");
    if (!deletePassword) {
      setDeleteError(t("deleteAccountPasswordRequired"));
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDeleteError(data?.error || t("deleteAccountError"));
        setDeleting(false);
        return;
      }
      window.location.href = "/login";
    } catch {
      setDeleteError(t("deleteAccountError"));
      setDeleting(false);
    }
  };

  const initials = (displayName || user?.username || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const isPro = user?.plan === "pro";
  const avProviderDisabled = !hasGlobalAvKey || !isPro;
  const aiLimit = 5;

  return (
    <main className="px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("profile")}</h1>

        {/* Profile Card */}
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("profileSettings")}</h2>

          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-slate-600"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-lg font-bold">
                {initials}
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.username}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {user?.role === "admin" ? t("roleAdmin") : t("roleUser")}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("displayName")}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("displayNamePlaceholder")}
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("avatarUrl")}</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder={t("avatarUrlPlaceholder")}
                className="w-full text-sm"
              />
            </div>
          </div>

          {profileError && (
            <p className="text-xs text-red-500 dark:text-red-400">{profileError}</p>
          )}

          <div className="flex justify-end">
            <button onClick={handleSaveProfile} className="btn-primary text-sm">
              {profileSaved ? t("profileSaved") : t("saveProfile")}
            </button>
          </div>
        </div>

        {/* Data Provider & API Key */}
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("dataSettings")}</h2>

          <div>
            <label className="block text-xs text-gray-500 dark:text-slate-400 mb-2">{t("dataProvider")}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setLocalProvider("yahoo")}
                className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  localProvider === "yahoo"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                    : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-500"
                }`}
              >
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Yahoo Finance</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t("yahooDesc")}</p>
              </button>
              <button
                onClick={() => !avProviderDisabled && setLocalProvider("alphavantage")}
                disabled={avProviderDisabled}
                className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  localProvider === "alphavantage"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                    : avProviderDisabled
                      ? "border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 opacity-50 cursor-not-allowed"
                      : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-500"
                }`}
              >
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Alpha Vantage</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t("alphaVantageDesc")}</p>
              </button>
            </div>
            {avProviderDisabled && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                {!isPro ? t("alphaVantageProOnly") : t("avKeyManagedByAdmin")}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveDataSettings}
              className="btn-primary text-sm"
            >
              {dataSaved ? t("profileSaved") : t("saveSettings")}
            </button>
          </div>
        </div>

        {/* Subscription */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("subscription")}</h2>

          {billingSync === "syncing" && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{t("billingVerifying")}</p>
            </div>
          )}
          {billingSync === "done" && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{t("billingVerified")}</p>
            </div>
          )}
          {billingSync === "timeout" && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-amber-700 dark:text-amber-300">{t("billingVerifyTimeout")}</p>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 dark:border-slate-600 p-4 bg-gray-50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {isPro ? t("planPro") : t("planFree")}
              </p>
              <span className={`text-xs px-2 py-1 rounded-full ${
                isPro
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200"
              }`}>
                {isPro ? t("proBadge") : t("freeBadge")}
              </span>
            </div>
          </div>
          <ProCompareCard
            surface="profile_always_on"
            reason={isPro ? undefined : "upgrade_required"}
            aiUsage={isPro ? undefined : { used: user?.aiCallsThisMonth ?? 0, limit: aiLimit }}
          />
        </div>

        {/* Change Password */}
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("changePasswordSection")}</h2>

          <form onSubmit={handleChangePassword} className="grid gap-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("currentPassword")}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("newPassword")}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("confirmPassword")}</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full text-sm"
                required
              />
            </div>

            {passwordError && (
              <p className="text-xs text-red-500 dark:text-red-400">{passwordError}</p>
            )}
            {passwordMsg && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">{passwordMsg}</p>
            )}

            <div className="flex justify-end">
              <button type="submit" className="btn-primary text-sm">
                {t("updatePassword")}
              </button>
            </div>
          </form>
        </div>

        {/* Notifications (Coming Soon) */}
        <div className="card p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("notificationSettings")}</h2>
          <div className="flex items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">{t("notificationsComingSoon")}</p>
          </div>
        </div>

        {/* Delete Account */}
        {user?.role !== "admin" && (
          <div className="card p-6 space-y-4 border-red-200 dark:border-red-500/20">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">{t("deleteAccount")}</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400">{t("deleteAccountWarning")}</p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-danger text-sm"
              >
                {t("deleteAccountButton")}
              </button>
            ) : (
              <form onSubmit={handleDeleteAccount} className="space-y-3">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{t("deleteAccountConfirm")}</p>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("deleteAccountEnterPassword")}</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full text-sm"
                    autoFocus
                    required
                  />
                </div>
                {deleteError && (
                  <p className="text-xs text-red-500 dark:text-red-400">{deleteError}</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={deleting || !deletePassword}
                    className="btn-danger text-sm disabled:opacity-40"
                  >
                    {deleting ? t("deleteAccountDeleting") : t("deleteAccountConfirmButton")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); setDeleteError(""); }}
                    className="btn-secondary text-sm"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
