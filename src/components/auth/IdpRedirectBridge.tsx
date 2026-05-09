"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IdpBridgeCopy } from "@/lib/idp/bridge-copy";

export const IDP_REDIRECT_BRIDGE_DEFAULT_SECONDS = 4;

type Variant = "login" | "signup";

export interface IdpRedirectBridgeProps {
  variant: Variant;
  /** Same-origin path (e.g. `/api/auth/oidc/start?redirect=…`). */
  targetHref: string;
  copy: IdpBridgeCopy;
  /** When set, skip auto-redirect countdown; show error and retry only. */
  errorMessage?: string | null;
  /** If true, show disabled copy instead of redirect (IdP not configured). */
  idpDisabled?: boolean;
}

function formatCountdown(template: string, seconds: number): string {
  return template.replace(/\{seconds\}/g, String(seconds));
}

export function IdpRedirectBridge({
  variant,
  targetHref,
  copy,
  errorMessage,
  idpDisabled,
}: IdpRedirectBridgeProps) {
  const [secondsLeft, setSecondsLeft] = useState(
    errorMessage || idpDisabled ? 0 : IDP_REDIRECT_BRIDGE_DEFAULT_SECONDS,
  );
  const doneRef = useRef(false);

  const go = useCallback(() => {
    if (doneRef.current || idpDisabled) return;
    doneRef.current = true;
    window.location.assign(targetHref);
  }, [targetHref, idpDisabled]);

  useEffect(() => {
    if (errorMessage || idpDisabled) return;

    if (secondsLeft === 0) {
      go();
      return;
    }

    const id = window.setTimeout(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    return () => window.clearTimeout(id);
  }, [secondsLeft, errorMessage, idpDisabled, go]);

  const heading = idpDisabled
    ? copy.idpDisabledTitle
    : errorMessage
      ? copy.errorTitle
      : variant === "signup"
        ? copy.headingSignup
        : copy.headingLogin;

  const body = idpDisabled
    ? copy.idpDisabledBody
    : errorMessage
      ? errorMessage
      : variant === "signup"
        ? copy.bodySignup
        : copy.bodyLogin;

  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 text-center">
          {heading}
        </h1>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 text-center leading-relaxed">
          {body}
        </p>

        {!errorMessage && !idpDisabled ? (
          <>
            <p
              className="mt-6 text-center text-sm font-medium text-emerald-700 dark:text-emerald-400"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {formatCountdown(copy.countdown, secondsLeft)}
            </p>
            <button
              type="button"
              className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              onClick={go}
            >
              {copy.continueNow}
            </button>
          </>
        ) : !idpDisabled ? (
          <button
            type="button"
            className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            onClick={go}
          >
            {copy.retry}
          </button>
        ) : null}
      </div>
    </main>
  );
}
