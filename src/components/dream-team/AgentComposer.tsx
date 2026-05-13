"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";

type AgentType = "warren" | "clara" | "will";

const AGENTS: { id: AgentType; name: string; role: string; color: string; bg: string; initial: string }[] = [
  { id: "warren", name: "Warren", role: "Portfolio & Markets", color: "text-violet-500", bg: "bg-violet-500", initial: "W" },
  { id: "clara", name: "Clara", role: "Finance & Savings", color: "text-amber-500", bg: "bg-amber-500", initial: "C" },
  { id: "will", name: "Will", role: "Notes & Reminders", color: "text-emerald-500", bg: "bg-emerald-500", initial: "W" },
];

export interface AgentComposerProps {
  onSend: (message: string, agent: AgentType) => void;
  disabled?: boolean;
}

export function AgentComposer({ onSend, disabled }: AgentComposerProps) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMentionMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);

    const lastAtIndex = v.lastIndexOf("@");
    if (lastAtIndex >= 0) {
      const afterAt = v.slice(lastAtIndex + 1).toLowerCase();
      const hasSpaceAfterAt = afterAt.includes(" ");
      if (!hasSpaceAfterAt) {
        setMentionFilter(afterAt);
        setShowMentionMenu(true);
      } else {
        setShowMentionMenu(false);
      }
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleSelectAgent = (agent: typeof AGENTS[number]) => {
    const lastAtIndex = value.lastIndexOf("@");
    const before = value.slice(0, lastAtIndex);
    const newValue = `${before}@${agent.name.toLowerCase()} `;
    setValue(newValue);
    setShowMentionMenu(false);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    const text = value.trim();
    if (!text || disabled) return;

    const mentionMatch = text.match(/@(warren|clara|will)/i);
    const agent: AgentType = mentionMatch
      ? (mentionMatch[1].toLowerCase() as AgentType)
      : "warren";

    onSend(text, agent);
    setValue("");
  };

  const filteredAgents = AGENTS.filter(
    (a) =>
      !mentionFilter || a.name.toLowerCase().startsWith(mentionFilter),
  );

  return (
    <div className="px-6 pb-5 pt-3 border-t border-gray-200 dark:border-slate-700">
      <div className="relative">
        <div className="flex items-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-1 focus-within:border-emerald-500 dark:focus-within:border-emerald-500 transition-colors">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none px-3.5 py-2.5 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none"
            placeholder={t("dreamTeamComposerPlaceholder" as TranslationKey)}
            value={value}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={disabled}
            aria-label={t("dreamTeamTypeMessage" as TranslationKey)}
          />
          <button
            className="w-[34px] h-[34px] rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0"
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            aria-label={t("dreamTeamSendMessage" as TranslationKey)}
          >
            <Send size={16} />
          </button>
        </div>

        {/* Mention autocomplete */}
        {showMentionMenu && filteredAgents.length > 0 && (
          <div
            ref={menuRef}
            className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50"
            role="listbox"
            aria-label={t("dreamTeamSelectAgent" as TranslationKey)}
          >
            {filteredAgents.map((agent) => (
              <button
                key={agent.id}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                onClick={() => handleSelectAgent(agent)}
                role="option"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] text-white ${agent.bg}`}
                >
                  {agent.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-semibold ${agent.color}`}>
                    {agent.name}
                  </div>
                  <div className="text-[11px] text-gray-400 dark:text-slate-500">
                    {agent.role}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hints */}
      <div className="flex gap-5 mt-2 px-1">
        <span className="text-[11px] text-gray-400 dark:text-slate-500">
          <kbd className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 mr-1">
            @
          </kbd>
          {t("dreamTeamMentionAgent" as TranslationKey)}
        </span>
        <span className="text-[11px] text-gray-400 dark:text-slate-500">
          <kbd className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 mr-1">
            /schedule
          </kbd>
          {t("dreamTeamRecurringTask" as TranslationKey)}
        </span>
        <span className="text-[11px] text-gray-400 dark:text-slate-500">
          <kbd className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 mr-1">
            /research
          </kbd>
          {t("dreamTeamDeepSearch" as TranslationKey)}
        </span>
      </div>
    </div>
  );
}
