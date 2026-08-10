"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Status = "idle" | "submitting" | "success" | "error" | "needsLogin";

export default function DeleteAccountConfirmPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleConfirm = async () => {
    if (!token) return;
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/auth/delete-account/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.status === 401) {
        setStatus("needsLogin");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.error || "Failed to delete account.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setTimeout(() => {
        window.location.href = "/login?account_deleted=1";
      }, 1500);
    } catch {
      setErrorMessage("Network error.");
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
            <span className="text-emerald-500 font-extrabold text-lg">t</span>
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">trefolio</span>
        </Link>

        <div className="card p-8">
          {!token && (
            <div className="space-y-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Invalid link</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                This confirmation link is missing its token. Request a new one from your account settings.
              </p>
            </div>
          )}

          {token && (status === "idle" || status === "submitting") && (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Confirm account deletion</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                This will permanently delete your trefolio account and all its data. This can&apos;t be undone.
              </p>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={status === "submitting"}
                className="btn-danger w-full disabled:opacity-40"
              >
                {status === "submitting" ? "Deleting…" : "Delete my account"}
              </button>
            </div>
          )}

          {status === "needsLogin" && (
            <div className="space-y-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Please log in first</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                For your security, you need to be logged in as the account you&apos;re deleting to confirm this.
              </p>
              <Link
                href={`/login?redirect=${encodeURIComponent(`/delete-account/confirm?token=${token}`)}`}
                className="inline-block mt-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
              >
                Log in
              </Link>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Account deleted</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Redirecting…</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Couldn&apos;t delete account</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">{errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
