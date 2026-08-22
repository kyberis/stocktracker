"use client";

import type { WidgetTokenEntry } from "@/hooks/use-widget-tokens";

function formatWidgetTokenDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function WidgetTokenList({
  tokens,
  onRevoke,
  disabled,
}: {
  tokens: WidgetTokenEntry[];
  onRevoke: (tokenId: string) => void;
  disabled?: boolean;
}) {
  if (tokens.length === 0) return null;

  return (
    <ul className="space-y-2">
      {tokens.map((token) => (
        <li
          key={token.id}
          className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 px-3 py-2"
        >
          <code className="flex-1 text-xs font-mono text-slate-800 dark:text-slate-200 break-all">
            {token.prefix}
          </code>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
            {formatWidgetTokenDate(token.createdAt)}
          </span>
          <button
            type="button"
            onClick={() => onRevoke(token.id)}
            disabled={disabled}
            className="text-[10px] text-red-600 dark:text-red-400 hover:underline disabled:opacity-40 shrink-0"
          >
            Revoke
          </button>
        </li>
      ))}
    </ul>
  );
}
