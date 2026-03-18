"use client";

import { useEffect, useRef, useCallback } from "react";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const LEAVES = [
  { angle: 0, solid: "#22c55e", gradId: "clm-a" },
  { angle: 90, solid: "#16a34a", gradId: "clm-b" },
  { angle: 180, solid: "#15803d", gradId: "clm-c" },
  { angle: 270, solid: "#4ade80", gradId: "clm-d" },
] as const;

const CLOVER = { cy: -36, rx: 17, ry: 26, ty: 90, rot: 0 };
const LOGO = { cy: -30, rx: 25, ry: 36, ty: 100, rot: 45 };

interface Props {
  className?: string;
  /** Play once (clover → logo and stop) instead of looping. Default false. */
  once?: boolean;
  /** Delay before the animation starts in ms. Default 600. */
  delay?: number;
  /** Duration of the clover→logo transition in ms. Default 2000. */
  transitionMs?: number;
  /** Total cycle duration when looping in ms. Default 8000. */
  cycleDuration?: number;
}

export default function CloverToLogo({
  className = "",
  once = false,
  delay = 600,
  transitionMs = 2000,
  cycleDuration = 8000,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cacheRef = useRef<{
    bg: SVGRectElement | null;
    stem: SVGGElement | null;
    group: SVGGElement | null;
    veins: SVGGElement | null;
    solids: SVGEllipseElement[];
    grads: SVGEllipseElement[];
    dot: SVGCircleElement | null;
  } | null>(null);

  const buildCache = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return null;
    return {
      bg: svg.querySelector<SVGRectElement>("[data-bg]"),
      stem: svg.querySelector<SVGGElement>("[data-stem]"),
      group: svg.querySelector<SVGGElement>("[data-leaf-group]"),
      veins: svg.querySelector<SVGGElement>("[data-veins]"),
      solids: Array.from(svg.querySelectorAll<SVGEllipseElement>("[data-leaf-solid]")),
      grads: Array.from(svg.querySelectorAll<SVGEllipseElement>("[data-leaf-grad]")),
      dot: svg.querySelector<SVGCircleElement>("[data-dot]"),
    };
  }, []);

  const applyProgress = useCallback((p: number) => {
    if (!cacheRef.current) cacheRef.current = buildCache();
    const el = cacheRef.current;
    if (!el) return;

    const cy = lerp(CLOVER.cy, LOGO.cy, p);
    const rx = lerp(CLOVER.rx, LOGO.rx, p);
    const ry = lerp(CLOVER.ry, LOGO.ry, p);
    const ty = lerp(CLOVER.ty, LOGO.ty, p);
    const rot = lerp(CLOVER.rot, LOGO.rot, p);
    const tx = `translate(100,${ty}) rotate(${rot})`;

    el.bg?.setAttribute("opacity", String(p));
    el.stem?.setAttribute("opacity", String(1 - p));
    el.group?.setAttribute("transform", tx);
    if (el.veins) {
      el.veins.setAttribute("opacity", String((1 - p) * 0.25));
      el.veins.setAttribute("transform", tx);
    }
    for (const s of el.solids) {
      s.setAttribute("cy", String(cy));
      s.setAttribute("rx", String(rx));
      s.setAttribute("ry", String(ry));
      s.setAttribute("opacity", String(1 - p));
    }
    for (const g of el.grads) {
      g.setAttribute("cy", String(cy));
      g.setAttribute("rx", String(rx));
      g.setAttribute("ry", String(ry));
      g.setAttribute("opacity", String(p));
    }
    el.dot?.setAttribute("opacity", String(p * 0.35));
  }, [buildCache]);

  useEffect(() => {
    let raf: number;
    let timeout: ReturnType<typeof setTimeout>;

    if (once) {
      timeout = setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const elapsed = now - start;
          const raw = Math.min(elapsed / transitionMs, 1);
          applyProgress(easeInOut(raw));
          if (raw < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }, delay);
    } else {
      const dur = cycleDuration;
      const start = performance.now();
      const tick = (now: number) => {
        const phase = ((now - start) % dur) / dur;
        let p: number;
        if (phase < 0.25) p = easeInOut(phase / 0.25);
        else if (phase < 0.5) p = 1;
        else if (phase < 0.75) p = 1 - easeInOut((phase - 0.5) / 0.25);
        else p = 0;
        applyProgress(p);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [once, delay, transitionMs, cycleDuration, applyProgress]);

  return (
    <svg ref={svgRef} className={className} viewBox="0 0 200 200" aria-label="Clover transforming into trefolio logo">
      <defs>
        <linearGradient id="clm-a" x1=".5" y1="0" x2=".5" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" /><stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="clm-b" x1="0" y1=".3" x2="1" y2=".7">
          <stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="clm-c" x1=".5" y1="1" x2=".5" y2="0">
          <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="clm-d" x1="1" y1=".3" x2="0" y2=".7">
          <stop offset="0%" stopColor="#a7f3d0" /><stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>

      <rect data-bg x="30" y="30" width="140" height="140" rx="30" fill="#0f172a" opacity="0" />

      <g data-stem>
        <path d="M100,96 Q99,118 96,142 Q94,153 92,160" stroke="#059669" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M92,160 Q90,163 87,166" stroke="#059669" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <ellipse cx="95" cy="126" rx="5" ry="3.2" fill="#16a34a" transform="rotate(-28 95 126)" opacity="0.5" />
      </g>

      <g data-leaf-group transform={`translate(100,${CLOVER.ty}) rotate(${CLOVER.rot})`}>
        {LEAVES.map(({ angle, solid, gradId }) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <ellipse data-leaf-solid cx="0" cy={CLOVER.cy} rx={CLOVER.rx} ry={CLOVER.ry} fill={solid} />
            <ellipse data-leaf-grad cx="0" cy={CLOVER.cy} rx={CLOVER.rx} ry={CLOVER.ry} fill={`url(#${gradId})`} opacity="0" />
          </g>
        ))}
        <circle data-dot cx="0" cy="0" r="7" fill="#0f172a" opacity="0" />
      </g>

      <g data-veins opacity="0.25" transform={`translate(100,${CLOVER.ty}) rotate(${CLOVER.rot})`}>
        {[0, 90, 180, 270].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <line x1="0" y1="-6" x2="0" y2="-52" stroke="#fff" strokeWidth="0.7" strokeLinecap="round" />
            <line x1="0" y1="-16" x2="-6" y2="-38" stroke="#fff" strokeWidth="0.5" strokeLinecap="round" opacity="0.6" />
            <line x1="0" y1="-16" x2="6" y2="-38" stroke="#fff" strokeWidth="0.5" strokeLinecap="round" opacity="0.6" />
          </g>
        ))}
      </g>
    </svg>
  );
}
