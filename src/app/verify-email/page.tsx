"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { ThemeProvider } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { AuthProvider } from "@/lib/auth-context";

const RESEND_COOLDOWN = 60;

function VerifyEmailContent() {
  const { user, logout } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || sending) return;
    setSending(true);
    setError(null);
    setSent(false);

    try {
      const res = await fetch("/api/auth/verify-email", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send verification email.");
        return;
      }
      setSent(true);
      setCooldown(RESEND_COOLDOWN);
    } catch {
      setError("Failed to send verification email.");
    } finally {
      setSending(false);
    }
  }, [cooldown, sending]);

  const maskedEmail = user?.email
    ? user.email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 6)) + c)
    : "";

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2.5 mb-3">
            <svg className="w-10 h-10 rounded-xl shadow-lg shadow-emerald-500/20" viewBox="0 0 32 32">
              <defs>
                <linearGradient id="ve-a" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#6ee7b7"/><stop offset="100%" stopColor="#10b981"/></linearGradient>
                <linearGradient id="ve-b" x1="0" y1=".3" x2="1" y2=".7"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient>
                <linearGradient id="ve-c" x1=".5" y1="1" x2=".5" y2="0"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#047857"/></linearGradient>
                <linearGradient id="ve-d" x1="1" y1=".3" x2="0" y2=".7"><stop offset="0%" stopColor="#a7f3d0"/><stop offset="100%" stopColor="#34d399"/></linearGradient>
              </defs>
              <rect width="32" height="32" rx="7" fill="#0f172a"/>
              <g transform="translate(16,16) rotate(45)">
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#ve-a)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#ve-b)" transform="rotate(90)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#ve-c)" transform="rotate(180)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#ve-d)" transform="rotate(270)"/>
                <circle cx="0" cy="0" r="1.2" fill="#0f172a" opacity=".35"/>
              </g>
            </svg>
            <span className="text-xl font-bold text-gray-900 dark:text-white">trefolio</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Check your email</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            One more step to activate your account
          </p>
        </div>

        <div className="card p-6 text-center">
          {/* Email icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <p className="text-sm text-gray-600 dark:text-slate-300 mb-1">
            We sent a verification link to
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {maskedEmail || "your email address"}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-6">
            Click the link in the email to activate your account. The link expires in 24 hours.
          </p>

          {sent && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-2 mb-4">
              <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">Verification email sent!</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 mb-4">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={sending || cooldown > 0}
            className="btn-primary w-full"
          >
            {sending
              ? "Sending..."
              : cooldown > 0
                ? `Resend available in ${cooldown}s`
                : "Resend verification email"}
          </button>

          <button
            onClick={logout}
            className="mt-4 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
          >
            Log out
          </button>
        </div>

        <p className="text-xs text-gray-400 dark:text-slate-500 mt-6 text-center leading-relaxed">
          Didn&apos;t receive the email? Check your spam folder or click resend above.
        </p>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <VerifyEmailContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
