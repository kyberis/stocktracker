"use client";

import { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import type { ApiProviderName } from "@/lib/types";
import ProCompareCard from "@/components/ProCompareCard";
import { Smartphone, Copy, Check, Trash2 } from "lucide-react";

interface PasskeyEntry {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string;
  deviceType: string;
  backedUp: boolean;
}

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

  const [verifyingSending, setVerifyingSending] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyError, setVerifyError] = useState("");

  const [billingSync, setBillingSync] = useState<"idle" | "syncing" | "done" | "timeout">("idle");
  const billingSyncRan = useRef(false);

  const [unlinking, setUnlinking] = useState(false);
  const [googleMsg, setGoogleMsg] = useState("");
  const [googleError, setGoogleError] = useState("");

  const [widgetHasToken, setWidgetHasToken] = useState(false);
  const [widgetToken, setWidgetToken] = useState("");
  const [widgetCopied, setWidgetCopied] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState(false);

  const [passkeys, setPasskeys] = useState<PasskeyEntry[]>([]);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyMsg, setPasskeyMsg] = useState("");
  const [passkeyError, setPasskeyError] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const returnedFromCheckout = searchParams.get("billing") === "success";
  const emailJustVerified = searchParams.get("emailVerified") === "true";
  const googleJustLinked = searchParams.get("googleLinked") === "true";
  const linkError = searchParams.get("linkError");
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
    fetch("/api/widget-token")
      .then((r) => r.json())
      .then((d) => setWidgetHasToken(!!d.hasToken))
      .catch(() => {});
  }, []);

  const fetchPasskeys = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/passkey/list");
      if (res.ok) {
        const data = await res.json();
        setPasskeys(data.passkeys || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setPasskeySupported(browserSupportsWebAuthn());
    fetchPasskeys();
  }, [fetchPasskeys]);

  const handleAddPasskey = useCallback(async () => {
    setPasskeyLoading(true);
    setPasskeyMsg("");
    setPasskeyError("");
    try {
      const optRes = await fetch("/api/auth/passkey/register-options", { method: "POST" });
      if (!optRes.ok) throw new Error("Failed to get options");
      const options = await optRes.json();

      const credential = await startRegistration(options);

      const verifyRes = await fetch("/api/auth/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => null);
        setPasskeyError(data?.error || t("passkeyRegistrationFailed"));
      } else {
        setPasskeyMsg(t("passkeyAdded"));
        setTimeout(() => setPasskeyMsg(""), 4000);
        await fetchPasskeys();
        await refreshUser();
      }
    } catch {
      setPasskeyError(t("passkeyRegistrationFailed"));
    }
    setPasskeyLoading(false);
  }, [fetchPasskeys, refreshUser, t]);

  const handleRemovePasskey = useCallback(async (id: string) => {
    if (!confirm(t("confirmRemovePasskey"))) return;
    setPasskeyMsg("");
    setPasskeyError("");
    try {
      const res = await fetch(`/api/auth/passkey/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setPasskeyMsg(t("passkeyRemoved"));
        setTimeout(() => setPasskeyMsg(""), 4000);
        await fetchPasskeys();
        await refreshUser();
      }
    } catch {
      setPasskeyError("Failed to remove passkey.");
    }
  }, [fetchPasskeys, refreshUser, t]);

  const handleRenamePasskey = useCallback(async (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    try {
      const res = await fetch(`/api/auth/passkey/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setRenamingId(null);
        setRenameValue("");
        setPasskeyMsg(t("passkeyRenamed"));
        setTimeout(() => setPasskeyMsg(""), 4000);
        await fetchPasskeys();
      }
    } catch { /* ignore */ }
  }, [renameValue, fetchPasskeys, t]);

  const handleGenerateToken = useCallback(async () => {
    setWidgetLoading(true);
    try {
      const res = await fetch("/api/widget-token", { method: "POST" });
      const data = await res.json();
      if (data.token) {
        setWidgetToken(data.token);
        setWidgetHasToken(true);
      }
    } catch { /* ignore */ }
    setWidgetLoading(false);
  }, []);

  const handleRevokeToken = useCallback(async () => {
    setWidgetLoading(true);
    try {
      await fetch("/api/widget-token", { method: "DELETE" });
      setWidgetHasToken(false);
      setWidgetToken("");
    } catch { /* ignore */ }
    setWidgetLoading(false);
  }, []);

  const handleCopyToken = useCallback(() => {
    navigator.clipboard.writeText(widgetToken);
    setWidgetCopied(true);
    setTimeout(() => setWidgetCopied(false), 2000);
  }, [widgetToken]);

  useEffect(() => {
    if (emailJustVerified) {
      refreshUser();
      setVerifyMsg(t("emailVerified"));
    }
  }, [emailJustVerified, refreshUser, t]);

  useEffect(() => {
    if (googleJustLinked) {
      refreshUser();
      setGoogleMsg(t("googleLinkedSuccess"));
      setTimeout(() => setGoogleMsg(""), 5000);
    }
    if (linkError) {
      setGoogleError(linkError);
    }
  }, [googleJustLinked, linkError, refreshUser, t]);

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

  const handleUnlinkGoogle = async () => {
    setGoogleMsg("");
    setGoogleError("");
    setUnlinking(true);
    try {
      const res = await fetch("/api/auth/google/unlink", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setGoogleError(data?.error || t("googleLinkError"));
        setUnlinking(false);
        return;
      }
      await refreshUser();
      setUnlinking(false);
    } catch {
      setGoogleError("Network error.");
      setUnlinking(false);
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

        {/* Connected Accounts */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("connectedAccounts")}</h2>

          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Google</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {user?.googleLinked ? t("googleConnected") : t("googleNotConnected")}
              </p>
            </div>
            {user?.googleLinked ? (
              <button
                onClick={handleUnlinkGoogle}
                disabled={unlinking || user?.authProvider === "google"}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                {unlinking ? t("loading") : t("disconnectGoogle")}
              </button>
            ) : user?.email ? (
              <a
                href="/api/auth/google?intent=link"
                className="btn-primary text-xs whitespace-nowrap"
              >
                {t("connectGoogle")}
              </a>
            ) : (
              <p className="text-xs text-gray-400 dark:text-slate-500">{t("setEmailFirst")}</p>
            )}
          </div>

          {googleMsg && <p className="text-xs text-emerald-600 dark:text-emerald-400">{googleMsg}</p>}
          {googleError && <p className="text-xs text-red-500 dark:text-red-400">{googleError}</p>}
        </div>

        {/* Passkeys */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("passkeys")}</h2>
            {passkeySupported && (
              <button
                onClick={handleAddPasskey}
                disabled={passkeyLoading}
                className="btn-primary text-xs"
              >
                {passkeyLoading ? t("loading") : t("addPasskey")}
              </button>
            )}
          </div>

          {!passkeySupported && (
            <p className="text-xs text-gray-400 dark:text-slate-500">{t("passkeyNotSupported")}</p>
          )}

          {passkeySupported && passkeys.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-slate-400">{t("noPasskeys")}</p>
          )}

          {passkeys.map((pk) => (
            <div key={pk.id} className="flex items-center gap-3 py-2 border-t border-gray-100 dark:border-slate-700/50">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 11a4 4 0 1 0-2.68 3.77" />
                  <path d="M12.68 14.77L11 23l2.5-1.5L16 23l-1.32-5.23" />
                  <circle cx="15" cy="7" r="1" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                {renamingId === pk.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRenamePasskey(pk.id); if (e.key === "Escape") setRenamingId(null); }}
                      className="text-sm w-full"
                      autoFocus
                      placeholder={t("passkeyNamePlaceholder")}
                    />
                    <button onClick={() => handleRenamePasskey(pk.id)} className="btn-primary text-xs px-2 py-1">{t("save")}</button>
                    <button onClick={() => setRenamingId(null)} className="btn-secondary text-xs px-2 py-1">{t("cancel")}</button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{pk.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {t("passkeyLastUsed")}: {pk.lastUsedAt ? new Date(pk.lastUsedAt).toLocaleDateString() : t("passkeyNeverUsed")}
                    </p>
                  </>
                )}
              </div>
              {renamingId !== pk.id && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setRenamingId(pk.id); setRenameValue(pk.name); }}
                    className="btn-secondary text-xs px-2 py-1"
                  >
                    {t("renamePasskey")}
                  </button>
                  <button
                    onClick={() => handleRemovePasskey(pk.id)}
                    className="btn-secondary text-xs px-2 py-1 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                  >
                    {t("removePasskey")}
                  </button>
                </div>
              )}
            </div>
          ))}

          {passkeyMsg && <p className="text-xs text-emerald-600 dark:text-emerald-400">{passkeyMsg}</p>}
          {passkeyError && <p className="text-xs text-red-500 dark:text-red-400">{passkeyError}</p>}
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

        {/* Change Password -- hidden for Google-only accounts */}
        {user?.authProvider !== "google" && (
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
        )}

        {/* Email Verification */}
        <div className="card p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("notificationSettings")}</h2>

          {user?.emailVerified ? (
            <div className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t("emailVerified")}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{t("emailVerifiedDesc")}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t("emailNotVerified")}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{t("emailNotVerifiedDesc")}</p>
              </div>
              <button
                disabled={verifyingSending || !user?.email}
                onClick={async () => {
                  setVerifyingSending(true);
                  setVerifyMsg("");
                  setVerifyError("");
                  try {
                    const res = await fetch("/api/auth/verify-email", { method: "POST" });
                    if (res.ok) {
                      setVerifyMsg(t("verificationEmailSent"));
                    } else {
                      const data = await res.json().catch(() => null);
                      setVerifyError(data?.error || "Failed to send.");
                    }
                  } catch {
                    setVerifyError("Network error.");
                  }
                  setVerifyingSending(false);
                }}
                className="btn-primary text-xs whitespace-nowrap disabled:opacity-40"
              >
                {verifyingSending ? t("loading") : t("sendVerificationEmail")}
              </button>
            </div>
          )}
          {verifyMsg && <p className="text-xs text-emerald-600 dark:text-emerald-400">{verifyMsg}</p>}
          {verifyError && <p className="text-xs text-red-500 dark:text-red-400">{verifyError}</p>}
        </div>

        {/* Widget Access */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Widget Access</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Use a token to connect home screen widgets
              </p>
            </div>
          </div>

          {widgetToken ? (
            <div className="space-y-3">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Copy this token now &mdash; it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-lg font-mono break-all">
                  {widgetToken}
                </code>
                <button
                  onClick={handleCopyToken}
                  className="btn-secondary p-2 shrink-0"
                  aria-label="Copy token"
                >
                  {widgetCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <a
                href="/app/widget/setup"
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                View setup instructions &rarr;
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {widgetHasToken && (
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  A widget token is active. Generate a new one to replace it, or revoke it.
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateToken}
                  disabled={widgetLoading}
                  className="btn-primary text-sm disabled:opacity-40"
                >
                  {widgetLoading ? "Generating..." : widgetHasToken ? "Regenerate Token" : "Generate Token"}
                </button>
                {widgetHasToken && (
                  <button
                    onClick={handleRevokeToken}
                    disabled={widgetLoading}
                    className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Revoke
                  </button>
                )}
              </div>
              <a
                href="/app/widget/setup"
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-block"
              >
                View setup instructions &rarr;
              </a>
            </div>
          )}
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
