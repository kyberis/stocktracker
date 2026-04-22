"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/** Widget is skipped on localhost (any port) so dev/local-prod builds don't block forms. */
function isLocalhostOrigin(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  onError?: () => void;
}

export default function TurnstileWidget({ onToken, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const disabled = process.env.NEXT_PUBLIC_TURNSTILE_DISABLED === "1";
  const [localhost, setLocalhost] = useState(false);
  useEffect(() => {
    setLocalhost(isLocalhostOrigin());
  }, []);

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onToken,
      "error-callback": onError,
      "expired-callback": onError,
      theme: "auto",
      size: "normal",
    });
  }, [siteKey, onToken, onError]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (disabled) return;
    if (localhost) return;
    if (!siteKey) return;

    if (window.turnstile) {
      renderWidget();
      return;
    }

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => {
        if (window.turnstile) {
          clearInterval(check);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(check);
    }
  }, [siteKey, renderWidget, disabled, localhost]);

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (process.env.NODE_ENV === "development") return null;
  if (disabled) return null;
  if (localhost) return null;
  if (!siteKey) return null;

  return <div ref={containerRef} className="flex justify-center" />;
}
