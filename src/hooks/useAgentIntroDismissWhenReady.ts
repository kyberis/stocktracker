import { useEffect, useRef, useState } from "react";

const FADE_MS = 520;
const MIN_VISIBLE_MS = 1200;

/** Hold the intro until the dashboard is ready and the animation reaches reveal. */
export function useAgentIntroDismissWhenReady({
  playKey,
  dashboardReady,
  animationReady,
  onComplete,
}: {
  playKey: number;
  dashboardReady: boolean;
  animationReady: boolean;
  onComplete: () => void;
}) {
  const [fading, setFading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const startedAtRef = useRef(Date.now());
  const finishedRef = useRef(false);

  useEffect(() => {
    finishedRef.current = false;
    setFading(false);
    setDismissed(false);
    startedAtRef.current = Date.now();
  }, [playKey]);

  useEffect(() => {
    if (dismissed || fading || finishedRef.current) return;
    if (!dashboardReady || !animationReady) return;

    const elapsed = Date.now() - startedAtRef.current;
    const waitMs = Math.max(0, MIN_VISIBLE_MS - elapsed);

    const timer = window.setTimeout(() => {
      setFading(true);
    }, waitMs);

    return () => window.clearTimeout(timer);
  }, [animationReady, dashboardReady, dismissed, fading]);

  useEffect(() => {
    if (!fading || finishedRef.current) return;

    const timer = window.setTimeout(() => {
      finishedRef.current = true;
      setDismissed(true);
      onComplete();
    }, FADE_MS);

    return () => window.clearTimeout(timer);
  }, [fading, onComplete]);

  return { fading, dismissed };
}
