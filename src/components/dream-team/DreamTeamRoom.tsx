"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Plus } from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { ThreadCard } from "./ThreadCard";
import { AgentComposer } from "./AgentComposer";
import { SchedulePanel, type Schedule } from "./SchedulePanel";
import { ActivityFeed, type ActivityItem } from "./ActivityFeed";

type AgentType = "warren" | "clara" | "will";

interface Thread {
  id: string;
  agent: AgentType;
  topic: string;
  status: "active" | "minimized" | "closed" | "archived";
  messageCount: number;
  updatedAt: string;
  lastMessage?: string;
}

const AGENT_COLORS: Record<AgentType, { dot: string; text: string; bg: string; chipBg: string }> = {
  warren: { dot: "bg-violet-500", text: "text-violet-500", bg: "bg-violet-500", chipBg: "bg-violet-500" },
  clara: { dot: "bg-amber-500", text: "text-amber-500", bg: "bg-amber-500", chipBg: "bg-amber-500" },
  will: { dot: "bg-emerald-500", text: "text-emerald-500", bg: "bg-emerald-500", chipBg: "bg-emerald-500" },
};

const AGENT_NAMES: Record<AgentType, string> = {
  warren: "Warren",
  clara: "Clara",
  will: "Will",
};

const AGENT_INITIALS: Record<AgentType, string> = {
  warren: "W",
  clara: "C",
  will: "W",
};

const INITIAL_SCHEDULES: Schedule[] = [
  {
    id: "sched-1",
    agent: "warren",
    frequency: "Daily · 18:00",
    prompt: "How did my portfolio close today? Give me a summary with top movers.",
    nextRun: "Today 18:00",
    enabled: true,
  },
  {
    id: "sched-2",
    agent: "clara",
    frequency: "Weekly · Mon 9:00",
    prompt: "Weekly spending vs budget breakdown.",
    nextRun: "Monday 9:00",
    enabled: true,
  },
  {
    id: "sched-3",
    agent: "will",
    frequency: "Monthly · 1st",
    prompt: "Remind me to review active MOATs and rebalance if needed.",
    nextRun: "Jun 1, 9:00",
    enabled: true,
  },
];

const INITIAL_ACTIVITY: ActivityItem[] = [
  { id: "act-1", agent: "warren", text: "Warren asked Clara for your savings balance", time: "2 min ago" },
  { id: "act-2", agent: "warren", text: "Warren asked Will to schedule AAPL MOAT review", time: "1 min ago" },
  { id: "act-3", agent: "will", text: "Will created reminder: \"Review AAPL MOAT\" — Jun 13", time: "1 min ago" },
  { id: "act-4", agent: "clara", text: "Clara responded to Warren with savings data", time: "2 min ago" },
];

