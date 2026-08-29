"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import type { TranslationKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import { getPlanExpiryBannerVisibility } from "@/lib/plan-expiry-banner";

function tOr(t: (k: TranslationKey) => string, key: TranslationKey, fallback: string) {
  const v = t(key);
  return v === key ? fallback : v;
}

export default function TrialCountdownBanner() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const visibility = useMemo(() => {
    if (!user) return { show: false as const };
    return getPlanExpiryBannerVisibility({
      trialActivatedAt: user.trialActivatedAt ?? "",
      plan: user.plan,
      planExpiresAt: user.planExpiresAt ?? "",
      stripeManaged: user.stripeManaged,
      nowMs,
    });
  }, [user, nowMs]);

  const canOfferTrial =
    user &&
    !user.stripeManaged &&
    !user.trialActivatedAt?.trim() &&
    (user.plan === "free" || user.plan === "basic");

  if (!visibility.show && canOfferTrial) {
    return (
      <div className="flex items-center justify-between px-4 py-1.5 text-xs bg-[color:var(--accent)]/10 border-b border-[color:var(--border)]">
        <span className="text-[color:var(--muted)] truncate">
          {tOr(t, "trialOfferLaterCta" as TranslationKey, "Activate your 7-day Pro trial")}
        </span>
        <button
          type="button"
          className="shrink-0 text-[color:var(--accent)] hover:underline"
          onClick={() => {
            void fetch("/api/trial/activate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            }).then((r) => {
              if (r.ok) window.location.reload();
            });
          }}
        >
          {tOr(t, "trialOfferLaterCta" as TranslationKey, "Activate now")}
        </button>
      </div>
    );
  }

  if (!visibility.show) return null;

  if (visibility.variant === "expired") {
    const msg = tOr(
      t,
      visibility.kind === "sunset"
        ? ("sunsetBannerExpiredMessage" as TranslationKey)
        : ("trialBannerExpiredMessage" as TranslationKey),
      visibility.kind === "sunset"
        ? "Your complimentary Pro access has ended. You are on Free. Your data is still here."
        : "Your Pro trial has ended. Subscribe to continue.",
    );
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 bg-red-500/10 dark:bg-red-500/15 border-b border-red-500/20">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-700 dark:text-red-400 rounded">
            {visibility.kind === "sunset" ? "Pro ended" : "Trial ended"}
          </span>
          <span className="text-sm text-[color:var(--foreground)]">{msg}</span>
        </div>
        <a
          href="/profile?section=subscription"
          className="shrink-0 px-3 py-1 text-xs font-semibold text-white bg-[color:var(--accent)] rounded-lg text-center"
        >
          {tOr(t, "trialBannerExpiredCta" as TranslationKey, "See plans")}
        </a>
      </div>
    );
  }

  const { days, hours } = visibility;
  const dest = user?.planBeforeTrial === "basic" ? "Basic" : "Free";
  const activeMsg =
    visibility.kind === "sunset"
      ? tOr(
          t,
          "sunsetBannerActive" as TranslationKey,
          `Your complimentary Pro ends in ${days}d ${hours}h — then ${dest}.`,
        )
      : `${days}d ${hours}h remaining — then ${dest}`;

  return (
    <div className="flex items-center justify-between px-4 py-1.5 text-xs bg-[color:var(--accent)]/10 border-b border-[color:var(--border)]">
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--accent)] rounded">
          {visibility.kind === "sunset" ? "Pro ending" : "Pro trial"}
        </span>
        <span className="text-[color:var(--muted)] truncate">{activeMsg}</span>
      </div>
      <a href="/profile?section=subscription" className="shrink-0 text-[color:var(--accent)] hover:underline">
        {tOr(t, "trialBannerSubscribe" as TranslationKey, "See plans →")}
      </a>
    </div>
  );
}
