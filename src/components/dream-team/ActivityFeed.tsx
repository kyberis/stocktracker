"use client";

import { useI18n, type TranslationKey } from "@/lib/i18n";

type AgentType = "warren" | "clara" | "will";

const AGENT_COLORS: Record<AgentType, string> = {
  warren: "bg-violet-500",
  clara: "bg-amber-500",
  will: "bg-emerald-500",
};

const AGENT_INITIALS: Record<AgentType, string> = {
  warren: "W",
  clara: "C",
  will: "W",
};

export interface ActivityItem {
  id: string;
  agent: AgentType;
  text: string;
  time: string;
}

export interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  const { t } = useI18n();

  return (
    <div className="p-3 border-t border-gray-100 dark:border-slate-700 flex-1">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-2.5 px-1">
        {t("dreamTeamAgentActivity" as TranslationKey)}
      </div>
      <div className="flex flex-col">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2 py-1.5 px-1">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] text-white flex-shrink-0 ${AGENT_COLORS[item.agent]}`}
            >
              {AGENT_INITIALS[item.agent]}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-gray-500 dark:text-slate-400 leading-snug">
                {item.text}
              </div>
              <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                {item.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
