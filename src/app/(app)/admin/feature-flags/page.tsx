"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useFeatureFlagContext } from "@/lib/feature-flag-context";

interface Override {
  id: string;
  flag: string;
  userId: string;
  username: string;
  enabled: boolean;
  createdAt: string;
}

interface UserOption {
  id: string;
  username: string;
  email: string;
}

const FLAG_META: Record<string, { label: string; description: string; group: string }> = {
  alerts_enabled: { label: "Price Alerts", description: "Price alert creation and management", group: "Features" },
  csv_export_enabled: { label: "CSV Export", description: "Portfolio data CSV exports for Pro users", group: "Features" },
  apple_signin_enabled: { label: "Sign in with Apple", description: "Apple OAuth on login and signup pages", group: "Features" },
  device_enabled: { label: "trefolio Leaf Device", description: "Hardware device linking, themes, and OTA", group: "Features" },
  mobile_app_enabled: { label: "Mobile App Promotion", description: "Native app section on landing page", group: "Features" },
  telegram_enabled: { label: "Telegram Notifications", description: "Telegram alert delivery for Pro users", group: "Features" },
  clover_assistant: {
    label: "Clover assistant",
    description: "Clover-first chat dock: orchestrates Warren (portfolio) and Clara (personal finance). When on, new users see only Clover; users who already used Warren also see a Warren chip.",
    group: "Features",
  },
  support_chat_enabled: { label: "AI Support Chat", description: "AI-powered support chat for users", group: "Features" },
  tool_transactions_enabled: { label: "Transactions", description: "Transaction history tool", group: "Tools" },
  tool_dividends_enabled: { label: "Dividends", description: "Dividend summary and projections tool", group: "Tools" },
  tool_performance_enabled: { label: "Performance", description: "TTWROR, XIRR, and performance charts tool", group: "Tools" },
  tool_taxonomy_enabled: { label: "Taxonomy", description: "Sector/region/asset class breakdown tool", group: "Tools" },
  tool_rebalancing_enabled: { label: "Rebalancing", description: "Allocation targets and drift analysis tool", group: "Tools" },
  tool_accounts_enabled: { label: "Accounts", description: "Multi-account management tool", group: "Tools" },
  tool_watchlist_enabled: { label: "Watchlist", description: "Stock watchlist tracking tool", group: "Tools" },
  pro_trial_enabled: { label: "7-Day Pro Trial", description: "Card-free Pro trial invitations, activation, and dashboard countdown", group: "Features" },
  ai_report_enabled: { label: "AI Portfolio Report", description: "AI-generated portfolio score, detailed analysis page, and streaming review", group: "Features" },
  portfolio_v2_chart_enabled: { label: "Portfolio V2 Chart", description: "New portfolio value/performance chart with market sessions, buy/sell dots, benchmarks, and backfill CTA on the homepage", group: "Features" },
  social_network_enabled: { label: "Social Network", description: "Public profiles, posts, connections, feed, people search, and in-app conversations", group: "Features" },
  weekly_digest_enabled: {
    label: "Weekly Portfolio Digest",
    description: "AI weekly digest card on the home dashboard and Monday digest emails (Pro). When off, the card is hidden and the cron does not generate or send digests.",
    group: "Features",
  },
  weekly_digest_free_tier_enabled: {
    label: "Weekly digest — free tier",
    description: "Extends the weekly digest email to free-plan users (normally Pro-only). Off by default; the existing Pro digest is unaffected either way.",
    group: "Features",
  },
  lifecycle_activation_email_enabled: {
    label: "Lifecycle: activation email",
    description: "Sends the welcome-no-stocks email to users with 0 holdings ~48h after signup. On by default.",
    group: "Features",
  },
  lifecycle_winback_email_enabled: {
    label: "Lifecycle: win-back email",
    description: "Sends a re-engagement email to users inactive for 14+ days. Off by default.",
    group: "Features",
  },
  daily_digests_enabled: {
    label: "Daily digests",
    description: "Market daily digests at /daily-digests, nav entry, and home teaser card. Off by default while unused.",
    group: "Features",
  },
  aid_beta: {
    label: "Investor Briefing (AID beta)",
    description: "Beta briefing at /aid and home CTA when enabled. Portfolio pulse, FinPulse, scannable news, and Warren / Will / Clara column.",
    group: "Features",
  },
  home_v2: {
    label: "Home (unified daily homepage)",
    description: "Default authenticated home at /. Morning brief, movers, catalysts, day highlights, and Claude MCP CTA. On by default — disable only to turn off home APIs for a user.",
    group: "Features",
  },
  classic_home: {
    label: "Classic dashboard",
    description: "Opt-in legacy dashboard at /classic (tabs, Market & Cash layout). Shows a Classic CTA on the new home when enabled.",
    group: "Features",
  },
  commerce_enabled: {
    label: "Subscriptions & commerce",
    description: "Pricing, upsell cards, checkout CTAs, and new Stripe checkout on trefolio",
    group: "Features",
  },
  tool_tax_reports_enabled: {
    label: "Tax Reports",
    description: "Tax reports tool at /tools/tax. Off by default until the real lot engine is validated — never show fabricated fiscal numbers.",
    group: "Tools",
  },
  tool_simulator_enabled: {
    label: "Portfolio Simulator",
    description: "Backtesting / what-if simulator at /tools/simulator. Off by default while the tool is incomplete.",
    group: "Tools",
  },
  tool_planning_enabled: {
    label: "Financial Planning",
    description: "FIRE / multi-goal planner at /tools/planning. Off by default while the tool is incomplete.",
    group: "Tools",
  },
  investment_screening_enabled: {
    label: "Investment screening (E0 mock)",
    description:
      "Screening flow at /screening: sector exposure entry, intake chat, brief, run progress, and HTML report. Stage E0 — the report comes from a typed fixture, no agents or market data yet. Off by default.",
    group: "Features",
  },
  real_estate_screening_enabled: {
    label: "Real-estate zone screening (Portugal)",
    description:
      "Zone screening at /real-estate/screening: INE catalogue, user-selected budget/mortgage params, async report. Off by default. Portal scraping is stubbed until the ADR is approved.",
    group: "Features",
  },
  screening_new_runs_enabled: {
    label: "Screening: new runs",
    description:
      "Client mirror of the provider-quota circuit. When off, discovery CTAs hide and new screens cannot start; existing reports stay readable. Auto-tripped on FMP/Tavily/Serper/Jina/OpenAI quota. Resume from Admin → Screening Costs, not by toggling this alone.",
    group: "Features",
  },
  screening_dev_lab_enabled: {
    label: "Screening Dev log",
    description:
      "Floating Dev button on /screening/intake showing raw Intake agent outputs (JSON + latency). Admins and dev-mode users always see it; this flag opens it for a specific non-admin user. Off by default.",
    group: "Features",
  },
  screening_pipeline_real_enabled: {
    label: "Screening pipeline: real agents (Hard Data + Compiler)",
    description:
      "Switches POST /api/screening/runs from the mock pipeline to the event-driven orchestrator. Hard Data agent screens FMP live and Compiler agent writes the executive summary. Report skeleton is real; IR/Web/Risk/QA agents come later. Off by default — enable only for admins first.",
    group: "Features",
  },
  screening_ir_agent_enabled: {
    label: "Screening Agent 2: IR / Business",
    description:
      "After Hard Data, fan out one IR/Business step per ticker (FMP transcript/news/insider + LLM). Requires screening_pipeline_real_enabled. Off by default.",
    group: "Features",
  },
  screening_agents_v2_enabled: {
    label: "Screening agents E5–E7 (Web, Portfolio Context, Risk)",
    description:
      "Umbrella flag: after Hard Data, also fan out Web & Sentiment (FMP + Tavily), then Portfolio Context and Risk & Suitability before the Compiler. Implies IR fan-out for pipeline coherence. Requires screening_pipeline_real_enabled. Off by default.",
    group: "Features",
  },
  screening_qa_enabled: {
    label: "Screening Agent 6: QA / Verified reports",
    description:
      "After the Compiler, run the QA agent to verify report claims against the raw agent outputs (deterministic R1/R2/R4/R5/R9/R10 + LLM R3/R6/R7/R8). Gates reportReady on pass; on fail retries flagged agents up to 2 rounds, then degrades stubborn tickers. Requires screening_pipeline_real_enabled. Off by default.",
    group: "Features",
  },
  screening_tavily_research_enabled: {
    label: "Screening: Tavily IR docs + Research",
    description:
      "IR agent: Tavily Search+Extract for official IR pages and recent HTML/PDF docs (primary unless Serper/Jina is on). Live Tavily Research is cache-only (no new PAYG Research calls); cache hits still feed IR fallback and shortlist deep-dive. Also slim Web Search (skip analyst Search when research is cached). Accrues Search/Extract credits into per-report variable cost. Requires screening_pipeline_real_enabled. Off by default.",
    group: "Features",
  },
  screening_ir_serper_jina_enabled: {
    label: "Screening IR: Serper + Jina (prototype)",
    description:
      "IR document discovery/extract tries Serper Search + Jina EU Reader first (HTML and PDF), then falls back to Tavily Search/Extract per miss. Requires SERPER_API_KEY and JINA_API_KEY. Web & Sentiment, AID, and /analisis stay on Tavily. Off by default.",
    group: "Features",
  },
  screening_analyze_force_serper_jina_enabled: {
    label: "Screening Analyze: force Serper + Jina",
    description:
      "Analyze runs use Serper Search + Jina EU extract for IR docs only — no Tavily Search/Extract fallback, even if Serper scores poorly or Jina misses a URL. Requires SERPER_API_KEY and JINA_API_KEY. Explore/shortlist keep the prototype fallback. Off by default.",
    group: "Features",
  },
  screening_estebaranz_eval_enabled: {
    label: "Screening: trefolio framework evaluation",
    description:
      "After Compiler (and optional shortlist research), run compiler_evaluate to apply the trefolio value-investing checklist to each shortlisted company. Structured card sections + grounded “data not available” rules. Requires screening_pipeline_real_enabled. On by default.",
    group: "Features",
  },
  screening_thesis_pipeline_enabled: {
    label: "Screening: thesis pipeline (bake-off)",
    description:
      "Shows a Cribado vs Tesis toggle on /screening. Tesis runs a parallel agent DAG that emits falsifiable thesis drafts (facts, gates, kill criteria). On by default. Requires screening_pipeline_real_enabled. Informational only — not investment advice.",
    group: "Features",
  },
  portfolio_anomaly_agent: {
    label: "Portfolio anomaly agent",
    description:
      "Daily cron scans users with ≥1 holding for data anomalies (FX, ledger mismatch, stale value_in_eur, etc.), LLM-explains findings for staff, and notifies ProdOps Telegram. Off by default.",
    group: "Features",
  },
  display_invariants: {
    label: "Display value invariants",
    description:
      "Sampled production check that home totals stay internally consistent (P/L identity, day-change %, invested+cash, sleeves). Logs invariant codes only — no amounts. Off by default.",
    group: "Features",
  },
  theme_studio_enabled: {
    label: "Studio dashboard theme",
    description:
      "Show the Studio layout theme in Settings (sidebar + glass). Code stays in the app; when off, Studio is hidden and users on Studio fall back to Default. Off by default.",
    group: "Features",
  },
  import_broker_picker_enabled: {
    label: "Import broker picker",
    description:
      "Broker Sync shows our broker grid with logos and search (SnapTrade deep-link + Trade Republic CSV). Off by default for beta via per-user overrides.",
    group: "Features",
  },
  jobs_nav: {
    label: "Jobs navigation (Add / Review / Discover)",
    description:
      "Replaces command-strip quick links with a goal switcher (Add / Review / Discover) and contextual chips. Off by default — enable for admins first. Studio theme unchanged.",
    group: "Features",
  },
  market_data_fmp_search: { label: "FMP: symbol search (moat picker)", description: "Use Financial Modeling Prep for premium symbol search instead of Alpha Vantage", group: "Market data (FMP)" },
  market_data_fmp_fundamentals: { label: "FMP: fundamentals & moat sync", description: "Stock evaluation / moat cron fundamentals from FMP", group: "Market data (FMP)" },
  market_data_fmp_intelligence: { label: "FMP: intelligence tab", description: "News, insider, institutional, transcripts via FMP", group: "Market data (FMP)" },
  market_data_fmp_portfolio_news: { label: "FMP: portfolio news", description: "Portfolio-level news sentiment via FMP", group: "Market data (FMP)" },
  market_data_fmp_economic_indicators: { label: "FMP: economic indicators", description: "US macro series via FMP", group: "Market data (FMP)" },
  market_data_fmp_crypto: { label: "FMP: Pro crypto history & FX", description: "Crypto OHLC and cross-rates via FMP", group: "Market data (FMP)" },
  market_data_fmp_dividends: { label: "FMP: ex-dividend fallback", description: "When Yahoo has no dividend dates, use FMP dividend calendar", group: "Market data (FMP)" },
  market_data_fmp_event_sync: { label: "FMP: earnings calendar cron", description: "Event-sync cron uses FMP-only for earnings (skip AV CSV)", group: "Market data (FMP)" },
  mcp_fmp_proxy: {
    label: "FMP: MCP proxy",
    description:
      "Expose Financial Modeling Prep stable API via MCP tools fmpRequest / listFmpEndpoints (Pro + market:fmp PAT scope; rate limited). On by default.",
    group: "Market data (FMP)",
  },
  market_data_alpha_vantage: {
    label: "Alpha Vantage: allow fallback",
    description:
      "When on, premium data can fall back to Alpha Vantage if FMP is unavailable or a surface flag is off. When off, only FMP is used (set FMP_API_KEY); AV is never called — safe before removing the integration.",
    group: "Market data (FMP)",
  },
};

