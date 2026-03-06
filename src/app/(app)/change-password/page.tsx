"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to change password.");
        return;
      }
      setSuccess("Password updated.");
      router.replace("/");
      router.refresh();
    } catch {
      setError("Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md card">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-8 h-8 rounded-lg" viewBox="0 0 32 32">
            <defs>
              <linearGradient id="cp-a" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#6ee7b7"/><stop offset="100%" stopColor="#10b981"/></linearGradient>
              <linearGradient id="cp-b" x1="0" y1=".3" x2="1" y2=".7"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient>
              <linearGradient id="cp-c" x1="1" y1=".3" x2="0" y2=".7"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#047857"/></linearGradient>
            </defs>
            <rect width="32" height="32" rx="7" fill="#0f172a"/>
            <g transform="translate(16,16)">
              <ellipse cx="0" cy="-5" rx="4.5" ry="6.5" fill="url(#cp-a)"/>
              <ellipse cx="0" cy="-5" rx="4.5" ry="6.5" fill="url(#cp-b)" transform="rotate(120)"/>
              <ellipse cx="0" cy="-5" rx="4.5" ry="6.5" fill="url(#cp-c)" transform="rotate(240)"/>
            </g>
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Change password</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
          You must change your password before continuing.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-300 mb-1.5">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full"
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-300 mb-1.5">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full"
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-300 mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full"
              autoComplete="new-password"
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function ChangePasswordPage() {
  return <ChangePasswordForm />;
}
