"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useTrack } from "@/lib/use-track";
import { usePathname } from "next/navigation";

interface SurveyDraft {
  rating: number;
  comment: string;
}

interface EligibilityResponse {
  eligible: boolean;
  draft: { rating: number; comment: string } | null;
}

const BLOCKED_PATHS = ["/import", "/onboarding", "/billing", "/checkout", "/signup", "/login"];
const TRUSTPILOT_URL = "https://www.trustpilot.com/evaluate/trefolio.app";

interface Props {
  demoMode?: boolean;
}

export default function SatisfactionSurvey({ demoMode = false }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const track = useTrack();
  const pathname = usePathname();

  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [phase, setPhase] = useState<"rating" | "thankyou" | "dismissed">("rating");
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const checkedRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const observerRef = useRef<MutationObserver | null>(null);

  const focusTrapRef = useFocusTrap(visible && phase === "rating", () => {
    handleDismiss();
  });

  const checkToastOverlap = useCallback(() => {
    const el = document.querySelector("[data-market-toast]");
    setToastVisible(!!el);
  }, []);

  useEffect(() => {
    if (!visible) return;
    checkToastOverlap();
    const observer = new MutationObserver(checkToastOverlap);
    observer.observe(document.body, { childList: true, subtree: true });
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [visible, checkToastOverlap]);

  useEffect(() => {
    if (demoMode || !user || checkedRef.current) return;
    if (BLOCKED_PATHS.some((p) => pathname.startsWith(p))) return;

    checkedRef.current = true;

    fetch("/api/satisfaction", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: EligibilityResponse) => {
        if (data.eligible) {
          if (data.draft) {
            setRating(data.draft.rating);
            setComment(data.draft.comment || "");
          }
          setVisible(true);
          track("satisfaction_survey_shown");
        }
      })
      .catch(() => {});
  }, [demoMode, user, pathname, track]);

  useEffect(() => {
    const handler = () => {
      setRating(0);
      setComment("");
      setPhase("rating");
      setVisible(true);
    };
    window.addEventListener("satisfaction-survey-trigger", handler);
    return () => window.removeEventListener("satisfaction-survey-trigger", handler);
  }, []);

  const saveDraft = useCallback(
    async (r: number, c?: string) => {
      setSaving(true);
      try {
        await fetch("/api/satisfaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: r, comment: c }),
        });
      } catch {
        // Silently fail
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const handleStarClick = (star: number) => {
    setRating(star);
    track("satisfaction_star_selected", { rating: String(star) });
    saveDraft(star, comment || undefined);
  };

  const handleCommentChange = (value: string) => {
    setComment(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (rating > 0) {
      debounceRef.current = setTimeout(() => {
        saveDraft(rating, value);
      }, 1000);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (rating > 0) {
        await saveDraft(rating, comment);
      }
      await fetch("/api/satisfaction", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      track("satisfaction_survey_submitted", { rating: String(rating) });
      setPhase("thankyou");
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = async () => {
    setPhase("dismissed");
    track("satisfaction_survey_dismissed");
    try {
      await fetch("/api/satisfaction", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
    } catch {
      // Silently fail
    }
    dismissTimerRef.current = setTimeout(() => setVisible(false), 3000);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleDismiss();
  };

  if (!visible || demoMode) return null;

  const bottomClass = toastVisible
    ? "bottom-[200px] sm:bottom-[160px]"
    : "bottom-20 sm:bottom-6";

  return (
    <div
      className={`fixed ${bottomClass} right-4 z-40 w-[340px] sm:w-[360px] transition-all duration-300 ease-out`}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl animate-slide-up overflow-hidden">
        {phase === "rating" && (
          <div ref={focusTrapRef} role="dialog" aria-modal="false" aria-labelledby="satisfaction-title">
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  {t("satisfactionQuickFeedback")}
                </span>
              </div>
              <button
                onClick={handleDismiss}
                aria-label={t("dismiss") || "Dismiss"}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-4 pb-4 pt-2">
              <p id="satisfaction-title" className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {t("satisfactionQuestion")}
              </p>

              {/* Stars */}
              <div className="flex gap-1 mb-1" role="radiogroup" aria-label={t("satisfactionRating")}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={`${star} ${star === 1 ? t("satisfactionStar") : t("satisfactionStars")}`}
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                  >
                    <svg className="w-8 h-8" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        fill={star <= (hoverRating || rating) ? "#fbbf24" : "currentColor"}
                        className={star <= (hoverRating || rating) ? "" : "text-gray-300 dark:text-slate-600"}
                      />
                    </svg>
                  </button>
                ))}
              </div>
              <div className="flex justify-between px-0.5 mb-3">
                <span className="text-[10px] text-gray-400 dark:text-slate-500">{t("satisfactionNotGreat")}</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">{t("satisfactionExcellent")}</span>
              </div>

              {/* Comment textarea — appears after selecting stars */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  rating > 0 ? "max-h-[200px] opacity-100 mb-3" : "max-h-0 opacity-0 mb-0"
                }`}
              >
                <label htmlFor="satisfaction-comment" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                  {t("satisfactionCommentLabel")} <span className="text-gray-400 dark:text-slate-500">({t("satisfactionOptional")})</span>
                </label>
                <textarea
                  id="satisfaction-comment"
                  value={comment}
                  onChange={(e) => handleCommentChange(e.target.value)}
                  placeholder={t("satisfactionCommentPlaceholder")}
                  maxLength={500}
                  className="w-full min-h-[64px] text-sm resize-y"
                />
              </div>

              {/* Submit button */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  rating > 0 ? "max-h-[50px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <button
                  onClick={handleSubmit}
                  disabled={saving || rating === 0}
                  className="btn-primary w-full text-sm disabled:opacity-50"
                >
                  {saving ? t("loading") : t("satisfactionSubmit")}
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === "thankyou" && (
          <div className="p-4 text-center">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("satisfactionThankYouLabel")}</span>
              </div>
              <button
                onClick={() => setVisible(false)}
                aria-label={t("dismiss") || "Close"}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="py-3">
              {rating >= 4 ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{t("satisfactionThankYou")}</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">{t("satisfactionThankYouDesc")}</p>
                  <a
                    href={TRUSTPILOT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track("satisfaction_trustpilot_clicked")}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#00b67a] bg-[#00b67a]/8 text-[#00b67a] text-xs font-semibold hover:bg-[#00b67a]/15 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {t("satisfactionTrustpilot")}
                    <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                  </a>
                  <button
                    onClick={() => setVisible(false)}
                    className="mt-2 text-[11px] text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {t("satisfactionMaybeLater")}
                  </button>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{t("satisfactionWeHearYou")}</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t("satisfactionWeHearYouDesc")}</p>
                </>
              )}
            </div>
          </div>
        )}

        {phase === "dismissed" && (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {t("satisfactionDismissed")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
