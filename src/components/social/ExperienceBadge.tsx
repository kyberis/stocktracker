"use client";

const BADGE_CONFIG: Record<string, { label: string; color: string }> = {
  beginner: { label: "Beginner", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  intermediate: { label: "Intermediate", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  experienced: { label: "Experienced", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  professional: { label: "Professional", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
};

export function ExperienceBadge({ level, className = "" }: { level: string; className?: string }) {
  const config = BADGE_CONFIG[level];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${config.color} ${className}`}>
      {config.label}
    </span>
  );
}
