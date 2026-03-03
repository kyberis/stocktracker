"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import type { ApiProviderName } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
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

  const initials = (displayName || user?.username || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("profile")}</h1>
          <button onClick={() => router.push("/")} className="btn-secondary text-sm">
            {t("backToPortfolio")}
          </button>
        </div>

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
                onClick={() => hasGlobalAvKey && setLocalProvider("alphavantage")}
                disabled={!hasGlobalAvKey}
                className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  localProvider === "alphavantage"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                    : !hasGlobalAvKey
                      ? "border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 opacity-50 cursor-not-allowed"
                      : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-500"
                }`}
              >
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Alpha Vantage</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t("alphaVantageDesc")}</p>
              </button>
            </div>
            {!hasGlobalAvKey && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                {t("avKeyManagedByAdmin")}
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
      </div>
    </main>
  );
}
