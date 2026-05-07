"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useEffect, Suspense, useCallback } from "react";
import { startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { ThemeProvider } from "@/lib/theme-context";
import TurnstileWidget from "@/components/TurnstileWidget";

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

function AppleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function PasskeyIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 11a4 4 0 1 0-2.68 3.77" />
      <path d="M12.68 14.77L11 23l2.5-1.5L16 23l-1.32-5.23" />
      <circle cx="15" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LoginForm({ oidcRetryHref }: { oidcRetryHref?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [supportsPasskey, setSupportsPasskey] = useState(false);

  const [emailVerifiedSuccess, setEmailVerifiedSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const onTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);
  const [appleEnabled, setAppleEnabled] = useState(false);
  const [nativePlatform, setNativePlatform] = useState<"ios" | "android" | "web">("web");

  const deviceRef = searchParams.get("ref") === "device";
  const redirectTo = searchParams.get("redirect");

  function postLoginUrl(): string {
    if (redirectTo && redirectTo.startsWith("/")) return redirectTo;
    return "/";
  }

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) setError(oauthError);
    if (searchParams.get("emailVerified") === "true") setEmailVerifiedSuccess(true);
    if (searchParams.get("ref") === "device") {
      try { sessionStorage.setItem("device_interest_pending", "1"); } catch { /* private browsing */ }
    }
  }, [searchParams]);

  useEffect(() => {
    setSupportsPasskey(browserSupportsWebAuthn());
    fetch("/api/feature-flags")
      .then((r) => r.json())
      .then((data) => setAppleEnabled(data.apple_signin_enabled ?? false))
      .catch(() => {});
    import("@/lib/capacitor").then(({ getNativePlatform }) => {
      setNativePlatform(getNativePlatform());
    });
  }, []);

  const showApple = appleEnabled && nativePlatform !== "android";
  const showPasskey = supportsPasskey && nativePlatform === "web";

  const onPasskeyLogin = async () => {
    setPasskeyLoading(true);
    setError(null);
    try {
      const optRes = await fetch("/api/auth/passkey/login-options", { method: "POST" });
      if (!optRes.ok) throw new Error("Failed to get options");
      const options = await optRes.json();

      const credential = await startAuthentication(options);

      const verifyRes = await fetch("/api/auth/passkey/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(data.error || "Passkey sign-in failed.");
        return;
      }
      if (data.user?.mustChangePassword) {
        router.replace("/change-password");
      } else {
        router.replace(postLoginUrl());
      }
      router.refresh();
    } catch {
      setError("Passkey sign-in failed. Please try again.");
    } finally {
      setPasskeyLoading(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, turnstileToken: turnstileToken || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }

      if (data.user?.mustChangePassword) {
        router.replace("/change-password");
      } else {
        router.replace(postLoginUrl());
      }
      router.refresh();
    } catch {
      setError("Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo + branding */}
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2.5 mb-3">
            <svg className="w-10 h-10 rounded-xl shadow-lg shadow-emerald-500/20" viewBox="0 0 32 32">
              <defs>
                <linearGradient id="li-a" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#6ee7b7"/><stop offset="100%" stopColor="#10b981"/></linearGradient>
                <linearGradient id="li-b" x1="0" y1=".3" x2="1" y2=".7"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient>
                <linearGradient id="li-c" x1=".5" y1="1" x2=".5" y2="0"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#047857"/></linearGradient>
                <linearGradient id="li-d" x1="1" y1=".3" x2="0" y2=".7"><stop offset="0%" stopColor="#a7f3d0"/><stop offset="100%" stopColor="#34d399"/></linearGradient>
              </defs>
              <rect width="32" height="32" rx="7" fill="#0f172a"/>
              <g transform="translate(16,16) rotate(45)">
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#li-a)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#li-b)" transform="rotate(90)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#li-c)" transform="rotate(180)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#li-d)" transform="rotate(270)"/>
                <circle cx="0" cy="0" r="1.2" fill="#0f172a" opacity=".35"/>
              </g>
            </svg>
            <span className="text-xl font-bold text-gray-900 dark:text-white">trefolio</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Sign in to your account</p>
        </div>

        <div className="card p-6">
          {emailVerifiedSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-2 mb-4">
              <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">Email verified! Please sign in.</p>
            </div>
          )}

          {/* Passkey + OAuth sign-in */}
          <div className="space-y-3">
            {showPasskey && (
              <button
                type="button"
                onClick={onPasskeyLogin}
                disabled={passkeyLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border-2 border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors text-sm font-medium text-emerald-700 dark:text-emerald-300"
              >
                <PasskeyIcon />
                {passkeyLoading ? "Verifying..." : "Sign in with a passkey"}
              </button>
            )}
            <a
              href={redirectTo ? `/api/auth/google?redirect=${encodeURIComponent(redirectTo)}` : "/api/auth/google"}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors text-sm font-medium text-gray-700 dark:text-slate-200"
            >
              <GoogleIcon />
              Continue with Google
            </a>
            {showApple && (
              <a
                href={redirectTo ? `/api/auth/apple?redirect=${encodeURIComponent(redirectTo)}` : "/api/auth/apple"}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors text-sm font-medium text-gray-700 dark:text-slate-200"
              >
                <AppleIcon />
                Continue with Apple
              </a>
            )}
          </div>

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
                Email or username
              </label>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full"
                placeholder="you@example.com"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <TurnstileWidget onToken={onTurnstileToken} />

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  {oidcRetryHref && (
                    <a
                      href={oidcRetryHref}
                      className="inline-flex text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Try unified sign-in again
                    </a>
                  )}
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-sm text-gray-500 dark:text-slate-400 mt-6 text-center">
          Don&apos;t have an account?{" "}
          <Link href={deviceRef ? "/signup?ref=device" : "/signup"} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPageClient({ oidcRetryHref }: { oidcRetryHref?: string }) {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 safe-area-top">
        <Suspense>
          <LoginForm oidcRetryHref={oidcRetryHref} />
        </Suspense>
        <footer className="py-6 text-center text-xs text-gray-400 dark:text-slate-500 flex items-center justify-center gap-3 flex-wrap">
          <span>&copy; {new Date().getFullYear()} trefolio</span>
          <span className="text-gray-300 dark:text-slate-700">·</span>
          <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-slate-300 transition-colors">Privacy</Link>
          <span className="text-gray-300 dark:text-slate-700">·</span>
          <Link href="/terms" className="hover:text-gray-600 dark:hover:text-slate-300 transition-colors">Terms</Link>
          <span className="text-gray-300 dark:text-slate-700">·</span>
          <Link href="/contact" className="hover:text-gray-600 dark:hover:text-slate-300 transition-colors">Contact</Link>
        </footer>
      </div>
    </ThemeProvider>
  );
}