const GROUP_DISPLAY_ORDER = ["Features", "Tools", "Market data (FMP)"] as const;

function orderedFlagGroups(
  meta: typeof FLAG_META,
): string[] {
  const present = new Set(Object.values(meta).map((m) => m.group));
  const ordered: string[] = [];
  for (const g of GROUP_DISPLAY_ORDER) {
    if (present.has(g)) ordered.push(g);
  }
  for (const g of [...present].sort()) {
    if (!ordered.includes(g)) ordered.push(g);
  }
  return ordered;
}

function sectionIdForGroup(group: string): string {
  return `feature-flags-${group
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

export default function FeatureFlagsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { refreshFlags } = useFeatureFlagContext();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [overrideCounts, setOverrideCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [addUserId, setAddUserId] = useState("");
  const [addEnabled, setAddEnabled] = useState(true);
  const [addSaving, setAddSaving] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  const loadFlags = useCallback(() => {
    fetch("/api/admin/feature-flags", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setFlags(data.flags ?? {});
        setOverrideCounts(data.overrideCounts ?? {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadFlags(); }, [loadFlags]);

  useEffect(() => {
    fetch("/api/admin/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setUsers((data.users ?? []).map((u: { id: string; username: string; email?: string }) => ({
        id: u.id, username: u.username, email: u.email || "",
      }))))
      .catch(() => {});
  }, []);

  const handleToggle = async (flag: string, enabled: boolean) => {
    setSaving(flag);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag, enabled }),
      });
      if (res.ok) {
        setFlags((prev) => ({ ...prev, [flag]: enabled }));
        refreshFlags();
        loadFlags();
      } else {
        const body = await res.json().catch(() => ({}));
        setSaveError(
          typeof body.error === "string"
            ? body.error
            : `Could not save ${flag} (${res.status}).`,
        );
      }
    } catch {
      setSaveError(`Could not save ${flag}.`);
    }
    setSaving(null);
  };

  const loadOverrides = useCallback(async (flag: string) => {
    setOverridesLoading(true);
    try {
      const res = await fetch(`/api/admin/feature-flags/overrides?flag=${flag}`, { cache: "no-store" });
      const data = await res.json();
      setOverrides(data.overrides ?? []);
    } catch { setOverrides([]); }
    setOverridesLoading(false);
  }, []);

  const handleExpand = (flag: string) => {
    if (expandedFlag === flag) {
      setExpandedFlag(null);
      setOverrides([]);
      return;
    }
    setExpandedFlag(flag);
    setAddUserId("");
    setAddEnabled(true);
    loadOverrides(flag);
  };

  const handleAddOverride = async () => {
    if (!expandedFlag || !addUserId) return;
    setAddSaving(true);
    try {
      const res = await fetch("/api/admin/feature-flags/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag: expandedFlag, userId: addUserId, enabled: addEnabled }),
      });
      if (res.ok) {
        await loadOverrides(expandedFlag);
        setOverrideCounts((prev) => ({
          ...prev,
          [expandedFlag]: (prev[expandedFlag] || 0) + (overrides.some((o) => o.userId === addUserId) ? 0 : 1),
        }));
        setAddUserId("");
        setAddEnabled(true);
        refreshFlags();
      }
    } catch { /* keep state */ }
    setAddSaving(false);
  };

  const handleRemoveOverride = async (flag: string, userId: string) => {
    try {
      const res = await fetch("/api/admin/feature-flags/overrides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag, userId }),
      });
      if (res.ok) {
        setOverrides((prev) => prev.filter((o) => !(o.flag === flag && o.userId === userId)));
        setOverrideCounts((prev) => ({
          ...prev,
          [flag]: Math.max(0, (prev[flag] || 0) - 1),
        }));
        refreshFlags();
      }
    } catch { /* keep state */ }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-4 w-48 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const filteredUsers = userSearch.length >= 1
    ? users.filter((u) =>
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  const groups = orderedFlagGroups(FLAG_META);

  return (
    <div className="space-y-6">
      <div className="scroll-mt-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Feature flags</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 mb-0">
          <span className="text-gray-600 dark:text-slate-300">Jump to:</span>{" "}
          {groups.map((group, i) => (
            <span key={group}>
              {i > 0 ? " · " : null}
              <a
                href={`#${sectionIdForGroup(group)}`}
                className="text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2"
              >
                {group}
              </a>
            </span>
          ))}
        </p>
      </div>
      {saveError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {saveError}
        </p>
      )}
      {groups.map((group) => {
        const groupFlags = Object.entries(FLAG_META).filter(([, m]) => m.group === group);
        return (
          <div
            key={group}
            id={sectionIdForGroup(group)}
            className="card p-6 scroll-mt-20"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{group}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              {group === "Features"
                ? "Enable or disable user-facing features globally, with optional per-user overrides."
                : group === "Tools"
                  ? "Show or hide individual tools on the Tools page."
                  : "FMP per-surface rollout and Alpha Vantage fallback: disable “Alpha Vantage: allow fallback” for FMP-only (requires FMP_API_KEY). When fallback is on, AV is used if a surface FMP flag is off. Per-user overrides apply; the earnings calendar cron flag is global-only."}
            </p>
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {groupFlags.map(([flag, meta]) => {
                const enabled = flags[flag] ?? false;
                const count = overrideCounts[flag] || 0;
                const isExpanded = expandedFlag === flag;

                return (
                  <div key={flag} className="py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{meta.label}</p>
                          {count > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                              {count} override{count !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{meta.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleExpand(flag)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors px-2 py-1"
                          title="Manage per-user overrides"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          disabled={saving === flag}
                          onClick={() => handleToggle(flag, !enabled)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            enabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"
                          } ${saving === flag ? "opacity-50 cursor-wait" : ""}`}
                          role="switch"
                          aria-checked={enabled}
                          aria-label={`Toggle ${meta.label}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 ml-0 p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                        <h4 className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-3">
                          Per-User Overrides
                          <span className="ml-1 font-normal text-gray-500 dark:text-slate-400">
                            (override the global {enabled ? "enabled" : "disabled"} state for specific users)
                          </span>
                        </h4>

                        {overridesLoading ? (
                          <div className="h-8 w-full bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
                        ) : overrides.length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">No per-user overrides configured.</p>
                        ) : (
                          <div className="space-y-2 mb-3">
                            {overrides.map((o) => (
                              <div key={o.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs font-medium text-gray-900 dark:text-white truncate">{o.username}</span>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    o.enabled
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                  }`}>
                                    {o.enabled ? "Enabled" : "Disabled"}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOverride(o.flag, o.userId)}
                                  className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors px-1"
                                  title="Remove override"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-end gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                          <div className="flex-1 relative">
                            <label className="block text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                              User
                            </label>
                            <input
                              type="text"
                              placeholder="Search by username or email..."
                              value={userSearch}
                              onChange={(e) => {
                                setUserSearch(e.target.value);
                                setAddUserId("");
                              }}
                              className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            {filteredUsers.length > 0 && !addUserId && (
                              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {filteredUsers.map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => {
                                      setAddUserId(u.id);
                                      setUserSearch(u.username);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                  >
                                    <span className="font-medium text-gray-900 dark:text-white">{u.username}</span>
                                    {u.email && (
                                      <span className="ml-2 text-gray-400 dark:text-slate-500">{u.email}</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="w-28">
                            <label className="block text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                              State
                            </label>
                            <select
                              value={addEnabled ? "enabled" : "disabled"}
                              onChange={(e) => setAddEnabled(e.target.value === "enabled")}
                              className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="enabled">Enabled</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            disabled={!addUserId || addSaving}
                            onClick={handleAddOverride}
                            className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addSaving ? "Saving..." : "Add"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
