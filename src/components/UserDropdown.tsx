"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import TierIcon from "@/components/TierIcon";
import NavPlanChip from "@/components/NavPlanChip";
import { planAtLeast, planDisplayName, planOf } from "@/lib/plan-rank";
import { useCommerceEnabled } from "@/lib/commerce";

export default function UserDropdown() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const commerceEnabled = useCommerceEnabled();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = (user.displayName || user.username || "U")[0].toUpperCase();
  const plan = planOf(user);

  return (
    <div ref={ref} className="relative flex items-center gap-1.5">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account: ${user.displayName || user.username}`}
        className="flex min-h-11 items-center gap-2 rounded-xl border border-[color:var(--border)] px-2.5 py-1.5 text-sm text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-highlight)]"
        style={{ background: "var(--surface-soft)" }}
      >
        {user.avatarUrl ? (
          <Image src={user.avatarUrl} alt="" width={24} height={24} className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <div aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/12 text-[10px] font-bold text-emerald-400">
            {initials}
          </div>
        )}
        <span className="hidden sm:inline max-w-[100px] truncate">{user.displayName || user.username}</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <NavPlanChip variant="nav" />

      {open && (
        <div className="glass-overlay absolute right-0 top-full z-50 mt-2 w-52 animate-in slide-in-from-top-2 rounded-[18px] border border-[color:var(--border)] py-1 shadow-xl duration-150">
          <div className="border-b border-[color:var(--border)] px-3 py-2">
            <p className="truncate text-sm font-medium text-[color:var(--foreground)]">
              {user.displayName || user.username}
            </p>
            <div className="mt-1">
              {plan === "free" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--muted)]">
                  <TierIcon plan="free" size={12} />{t("freeBadge")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <TierIcon plan={plan} size={12} />{planDisplayName(plan)}
                </span>
              )}
            </div>
          </div>

          {commerceEnabled && !planAtLeast(plan, "wealth") && (
            <a
              href="/billing"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2.5 px-3 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-[color:var(--surface-soft)]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {t("upgradeToPro")}
            </a>
          )}

          <a
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-2.5 px-3 py-2 text-sm text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-soft)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {t("profile")}
          </a>

          {user.role === "admin" && (
            <>
              <a
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-2.5 px-3 py-2 text-sm text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-soft)]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                {t("admin")}
              </a>
              <a
                href="/developer"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-2.5 px-3 py-2 text-sm text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-soft)]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                {t("developer")}
              </a>
            </>
          )}

          <div className="mt-1 border-t border-[color:var(--border)] pt-1">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
              </svg>
              {t("signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
