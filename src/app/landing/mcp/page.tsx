"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { Bot, Check, Copy } from "lucide-react";

import McpSetupScreenshot from "@/components/landing/McpSetupScreenshot";
import PublicFooter from "@/components/PublicFooter";
import {
  buildClaudeCodeMcpCliSnippet,
  buildClaudeDesktopMcpConfigSnippet,
  buildCursorMcpConfigSnippet,
  getMcpUserEndpointUrl,
} from "@/lib/mcp/public-config";
import { LandingI18nProvider, useI18n, type TranslationKey } from "@/lib/i18n";

function CopyCodeBlock({ code, label }: { code: string; label: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [code]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void onCopy()}
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/90 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        aria-label={label}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            {t("profileMcpCopied")}
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            {t("profileMcpCopyConfig")}
          </>
        )}
      </button>
      <pre className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 pr-28 text-xs leading-relaxed text-emerald-100 font-mono">
        {code}
      </pre>
    </div>
  );
}

interface SetupStep {
  number: number;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  screenshot: string;
  screenshotAltKey: TranslationKey;
  screenshotPlaceholderKey: TranslationKey;
  extra?: React.ReactNode;
}

function McpNavBar() {
  const { t } = useI18n();
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-[#faf9f7]/90 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/landing" className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
          ← {t("landingMcpBackHome")}
        </Link>
        <Link
          href="/docs/mcp"
          className="text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
        >
          {t("landingMcpDocsLink")}
        </Link>
      </div>
    </nav>
  );
}

function McpSetupContent() {
  const { t } = useI18n();
  const mcpUrl = getMcpUserEndpointUrl();
  const claudeCli = useMemo(() => buildClaudeCodeMcpCliSnippet(mcpUrl), [mcpUrl]);
  const cursorConfig = useMemo(() => buildCursorMcpConfigSnippet(mcpUrl), [mcpUrl]);
  const claudeDesktopConfig = useMemo(() => buildClaudeDesktopMcpConfigSnippet(mcpUrl), [mcpUrl]);

  const steps: SetupStep[] = [
    {
      number: 1,
      titleKey: "landingMcpStep1Title",
      bodyKey: "landingMcpStep1Body",
      screenshot: "/screenshots/mcp-step-1-developer.png",
      screenshotAltKey: "landingMcpStep1ScreenshotAlt",
      screenshotPlaceholderKey: "landingMcpStep1ScreenshotPlaceholder",
      extra: (
        <Link
          href="/profile?section=mcp"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
        >
          {t("landingMcpOpenDeveloper")}
        </Link>
      ),
    },
    {
      number: 2,
      titleKey: "landingMcpStep2Title",
      bodyKey: "landingMcpStep2Body",
      screenshot: "/screenshots/mcp-step-2-token.png",
      screenshotAltKey: "landingMcpStep2ScreenshotAlt",
      screenshotPlaceholderKey: "landingMcpStep2ScreenshotPlaceholder",
    },
    {
      number: 3,
      titleKey: "landingMcpStep3Title",
      bodyKey: "landingMcpStep3Body",
      screenshot: "/screenshots/mcp-step-3-claude-code.png",
      screenshotAltKey: "landingMcpStep3ScreenshotAlt",
      screenshotPlaceholderKey: "landingMcpStep3ScreenshotPlaceholder",
      extra: (
        <CopyCodeBlock code={claudeCli} label={t("landingMcpCopyClaudeCli")} />
      ),
    },
    {
      number: 4,
      titleKey: "landingMcpStep4Title",
      bodyKey: "landingMcpStep4Body",
      screenshot: "/screenshots/mcp-step-4-cursor.png",
      screenshotAltKey: "landingMcpStep4ScreenshotAlt",
      screenshotPlaceholderKey: "landingMcpStep4ScreenshotPlaceholder",
      extra: (
        <CopyCodeBlock code={cursorConfig} label={t("landingMcpCopyCursorConfig")} />
      ),
    },
    {
      number: 5,
      titleKey: "landingMcpStep5Title",
      bodyKey: "landingMcpStep5Body",
      screenshot: "/screenshots/mcp-step-5-verify.png",
      screenshotAltKey: "landingMcpStep5ScreenshotAlt",
      screenshotPlaceholderKey: "landingMcpStep5ScreenshotPlaceholder",
    },
  ];

  const tools = [
    t("landingMcpTool1"),
    t("landingMcpTool2"),
    t("landingMcpTool3"),
    t("landingMcpTool4"),
    t("landingMcpTool5"),
  ];

  return (
    <div className="min-h-screen bg-[#faf9f7] text-slate-800">
      <McpNavBar />

      <header className="border-b border-slate-200 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 ring-1 ring-sky-400/30">
              <Bot className="h-7 w-7 text-sky-300" aria-hidden="true" />
            </div>
            <div>
              <span className="mb-3 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                {t("landingMcpEyebrow")}
              </span>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {t("landingMcpHeading")}{" "}
                <span className="text-emerald-400">{t("landingMcpHeadingAccent")}</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                {t("landingMcpSubtitle")}
              </p>
            </div>
          </div>
          <div className="mt-10 overflow-hidden rounded-2xl border border-slate-700/80 shadow-2xl shadow-black/40">
            <Image
              src="/screenshots/mcp-claude-thinking-trefolio.png"
              alt={t("landingMcpHeroScreenshotAlt")}
              width={1280}
              height={883}
              className="h-auto w-full"
              priority
            />
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">{t("landingMcpHeroScreenshotCaption")}</p>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <section aria-labelledby="mcp-steps-heading" className="space-y-16">
          <div>
            <h2 id="mcp-steps-heading" className="text-2xl font-bold text-slate-900">
              {t("landingMcpStepsHeading")}
            </h2>
            <p className="mt-2 text-slate-500">{t("landingMcpStepsSubtitle")}</p>
          </div>

          <ol className="space-y-20">
            {steps.map((step) => (
              <li key={step.number} className="grid gap-8 lg:grid-cols-2 lg:items-start">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white"
                      aria-hidden="true"
                    >
                      {step.number}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900">{t(step.titleKey)}</h3>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{t(step.bodyKey)}</p>
                  {step.extra}
                </div>
                <McpSetupScreenshot
                  src={step.screenshot}
                  alt={t(step.screenshotAltKey)}
                  placeholderLabel={t(step.screenshotPlaceholderKey)}
                />
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="mcp-claude-desktop-heading">
          <h2 id="mcp-claude-desktop-heading" className="text-xl font-bold text-slate-900">
            {t("landingMcpClaudeDesktopTitle")}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{t("landingMcpClaudeDesktopBody")}</p>
          <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t("profileMcpClaudeConnectorWarning")}
          </p>
          <div className="mt-4">
            <CopyCodeBlock code={claudeDesktopConfig} label={t("landingMcpCopyClaudeDesktop")} />
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="mcp-tools-heading">
          <h2 id="mcp-tools-heading" className="text-xl font-bold text-slate-900">
            {t("landingMcpToolsHeading")}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{t("landingMcpToolsSubtitle")}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {tools.map((tool) => (
              <li key={tool} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                {tool}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-400">{t("landingMcpDisclaimer")}</p>
        </section>

        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
          >
            {t("landingHeroCtaSignup")}
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-8 py-3.5 text-base font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
          >
            {t("landingDevDocsCta")}
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

export default function McpLandingPage() {
  return (
    <LandingI18nProvider>
      <McpSetupContent />
    </LandingI18nProvider>
  );
}
