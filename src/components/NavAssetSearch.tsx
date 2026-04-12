"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

type Variant = "default" | "studio";

export default function NavAssetSearch({ variant = "default" }: { variant?: Variant }) {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState("");

  const submit = useCallback(() => {
    const q = value.trim();
    if (!q) {
      router.push("/explore");
      return;
    }
    router.push(`/explore?q=${encodeURIComponent(q)}`);
  }, [router, value]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
        e.preventDefault();
        const el = document.getElementById("nav-asset-search-input") as HTMLInputElement | null;
        el?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shell =
    variant === "studio"
      ? "bg-zinc-900/90 border border-white/10 focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/20"
      : "bg-gray-100 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-600 focus-within:border-emerald-400/60 dark:focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/15";

  return (
    <form
      role="search"
      aria-label={t("navAssetSearchAria")}
      className={`flex w-full min-w-0 items-center gap-2 rounded-full px-3 py-1.5 transition-shadow ${shell}`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <svg
        className={`h-4 w-4 shrink-0 ${variant === "studio" ? "text-zinc-500" : "text-gray-400 dark:text-slate-500"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        id="nav-asset-search-input"
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("navAssetSearchPlaceholder")}
        autoComplete="off"
        className={`min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
          variant === "studio" ? "text-white" : "text-gray-900 dark:text-white"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
          variant === "studio"
            ? "bg-emerald-600 text-white hover:bg-emerald-500"
            : "bg-emerald-600 text-white hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        }`}
      >
        {t("navAssetSearchButton")}
      </button>
    </form>
  );
}

/** Icon-only link for narrow layouts (mobile header). */
export function NavAssetSearchIconLink({ className = "md:hidden" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <Link
      href="/explore"
      className={`flex shrink-0 items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors ${className}`}
      aria-label={t("navAssetSearchAria")}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    </Link>
  );
}