export function DreamTeamRoom() {
  const { t } = useI18n();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>(INITIAL_SCHEDULES);
  const [activity] = useState<ActivityItem[]>(INITIAL_ACTIVITY);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/dream-team/threads");
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads ?? []);
      }
    } catch {
      // API not yet implemented — use empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleStatusChange = useCallback((id: string, status: string) => {
    setThreads((prev) =>
      prev.map((th) =>
        th.id === id ? { ...th, status: status as Thread["status"] } : th,
      ),
    );
    fetch(`/api/dream-team/threads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  }, []);

  const handleRestoreThread = useCallback((id: string) => {
    setThreads((prev) =>
      prev.map((th) =>
        th.id === id ? { ...th, status: "active" as const } : th,
      ),
    );
    fetch(`/api/dream-team/threads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    }).catch(() => {});
  }, []);

  const handleSendMessage = useCallback(
    async (message: string, agent: AgentType) => {
      const cleanMessage = message.replace(/@\w+\s*/g, "").trim();
      const topic = cleanMessage.slice(0, 100);

      try {
        const res = await fetch("/api/dream-team/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent, topic, message: cleanMessage }),
        });
        if (res.ok) {
          const data = await res.json();
          setThreads((prev) => [{ ...data.thread, lastMessage: cleanMessage }, ...prev]);
        }
      } catch {
        // Optimistic fallback
        const newThread: Thread = {
          id: `thread-${Date.now()}`,
          agent,
          topic,
          status: "active",
          messageCount: 1,
          updatedAt: new Date().toISOString(),
          lastMessage: cleanMessage,
        };
        setThreads((prev) => [newThread, ...prev]);
      }
    },
    [],
  );

  const handleToggleSchedule = useCallback((id: string, enabled: boolean) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled } : s)),
    );
  }, []);

  const handleDeleteSchedule = useCallback((id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleAddSchedule = useCallback(() => {
    // Placeholder — would open a modal
  }, []);

  const activeThreads = threads.filter((th) => th.status === "active");
  const minimizedThreads = threads.filter((th) => th.status === "minimized");
  const closedThreads = threads.filter((th) => th.status === "closed");

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="px-6 py-3.5 border-b border-gray-200 dark:border-slate-700 flex items-center gap-4 bg-white dark:bg-slate-900">
        <h1 className="text-base font-semibold text-gray-900 dark:text-slate-100 tracking-tight">
          {t("dreamTeamTitle" as TranslationKey)}
        </h1>

        {/* Agent status dots */}
        <div className="flex gap-4 items-center">
          {(["warren", "clara", "will"] as const).map((agent) => (
            <div key={agent} className="flex items-center gap-1.5 text-xs font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${AGENT_COLORS[agent].dot}`} />
              <span className={AGENT_COLORS[agent].text}>{AGENT_NAMES[agent]}</span>
            </div>
          ))}
        </div>

        {/* Header actions */}
        <div className="ml-auto flex gap-1.5">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
            aria-label={t("dreamTeamSchedules" as TranslationKey)}
          >
            <Clock size={13} />
            {t("dreamTeamSchedules" as TranslationKey)}
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
            aria-label={t("dreamTeamNewThread" as TranslationKey)}
          >
            <Plus size={13} />
            {t("dreamTeamNewThread" as TranslationKey)}
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Threads area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {/* Minimized strip (chips for closed threads) */}
          {closedThreads.length > 0 && (
            <div className="flex gap-1.5 flex-wrap" role="list" aria-label={t("dreamTeamMinimizedThreads" as TranslationKey)}>
              {closedThreads.map((thread) => (
                <button
                  key={thread.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-xs cursor-pointer hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => handleRestoreThread(thread.id)}
                  title={t("dreamTeamClickRestore" as TranslationKey)}
                  aria-label={`${t("dreamTeamRestore" as TranslationKey)}: ${thread.topic}`}
                >
                  <span
                    className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white ${AGENT_COLORS[thread.agent].chipBg}`}
                  >
                    {AGENT_INITIALS[thread.agent]}
                  </span>
                  <span className="text-gray-500 dark:text-slate-400 max-w-[120px] truncate">
                    {thread.topic}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </button>
              ))}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400 dark:text-slate-500">
              {t("dreamTeamLoading" as TranslationKey)}
            </div>
          )}

          {/* Empty state */}
          {!loading && threads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex gap-2 mb-4">
                {(["warren", "clara", "will"] as const).map((agent) => (
                  <div
                    key={agent}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white ${AGENT_COLORS[agent].bg}`}
                  >
                    {AGENT_INITIALS[agent]}
                  </div>
                ))}
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1">
                {t("dreamTeamEmptyTitle" as TranslationKey)}
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md">
                {t("dreamTeamEmptyDescription" as TranslationKey)}
              </p>
            </div>
          )}

          {/* Active threads */}
          {activeThreads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              onStatusChange={handleStatusChange}
            />
          ))}

          {/* Minimized threads (rendered as collapsed cards) */}
          {minimizedThreads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>

        {/* Right sidebar (schedules + activity) */}
        <aside className="hidden lg:flex w-72 flex-col bg-white dark:bg-slate-800 border-l border-gray-100 dark:border-slate-700 overflow-y-auto flex-shrink-0">
          <SchedulePanel
            schedules={schedules}
            onToggle={handleToggleSchedule}
            onDelete={handleDeleteSchedule}
            onAdd={handleAddSchedule}
          />

          <ActivityFeed items={activity} />

          {/* Financial disclaimer */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 text-[10px] text-gray-400 dark:text-slate-500 leading-relaxed">
            {t("dreamTeamDisclaimer" as TranslationKey)}
          </div>
        </aside>
      </div>

      {/* Bottom composer */}
      <AgentComposer onSend={handleSendMessage} />
    </div>
  );
}
