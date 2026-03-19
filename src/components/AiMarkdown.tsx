"use client";

import React from "react";

/**
 * Lightweight Markdown subset for streamed AI text (##, ###, bullets, numbered lines, **bold**).
 * No raw HTML — safe for user-facing AI output.
 */
export function renderInlineBold(
  text: string,
  strongClassName = "font-semibold text-gray-800 dark:text-slate-100",
): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className={strongClassName}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export interface AiMarkdownProps {
  text: string;
  /** Smaller type + tighter spacing (chat bubbles). */
  compact?: boolean;
}

export default function AiMarkdown({ text, compact }: AiMarkdownProps) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  const p = compact ? "text-xs leading-relaxed" : "text-sm";
  const h2 = compact
    ? "text-xs font-semibold text-gray-800 dark:text-slate-100 mt-2 mb-0.5"
    : "text-sm font-semibold text-gray-800 dark:text-slate-100 mt-3 mb-1";
  const h3 = compact
    ? "text-[11px] font-semibold text-gray-800 dark:text-slate-200 mt-1.5 mb-0.5"
    : "text-sm font-semibold text-gray-800 dark:text-slate-200 mt-3 mb-1";
  const strongCls = compact
    ? "font-semibold text-gray-800 dark:text-slate-100"
    : "font-semibold text-gray-800 dark:text-slate-100";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className={h2}>
          {renderInlineBold(line.slice(3).trimEnd(), strongCls)}
        </h3>,
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className={h3}>
          {renderInlineBold(line.slice(4).trimEnd(), strongCls)}
        </h4>,
      );
    } else if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      elements.push(
        <p key={i} className={`${p} font-semibold text-gray-800 dark:text-slate-100 mt-2`}>
          {line.slice(2, -2)}
        </p>,
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <p
          key={i}
          className={`${p} pl-3 before:content-['•'] before:mr-2 before:text-emerald-500 text-gray-700 dark:text-slate-300`}
        >
          {renderInlineBold(line.slice(2), strongCls)}
        </p>,
      );
    } else if (/^\d+\.\s/.test(line)) {
      const m = line.match(/^(\d+)\.\s(.*)$/);
      if (m) {
        elements.push(
          <p key={i} className={`${p} pl-1 flex gap-2 text-gray-700 dark:text-slate-300`}>
            <span className="shrink-0 tabular-nums text-emerald-600 dark:text-emerald-400">{m[1]}.</span>
            <span>{renderInlineBold(m[2], strongCls)}</span>
          </p>,
        );
      }
    } else if (line.trim() === "") {
      elements.push(<div key={i} className={compact ? "h-1.5" : "h-2"} />);
    } else {
      elements.push(
        <p key={i} className={`${p} text-gray-700 dark:text-slate-300`}>
          {renderInlineBold(line, strongCls)}
        </p>,
      );
    }
  }

  return <>{elements}</>;
}
