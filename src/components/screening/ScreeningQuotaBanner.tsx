"use client";

import Link from "next/link";
import type { ScreeningQuotaMessage } from "@/lib/screening/quota-message";
import { useScreeningCopy } from "./use-screening-copy";

interface ScreeningQuotaBannerProps {
  message: ScreeningQuotaMessage;
  className?: string;
}

/**
 * Status line for investment-screening quota, with optional Compare plans link.
 */
export function ScreeningQuotaBanner({ message, className = "" }: ScreeningQuotaBannerProps) {
  const { copy } = useScreeningCopy();
  const muted = message.kind === "ok";

  return (
    <div className={className}>
      <p
        className={`text-xs ${
          muted
            ? "text-[color:var(--muted)]"
            : "text-amber-700 dark:text-amber-300"
        }`}
        role="status"
      >
        {message.text}
      </p>
      {message.showUpgrade ? (
        <Link
          href="/billing"
          className="mt-1.5 inline-flex min-h-9 items-center text-xs font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
        >
          {copy.quota.upgradeCta}
        </Link>
      ) : null}
    </div>
  );
}
