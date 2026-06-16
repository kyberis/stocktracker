"use client";

import { useCallback, useMemo, useState } from "react";
import { Bot, Check, Copy, ExternalLink } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import {
  buildClaudeDesktopMcpConfigSnippet,
  buildCursorMcpConfigSnippet,
  getMcpUserEndpointUrl,
} from "@/lib/mcp/public-config";

export default function ProfileMcpSection() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [endpointCopied, setEndpointCopied] = useState(false);
  const [cursorCopied, setCursorCopied] = useState(false);
  const [claudeCopied, setClaudeCopied] = useState(false);

  const mcpUrl = user?.mcpEndpointUrl ?? getMcpUserEndpointUrl();
  const developerUrl = user?.idpDeveloperUrl ?? null;
  const canManageTokens = Boolean(developerUrl);

  const cursorConfig = useMemo(() => buildCursorMcpConfigSnippet(mcpUrl), [mcpUrl]);
  const claudeConfig = useMemo(() => buildClaudeDesktopMcpConfigSnippet(mcpUrl), [mcpUrl]);

  const copyText = useCallback(async (text: string, which: "endpoint" | "cursor" | "claude") => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === "endpoint") {
        setEndpointCopied(true);
        setTimeout(() => setEndpointCopied(false), 2000);
      } else if (which === "cursor") {
        setCursorCopied(true);
        setTimeout(() => setCursorCopied(false), 2000);
      } else {
        setClaudeCopied(true);
        setTimeout(() => setClaudeCopied(false), 2000);
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-500/15 flex items-center justify-center">
          <Bot className="w-5 h-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("profileMcpTitle")}</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("profileMcpSubtitle")}</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-slate-300">{t("profileMcpDescription")}</p>
      <p className="text-xs text-gray-500 dark:text-slate-400">{t("profileMcpToolsHint")}</p>

      <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2">
        {t("profileMcpClaudeConnectorWarning")}
      </p>

      {canManageTokens ? (
        <a
          href={developerUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-sm inline-flex items-center gap-2"
        >
          {t("profileMcpManageTokens")}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      ) : (
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2">
          {t("profileMcpRequiresIdp")}
        </p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-slate-400">
          {t("profileMcpEndpoint")}
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-lg font-mono break-all">
            {mcpUrl}
          </code>
          <button
            type="button"
            onClick={() => void copyText(mcpUrl, "endpoint")}
            className="btn-secondary p-2 shrink-0"
            aria-label={t("profileMcpCopyConfig")}
          >
            {endpointCopied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-slate-400">
            {t("profileMcpClaudeDesktopConfig")}
          </p>
          <button
            type="button"
            onClick={() => void copyText(claudeConfig, "claude")}
            className="btn-secondary text-xs px-2.5 py-1.5 inline-flex items-center gap-1.5"
          >
            {claudeCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                {t("profileMcpCopied")}
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                {t("profileMcpCopyConfig")}
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400">{t("profileMcpClaudeConfigPath")}</p>
        <pre className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-3 rounded-lg overflow-x-auto font-mono">
          {claudeConfig}
        </pre>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-slate-400">
            {t("profileMcpCursorConfig")}
          </p>
          <button
            type="button"
            onClick={() => void copyText(cursorConfig, "cursor")}
            className="btn-secondary text-xs px-2.5 py-1.5 inline-flex items-center gap-1.5"
          >
            {cursorCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                {t("profileMcpCopied")}
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                {t("profileMcpCopyConfig")}
              </>
            )}
          </button>
        </div>
        <pre className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-3 rounded-lg overflow-x-auto font-mono">
          {cursorConfig}
        </pre>
      </div>
    </div>
  );
}
