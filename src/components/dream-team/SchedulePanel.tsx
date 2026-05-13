"use client";

import { Plus, Clock, Trash2 } from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";

type AgentType = "warren" | "clara" | "will";

const AGENT_PILL_STYLES: Record<AgentType, string> = {
  warren: "bg-violet-500/10 text-violet-500",
  clara: "bg-amber-500/10 text-amber-500",
  will: "bg-emerald-500/10 text-emerald-500",
};

const AGENT_NAMES: Record<AgentType, string> = {
  warren: "Warren",
  clara: "Clara",
  will: "Will",
};

export interface Schedule {
  id: string;
  agent: AgentType;
  frequency: string;
  prompt: string;
  nextRun: string;
  enabled: boolean;
}

export interface SchedulePanelProps {
  schedules: Schedule[];
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function SchedulePanel({
  schedules,
  onToggle,
  onDelete,
  onAdd,
}: SchedulePanelProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-gray-900 dark:text-slate-100">
          {t("dreamTeamScheduledTasks" as TranslationKey)}
        </span>
        <button
          className="w-[26px] h-[26px] rounded-lg border border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 flex items-center justify-center hover:border-emerald-500 hover:text-emerald-500 transition-colors"
          onClick={onAdd}
          aria-label={t("dreamTeamCreateSchedule" as TranslationKey)}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Schedule list */}
      <div className="p-3 flex flex-col gap-2">
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            className="p-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-lg group"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${AGENT_PILL_STYLES[schedule.agent]}`}
              >
                {AGENT_NAMES[schedule.agent]}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500 ml-auto">
                {schedule.frequency}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 italic leading-relaxed">
              &ldquo;{schedule.prompt}&rdquo;
            </div>
            <div className="flex items-center mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 text-[10px] text-gray-400 dark:text-slate-500 gap-1">
              <Clock size={10} />
              {t("dreamTeamNext" as TranslationKey)} {schedule.nextRun}

              <button
                className="ml-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                onClick={() => onDelete(schedule.id)}
                aria-label={t("dreamTeamDeleteSchedule" as TranslationKey)}
              >
                <Trash2 size={10} />
              </button>

              <button
                className={`ml-auto w-[30px] h-4 rounded-full relative cursor-pointer flex-shrink-0 transition-colors ${
                  schedule.enabled
                    ? "bg-emerald-500"
                    : "bg-gray-300 dark:bg-slate-600"
                }`}
                onClick={() => onToggle(schedule.id, !schedule.enabled)}
                role="switch"
                aria-checked={schedule.enabled}
                aria-label={t("dreamTeamToggleSchedule" as TranslationKey)}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                    schedule.enabled ? "right-0.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
