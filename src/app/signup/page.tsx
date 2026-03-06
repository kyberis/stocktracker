"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ThemeProvider } from "@/lib/theme-context";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [seedWithData, setSeedWithData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName: displayName || undefined, seedWithData }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo + branding */}
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2.5 mb-3">
            <svg className="w-10 h-10 rounded-xl shadow-lg shadow-emerald-500/20" viewBox="0 0 32 32">
              <defs>
                <linearGradient id="su-a" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#6ee7b7"/><stop offset="100%" stopColor="#10b981"/></linearGradient>
                <linearGradient id="su-b" x1="0" y1=".3" x2="1" y2=".7"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient>
                <linearGradient id="su-c" x1="1" y1=".3" x2="0" y2=".7"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#047857"/></linearGradient>
              </defs>
              <rect width="32" height="32" rx="7" fill="#0f172a"/>
              <g transform="translate(16,16)">
                <ellipse cx="0" cy="-5" rx="4.5" ry="6.5" fill="url(#su-a)"/>
                <ellipse cx="0" cy="-5" rx="4.5" ry="6.5" fill="url(#su-b)" transform="rotate(120)"/>
                <ellipse cx="0" cy="-5" rx="4.5" ry="6.5" fill="url(#su-c)" transform="rotate(240)"/>
              </g>
            </svg>
            <span className="text-xl font-bold text-gray-900 dark:text-white">trefolio</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Start tracking your portfolio for free</p>
        </div>

        <div className="card p-6">
          {/* Google sign-up */}
          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors text-sm font-medium text-gray-700 dark:text-slate-200"
          >
            <GoogleIcon />
            Continue with Google
          </a>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white dark:bg-slate-800 text-gray-400 dark:text-slate-500">or</span>
            </div>
          </div>

          {/* Email/password form */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                Display name <span className="text-gray-400 dark:text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full"
                placeholder="John Doe"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full"
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={seedWithData}
                onChange={(e) => setSeedWithData(e.target.checked)}
                className="rounded border-gray-300 dark:border-slate-600 text-emerald-500 focus:ring-emerald-500"
              />
              Start with sample portfolio data
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-4 text-center leading-relaxed">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-gray-600 dark:hover:text-slate-300">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-gray-600 dark:hover:text-slate-300">Privacy Policy</Link>.
          </p>
        </div>

        <p className="text-sm text-gray-500 dark:text-slate-400 mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <ThemeProvider>
      <SignupForm />
    </ThemeProvider>
  );
}
