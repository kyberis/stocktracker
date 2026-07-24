import Image from "next/image";
import Link from "next/link";

export type AgentAccent = "emerald" | "amber" | "violet" | "rose" | "sky";

export const AGENT_ACCENT_CLASSES: Record<
  AgentAccent,
  { bg: string; ring: string; text: string; hoverBg: string }
> = {
  emerald: {
    bg: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    text: "text-emerald-600",
    hoverBg: "hover:bg-emerald-600",
  },
  amber: {
    bg: "bg-amber-500",
    ring: "ring-amber-500/30",
    text: "text-amber-600",
    hoverBg: "hover:bg-amber-600",
  },
  violet: {
    bg: "bg-violet-500",
    ring: "ring-violet-500/30",
    text: "text-violet-600",
    hoverBg: "hover:bg-violet-600",
  },
  rose: {
    bg: "bg-rose-500",
    ring: "ring-rose-500/30",
    text: "text-rose-600",
    hoverBg: "hover:bg-rose-600",
  },
  sky: {
    bg: "bg-sky-500",
    ring: "ring-sky-500/30",
    text: "text-sky-600",
    hoverBg: "hover:bg-sky-600",
  },
};

export type AgentCardProps = {
  name: string;
  role: string;
  description: string;
  accent: AgentAccent;
  iconSrc: string;
  /** Linked product CTA. Omit when using `caseStudy`. */
  href?: string;
  cta?: string;
  external?: boolean;
  onCtaClick?: () => void;
  /** Static case-study badge instead of a CTA (e.g. Roxana). */
  caseStudy?: string;
};

export default function AgentCard({
  name,
  role,
  description,
  accent,
  iconSrc,
  href,
  cta,
  external,
  onCtaClick,
  caseStudy,
}: AgentCardProps) {
  const c = AGENT_ACCENT_CLASSES[accent];

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div
        className={`w-14 h-14 rounded-xl bg-white ring-4 ${c.ring} flex items-center justify-center p-1.5 mb-5 overflow-hidden shrink-0`}
        aria-hidden
      >
        <Image
          src={iconSrc}
          alt=""
          width={48}
          height={48}
          className="object-contain w-full h-full"
          sizes="56px"
        />
      </div>
      <div className="mb-3">
        <h3 className="text-2xl font-bold text-slate-900">{name}</h3>
        <p className={`text-sm font-semibold ${c.text} uppercase tracking-wider mt-0.5`}>
          {role}
        </p>
      </div>
      <p className="text-slate-600 leading-relaxed mb-6">{description}</p>
      {caseStudy ? (
        <span
          className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide ${c.text}`}
        >
          {caseStudy}
        </span>
      ) : href && cta ? (
        external ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onCtaClick}
            className={`inline-flex items-center gap-2 ${c.bg} ${c.hoverBg} text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors`}
          >
            {cta}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        ) : (
          <Link
            href={href}
            onClick={onCtaClick}
            className={`inline-flex items-center gap-2 ${c.bg} ${c.hoverBg} text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors`}
          >
            {cta}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        )
      ) : null}
    </div>
  );
}
