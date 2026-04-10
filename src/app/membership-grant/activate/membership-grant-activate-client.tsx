"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme-context";
import Link from "next/link";

export type MembershipGrantTokenStatus = "valid" | "invalid";

function GrantUnavailablePage() {
  const heading = "Activation link unavailable";
  const description =
    "This activation link is invalid or has already been used. If you need help, contact support.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-slate-100 dark:bg-slate-950 safe-area-top">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/10 dark:shadow-black/40 p-8 text-center">
        <p className="text-lg font-semibold tracking-tight text-emerald-600 dark:text-emerald-500 mb-3">trefolio</p>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{heading}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">{description}</p>
        <Link
          href="/"
          className="inline-flex min-w-[160px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 justify-center"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

function MembershipGrantActivateInner({
  token,
  tokenStatus,
}: {
  token: string;
  tokenStatus: MembershipGrantTokenStatus;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoActivateRef = useRef(false);

  const shouldAutoActivate = searchParams.get("auto") === "1";

  const doActivate = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/membership-grant/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not activate membership. Please try again.");
        return;
      }
      router.push("/profile?membership=activated");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (shouldAutoActivate && user && !authLoading && tokenStatus === "valid" && !autoActivateRef.current) {
      autoActivateRef.current = true;
      void doActivate();
    }
  }, [shouldAutoActivate, user, authLoading, tokenStatus, doActivate]);

  if (tokenStatus !== "valid") {
    return <GrantUnavailablePage />;
  }

  if (shouldAutoActivate && !error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-950">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-600 dark:text-slate-400">Activating your membership…</p>
      </div>
    );
  }

  async function handleActivate() {
    if (!user && !authLoading) {
      const returnUrl = `/membership-grant/activate?token=${encodeURIComponent(token)}&auto=1`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    void doActivate();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-slate-100 dark:bg-slate-950 safe-area-top">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/10 dark:shadow-black/40 p-8 text-center">
        <p className="text-lg font-semibold tracking-tight text-emerald-600 dark:text-emerald-500 mb-1">trefolio</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">Activate your membership</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          The trefolio support team granted you complimentary access. Tap below to start your included period — the
          clock starts now.
        </p>
        {user?.email ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">Signed in as {user.email}</p>
        ) : null}

        {error ? (
          <div
            className="mt-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-800 dark:text-red-200 text-left"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => void handleActivate()}
            disabled={loading}
            className="w-full sm:w-auto min-w-[240px] rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? "Activating…" : "Activate membership"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MembershipGrantActivateClient({
  token,
  tokenStatus,
}: {
  token: string;
  tokenStatus: MembershipGrantTokenStatus;
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <MembershipGrantActivateInner token={token} tokenStatus={tokenStatus} />
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
