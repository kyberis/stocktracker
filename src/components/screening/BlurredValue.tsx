"use client";

import type { ReactNode } from "react";

/**
 * Paywall-style blur for screening report teasers (Office `.paywallPreview` pattern).
 * Dev/preview only until credits redact data server-side.
 */
export function BlurredValue({
  locked,
  children,
  className = "",
  as: Tag = "span",
}: {
  locked: boolean;
  children: ReactNode;
  className?: string;
  as?: "span" | "div" | "p" | "td" | "dd";
}) {
  if (!locked) {
    return <Tag className={className}>{children}</Tag>;
  }
  return (
    <Tag
      className={`select-none pointer-events-none [filter:blur(6px)] ${className}`.trim()}
      aria-hidden
    >
      {children}
    </Tag>
  );
}

/** Redacted placeholder shown under blur so ticker identity is not in the DOM. */
export function redactedCandidateLabel(rankOneBased: number, template: string): string {
  return template.replace("{n}", String(rankOneBased));
}

export function splitSummaryHook(text: string): { hook: string; rest: string } {
  const trimmed = text.trim();
  if (!trimmed) return { hook: "", rest: "" };
  const m = trimmed.match(/^(.+?[.!?])(\s+|$)/);
  if (!m) return { hook: trimmed, rest: "" };
  return { hook: m[1], rest: trimmed.slice(m[0].length).trim() };
}
