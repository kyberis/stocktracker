"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";

export default function LeafWaitlistPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "already" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/device-interest/count")
      .then((r) => r.json())
      .then((d) => { if (typeof d.total === "number") setWaitlistCount(d.total); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/device-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong.");
        return;
      }
      setStatus(data.alreadyEnrolled ? "already" : "sent");
      if (!data.alreadyEnrolled && waitlistCount !== null) {
        setWaitlistCount(waitlistCount + 1);
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error — please try again.");
    }
  }

  const SPECS = [
    { label: "Display", value: '2.41" AMOLED' },
    { label: "Resolution", value: "600 × 450 px" },
    { label: "Touch", value: "Capacitive" },
    { label: "SoC", value: "ESP32-S3" },
    { label: "Connectivity", value: "WiFi" },
    { label: "Power", value: "USB-C" },
    { label: "Firmware", value: "OTA updates" },
    { label: "Themes", value: "4 built-in" },
  ];

  const FEATURES = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
        </svg>
      ),
      title: "Vivid AMOLED Display",
      desc: "Deep blacks, vibrant colors — your portfolio looks stunning on a dedicated 2.41\" screen.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      title: "Live Portfolio Updates",
      desc: "Total value, daily P/L, and top holdings refresh every 60 seconds — no phone needed.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      ),
      title: "AI Insights On-Device",
      desc: "Tap for a GPT-powered portfolio review — sector exposure, risk alerts, and daily commentary.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
      ),
      title: "Over-the-Air Updates",
      desc: "Firmware rolls out automatically. Your device keeps getting better without lifting a finger.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "60-Second Setup",
      desc: "Plug in USB-C, connect WiFi, enter your passkey — your portfolio appears instantly.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      title: "Private & Secure",
      desc: "Data encrypted at rest, transmitted over HTTPS. The device stores nothing except your local passkey.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/trefolio-icon-foil.svg" alt="trefolio" className="h-7 w-7" />
            <span className="text-lg font-bold">trefolio</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/8 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Text side */}
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 mb-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
                    Limited Edition
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    Only 10 units
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-5">
                  Your portfolio,{" "}
                  <span className="bg-gradient-to-r from-violet-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    always visible.
                  </span>
                </h1>

                <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-xl">
                  trefolio Leaf is a premium AMOLED desk display that shows your investment
                  portfolio in real time. AI-powered insights, 4 beautiful themes, and updates
                  every 60 seconds.
                </p>
              </div>

              {/* Waitlist form */}
              {status === "sent" ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-emerald-300">You&apos;re on the list!</h3>
                  </div>
                  <p className="text-sm text-slate-400">
                    We&apos;ll email you when the trefolio Leaf is ready to order.
                    {waitlistCount && waitlistCount > 1 && (
                      <span className="text-slate-500"> You&apos;re #{waitlistCount} on the waitlist.</span>
                    )}
                  </p>
                </div>
              ) : status === "already" ? (
                <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-6">
                  <h3 className="text-lg font-semibold text-violet-300 mb-1">Already on the list!</h3>
                  <p className="text-sm text-slate-400">
                    You&apos;re already signed up. We&apos;ll notify you when it&apos;s time to order.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
                      placeholder="Enter your email"
                      className="flex-1 min-w-0 px-5 py-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm"
                      required
                      disabled={status === "sending"}
                    />
                    <button
                      type="submit"
                      disabled={status === "sending"}
                      className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-violet-600/25 hover:shadow-violet-500/30 text-sm whitespace-nowrap"
                    >
                      {status === "sending" ? "Joining..." : "Join Waitlist"}
                      {status !== "sending" && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
                  {waitlistCount !== null && waitlistCount > 0 && (
                    <p className="text-xs text-slate-500">
                      {waitlistCount} {waitlistCount === 1 ? "person" : "people"} already on the waitlist
                    </p>
                  )}
                </form>
              )}

              {/* Price chips */}
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <span className="text-xs text-slate-500 block">Device only</span>
                  <span className="text-sm font-bold">99 EUR</span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/25">
                  <span className="text-xs text-violet-400 block">+ 1 Year Pro</span>
                  <span className="text-sm font-bold text-violet-300">139 EUR</span>
                </div>
              </div>
            </div>

            {/* Image side */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute -inset-8 bg-gradient-to-br from-violet-500/15 via-emerald-500/10 to-cyan-500/15 rounded-3xl blur-3xl" />
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/screenshots/device-t4s3.png"
                  alt="trefolio Leaf AMOLED device showing the portfolio dashboard"
                  className="w-full max-w-md h-auto drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-28 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need,{" "}
              <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">
                nothing you don&apos;t.
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              No phone, no laptop, no distractions. Just a glance at your desk.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl bg-slate-800/30 border border-slate-700/40 hover:border-violet-500/30 transition-all hover:bg-slate-800/50"
              >
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="py-20 sm:py-28 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Technical Specs</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SPECS.map((s) => (
              <div key={s.label} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-sm font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 sm:py-28 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Why not just check your phone?
          </h2>
          <p className="text-slate-400 text-center mb-10 max-w-xl mx-auto">
            Because glancing at a display is the difference between checking a wall clock
            and pulling out your phone to see the time.
          </p>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/15">
              <h3 className="text-sm font-bold text-rose-400 mb-3">Checking your phone</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 mt-0.5">✕</span> Unlock, open app, wait for load
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 mt-0.5">✕</span> Notifications pull you into other apps
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 mt-0.5">✕</span> 50+ phone checks per day
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 mt-0.5">✕</span> Screen time guilt
                </li>
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
              <h3 className="text-sm font-bold text-emerald-400 mb-3">Glancing at trefolio Leaf</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span> Always on, always visible
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span> Zero distractions — just your portfolio
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span> AI insights with one tap
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span> Beautiful desk companion
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 border-t border-slate-800/50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Be first in line.
          </h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Only 10 trefolio Leaf units will be made in the first batch.
            Join the waitlist to reserve yours.
          </p>

          {status === "sent" || status === "already" ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              You&apos;re on the waitlist
            </div>
          ) : (
            <button
              onClick={() => heroRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-violet-600/25 hover:shadow-violet-500/30"
            >
              Join the Waitlist
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            </button>
          )}
        </div>
      </section>

      {/* Disclaimer */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <p className="text-xs text-slate-600 text-center leading-relaxed">
          trefolio Leaf requires a trefolio Pro subscription (7.99 EUR/month or 59.99 EUR/year).
          The &ldquo;Leaf + 1 Year Pro&rdquo; bundle at 139 EUR includes 12 months of Pro.
          trefolio does not provide financial advice. Past performance does not guarantee future results.
          Prices shown include VAT where applicable. Shipping costs may vary by destination.
          By joining the waitlist, you agree to receive product updates via email.
          You can unsubscribe at any time.
        </p>
      </div>

      <PublicFooter />
    </div>
  );
}
