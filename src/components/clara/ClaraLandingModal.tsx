"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import AidModalShell from "@/components/aid/AidModalShell";
import { getClaraAppUrl } from "@/lib/clara-public-url";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";

interface Props {
  open: boolean;
  onClose: () => void;
}

type LinkStatus = "loading" | "linked" | "unlinked" | "unknown";

export default function ClaraLandingModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const track = useTrack();
  const [status, setStatus] = useState<LinkStatus>("loading");
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus("loading");
    setActivateError(false);
    setActivating(false);
    track("clara_cta_opened");

    void (async () => {
      try {
        const res = await fetch("/api/clara/status", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setStatus("unknown");
          return;
        }
        const data = (await res.json()) as { linked?: boolean };
        if (!cancelled) setStatus(data.linked ? "linked" : "unlinked");
      } catch {
        if (!cancelled) setStatus("unknown");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, track]);

  const linked = status === "linked";
  const ctaLabel =
    status === "loading" || activating
      ? activating
        ? t("claraModalCreating")
        : t("loading")
      : linked
        ? t("claraModalOpenChat")
        : t("claraModalCreateAccount");

  const handleCta = async () => {
    if (status === "loading" || activating) return;

    if (linked) {
      track("clara_modal_cta_clicked", { kind: "linked" });
      window.open(getClaraAppUrl(), "_blank", "noopener,noreferrer");
      onClose();
      return;
    }

    track("clara_modal_cta_clicked", { kind: "create" });
    setActivating(true);
    setActivateError(false);
    try {
      const res = await fetch("/api/clara/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json().catch(() => null)) as { linked?: boolean } | null;
      if (res.ok && data?.linked) {
        setStatus("linked");
        return;
      }
      setActivateError(true);
    } catch {
      setActivateError(true);
    } finally {
      setActivating(false);
    }
  };

  const bullets = [
    t("claraModalBullet1"),
    t("claraModalBullet2"),
    t("claraModalBullet3"),
    t("claraModalBullet4"),
  ];

  return (
    <AidModalShell
      open={open}
      onClose={onClose}
      title={t("claraModalTitle")}
      ariaLabel={t("claraModalTitle")}
    >
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <span
            className="inline-block shrink-0 overflow-hidden rounded-full ring-2 ring-sky-500/30"
            style={{ width: 56, height: 56 }}
            aria-hidden="true"
          >
            <Image
              src="/avatars/clara-512.png"
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-[color:var(--foreground)]">
              {t("claraName")}
            </p>
            <p className="text-xs text-[color:var(--muted)]">{t("claraModalRole")}</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[color:var(--foreground)]">
          {t("claraModalIntro")}
        </p>

        <ul className="space-y-2">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2 text-sm text-[color:var(--muted)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-[color:var(--muted)]">{t("claraModalFreeNote")}</p>

        {activateError && !linked ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="status" aria-live="polite">
            {t("claraModalActivateError")}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleCta()}
          disabled={status === "loading" || activating}
          className="btn-primary flex min-h-11 w-full items-center justify-center rounded-[14px] bg-sky-600 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {ctaLabel}
        </button>

        <p className="text-center text-[11px] text-[color:var(--muted)]">
          {t("claraModalSisterNote")}
        </p>
        <p className="text-center text-[10px] text-[color:var(--muted)]">
          {t("claraModalDisclaimer")}
        </p>
      </div>
    </AidModalShell>
  );
}
