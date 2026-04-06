"use client";

import { Globe, Users, Lock } from "lucide-react";

const VIS_CONFIG: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  public: { label: "Public", icon: Globe, color: "text-emerald-400" },
  network: { label: "Network", icon: Users, color: "text-purple-400" },
  private: { label: "Private", icon: Lock, color: "text-[var(--muted)]" },
};

export function VisibilityBadge({ visibility }: { visibility: string }) {
  const config = VIS_CONFIG[visibility] || VIS_CONFIG.public;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}
