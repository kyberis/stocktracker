"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

function fmt(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export interface VoiceMessagePlayerProps {
  src: string;
  /** Wall-clock duration from message JSON (used until metadata loads). */
  durationSec: number;
}

/**
 * Custom voice player — avoids WebKit/Safari bugs that render native `<audio controls>` as a
 * distorted strip inside chat bubbles. Matches the preview UX (play + timeline).
 */
export function VoiceMessagePlayer({ src, durationSec }: VoiceMessagePlayerProps) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [dur, setDur] = useState(() => Math.max(0.001, durationSec));
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    setCurrent(0);
    setPlaying(false);
    setLoadError(false);
    setDur(Math.max(0.001, durationSec));
    a.load();
  }, [src, durationSec]);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => {
      const d = a.duration;
      if (Number.isFinite(d) && d > 0 && d !== Infinity) setDur(d);
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
      try {
        a.currentTime = 0;
      } catch {
        /* ignore */
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onErr = () => setLoadError(true);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("ended", onEnded);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("error", onErr);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("error", onErr);
    };
  }, [src]);

  const toggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const a = ref.current;
      if (!a || loadError) return;
      if (playing) a.pause();
      else void a.play().catch(() => setLoadError(true));
    },
    [playing, loadError]
  );

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const a = ref.current;
      if (!a || loadError || dur <= 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const p = Math.min(1, Math.max(0, x / rect.width));
      a.currentTime = p * dur;
    },
    [dur, loadError]
  );

  const progressPct = dur > 0 ? Math.min(100, (current / dur) * 100) : 0;

  if (loadError) {
    return (
      <p className="text-xs text-amber-800 dark:text-amber-200 py-1">
        Could not load audio. Check the link or try again.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2.5 min-h-[40px] w-full min-w-0 max-w-[260px]" onClick={(e) => e.stopPropagation()}>
      <audio ref={ref} src={src} preload="metadata" className="sr-only" aria-hidden />
      <button
        type="button"
        onClick={toggle}
        className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-100"
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        {playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5 ml-0.5" fill="currentColor" />}
      </button>
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div
          className="h-2 rounded-full bg-gray-200/90 dark:bg-slate-300/80 cursor-pointer"
          onClick={seek}
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-indigo-600 transition-[width] duration-150 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] tabular-nums text-gray-600 dark:text-slate-600 leading-none">
          <span>{fmt(current)}</span>
          <span>{fmt(dur)}</span>
        </div>
      </div>
    </div>
  );
}
