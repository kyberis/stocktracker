"use client";

import AiMarkdown from "@/components/AiMarkdown";

const AGENT_COLORS = {
  warren: "bg-violet-500",
  clara: "bg-amber-500",
  will: "bg-emerald-500",
} as const;

const AGENT_INITIALS = {
  warren: "W",
  clara: "C",
  will: "W",
} as const;

export interface MessageBubbleProps {
  role: "user" | "assistant";
  agent?: "warren" | "clara" | "will" | null;
  content: string;
  metadata?: Record<string, unknown>;
  isStreaming?: boolean;
}

export function MessageBubble({
  role,
  agent,
  content,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex gap-2.5 items-start ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`w-[26px] h-[26px] rounded-full flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0 ${
          isUser
            ? "bg-slate-600 dark:bg-slate-600 text-gray-200 dark:text-slate-200"
            : agent
              ? AGENT_COLORS[agent]
              : "bg-slate-500"
        }`}
      >
        {isUser ? "U" : agent ? AGENT_INITIALS[agent] : "?"}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
          isUser
            ? "bg-slate-200 dark:bg-slate-700 rounded-xl rounded-br-sm text-gray-900 dark:text-slate-100"
            : "bg-white/5 dark:bg-white/[0.03] border border-gray-200 dark:border-slate-700 rounded-xl rounded-bl-sm text-gray-800 dark:text-slate-200"
        }`}
      >
        {isStreaming && !content ? (
          <TypingIndicator />
        ) : (
          <AiMarkdown text={content} compact />
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="inline-flex gap-1 py-1.5 px-1" aria-label="Agent is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[5px] h-[5px] rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce"
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: "1.4s",
          }}
        />
      ))}
    </div>
  );
}
