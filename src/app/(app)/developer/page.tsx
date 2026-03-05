"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  featureDomains,
  codePatterns,
  techStack,
  type FeatureDomain,
  type FeatureStatus,
  type ApiRoute,
} from "@/lib/feature-registry";

type Tab = "features" | "architecture" | "api" | "patterns";

const TAB_LABELS: Record<Tab, string> = {
  features: "Features",
  architecture: "Architecture",
  api: "API Routes",
  patterns: "Patterns",
};

/* ── Status badge ───────────────────────────────────────── */

function StatusBadge({ status }: { status: FeatureStatus }) {
  const cls =
    status === "stable"
      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
      : status === "beta"
        ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
        : "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${cls}`}>
      {status}
    </span>
  );
}

/* ── Auth badge ─────────────────────────────────────────── */

function AuthBadge({ auth }: { auth: ApiRoute["auth"] }) {
  const cls =
    auth === "public"
      ? "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
      : auth === "admin"
        ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
        : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400";
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      {auth}
    </span>
  );
}

/* ── Method badge ───────────────────────────────────────── */

function MethodBadge({ method }: { method: string }) {
  const cls =
    method === "GET"
      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
      : method === "POST"
        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        : method === "PUT"
          ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400";
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${cls}`}>
      {method}
    </span>
  );
}

/* ── Feature Card ───────────────────────────────────────── */

function FeatureCard({ domain }: { domain: FeatureDomain }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-0 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-5 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">{domain.name}</h3>
              <StatusBadge status={domain.status} />
              <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">v{domain.version}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">{domain.description}</p>
          </div>
          <svg
            className={`w-4 h-4 shrink-0 mt-1 text-gray-400 dark:text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Quick stats */}
        <div className="flex gap-4 mt-3">
          {domain.components.length > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-slate-500">
              {domain.components.length} component{domain.components.length !== 1 ? "s" : ""}
            </span>
          )}
          {domain.apiRoutes.length > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-slate-500">
              {domain.apiRoutes.length} route{domain.apiRoutes.length !== 1 ? "s" : ""}
            </span>
          )}
          {domain.libs.length > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-slate-500">
              {domain.libs.length} lib{domain.libs.length !== 1 ? "s" : ""}
            </span>
          )}
          {domain.tech.length > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-slate-500">
              {domain.tech.join(", ")}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-slate-700 p-5 space-y-5 bg-gray-50/50 dark:bg-slate-800/50">
          {/* Components */}
          {domain.components.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-2">Components</h4>
              <div className="space-y-1">
                {domain.components.map((c) => (
                  <div key={c.path} className="flex gap-2 text-xs">
                    <code className="text-indigo-600 dark:text-indigo-400 font-mono shrink-0">{c.path.split("/").pop()}</code>
                    <span className="text-gray-500 dark:text-slate-400">{c.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Routes */}
          {domain.apiRoutes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-2">API Routes</h4>
              <div className="space-y-1">
                {domain.apiRoutes.map((r) => (
                  <div key={`${r.method}-${r.path}`} className="flex items-center gap-2 text-xs">
                    <MethodBadge method={r.method} />
                    <code className="text-gray-700 dark:text-slate-300 font-mono">{r.path}</code>
                    <AuthBadge auth={r.auth} />
                    <span className="text-gray-400 dark:text-slate-500 hidden sm:inline">{r.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Libraries */}
          {domain.libs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-2">Libraries</h4>
              <div className="space-y-1">
                {domain.libs.map((l) => (
                  <div key={l.path} className="flex gap-2 text-xs">
                    <code className="text-indigo-600 dark:text-indigo-400 font-mono shrink-0">{l.path.split("/").pop()}</code>
                    <span className="text-gray-500 dark:text-slate-400">{l.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patterns */}
          {domain.patterns.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-2">Key Patterns</h4>
              <ul className="list-disc list-inside space-y-0.5">
                {domain.patterns.map((p, i) => (
                  <li key={i} className="text-xs text-gray-600 dark:text-slate-400">{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Skill file */}
          {domain.skillFile && (
            <p className="text-[10px] text-gray-400 dark:text-slate-500">
              Skill: <code className="font-mono">{domain.skillFile}</code>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Features Tab ───────────────────────────────────────── */

function FeaturesTab() {
  const [search, setSearch] = useState("");
  const filtered = featureDomains.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase()) ||
      d.tech.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search features, tech, descriptions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:w-80 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Feature Domains</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{featureDomains.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Components</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {featureDomains.reduce((s, d) => s + d.components.length, 0)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">API Routes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {featureDomains.reduce((s, d) => s + d.apiRoutes.length, 0)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Libraries</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {featureDomains.reduce((s, d) => s + d.libs.length, 0)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((d) => (
          <FeatureCard key={d.id} domain={d} />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-slate-400">No features match your search.</p>
        )}
      </div>
    </div>
  );
}

/* ── Architecture Tab ───────────────────────────────────── */

function ArchitectureTab() {
  return (
    <div className="space-y-8">
      {/* Tech Stack */}
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Tech Stack</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {techStack.map((group) => (
            <div key={group.category} className="card p-4">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-3">{group.category}</h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div key={item.name} className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                    {item.version && (
                      <code className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">{item.version}</code>
                    )}
                    <span className="text-xs text-gray-500 dark:text-slate-400">{item.notes}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Directory Structure */}
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Directory Structure</h2>
        <div className="card p-5">
          <pre className="text-xs text-gray-700 dark:text-slate-300 font-mono leading-relaxed whitespace-pre overflow-x-auto">{`src/
├── app/
│   ├── (app)/              # Auth-required routes (dashboard, tools, admin, etc.)
│   │   ├── page.tsx        # Dashboard (/)
│   │   ├── admin/          # Admin panel
│   │   ├── developer/      # This page
│   │   ├── tools/          # Portfolio tools
│   │   ├── profile/        # User profile
│   │   ├── stock/[ticker]/ # Stock detail + intelligence
│   │   └── economic-indicators/
│   ├── api/                # API route handlers
│   │   ├── auth/           # Login, signup, logout, profile
│   │   ├── admin/          # Admin-only endpoints
│   │   ├── billing/        # Stripe checkout, portal, webhook
│   │   ├── holdings/       # CRUD + batch import
│   │   ├── transactions/   # History + broker import
│   │   └── ...             # quotes, search, alerts, etc.
│   ├── landing/            # Public marketing page
│   ├── login/              # Login page
│   └── signup/             # Registration page
├── components/             # React components
│   ├── Dashboard.tsx       # Main portfolio layout
│   ├── PortfolioTable.tsx  # Holdings table
│   ├── AppNav.tsx          # Global navigation
│   └── ...                 # 30+ components
├── lib/
│   ├── auth/               # Session, guards, password
│   ├── api-providers/      # Yahoo, Alpha Vantage clients
│   ├── db/                 # Database access + seed
│   ├── auth-context.tsx    # Client auth state
│   ├── portfolio-context.tsx # Portfolio state
│   ├── i18n.tsx            # EN/ES translations
│   ├── feature-registry.ts # This page's data source
│   └── ...                 # utils, types, performance, etc.
└── middleware.ts            # Route protection`}</pre>
        </div>
      </div>

      {/* Data Flow */}
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Data Flow</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-3">Request Lifecycle</h3>
            <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 dark:text-slate-400">
              <li>Browser sends request to Next.js</li>
              <li><code className="font-mono text-indigo-600 dark:text-indigo-400">middleware.ts</code> checks JWT cookie</li>
              <li>API route calls <code className="font-mono text-indigo-600 dark:text-indigo-400">requireSession</code> or <code className="font-mono text-indigo-600 dark:text-indigo-400">requireAdmin</code></li>
              <li>Handler queries Turso DB or external APIs</li>
              <li>Response returned as JSON</li>
            </ol>
          </div>
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-3">Client State</h3>
            <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 dark:text-slate-400">
              <li><code className="font-mono text-indigo-600 dark:text-indigo-400">AuthContext</code> fetches <code className="font-mono">/api/auth/me</code> on mount</li>
              <li><code className="font-mono text-indigo-600 dark:text-indigo-400">PortfolioContext</code> fetches holdings + quotes</li>
              <li><code className="font-mono text-indigo-600 dark:text-indigo-400">I18nContext</code> loads saved language preference</li>
              <li>Components consume contexts via hooks</li>
              <li>Auto-refresh re-fetches quotes at configured interval</li>
            </ol>
          </div>
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-3">Market Data Flow</h3>
            <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 dark:text-slate-400">
              <li>Client requests quotes via <code className="font-mono">/api/quotes</code></li>
              <li>Server resolves provider (Yahoo default, AV for Pro)</li>
              <li>Provider client fetches from external API</li>
              <li>Prices normalized to EUR via <code className="font-mono">/api/exchange-rates</code></li>
              <li>Quotes cached in PortfolioContext until next refresh</li>
            </ol>
          </div>
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-3">Billing Flow</h3>
            <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 dark:text-slate-400">
              <li>User clicks upgrade, client calls <code className="font-mono">/api/billing/checkout</code></li>
              <li>Server creates Stripe Checkout session, returns URL</li>
              <li>User completes payment on Stripe-hosted page</li>
              <li>Stripe sends webhook to <code className="font-mono">/api/billing/webhook</code></li>
              <li>Webhook handler updates user plan in DB</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── API Routes Tab ─────────────────────────────────────── */

function ApiRoutesTab() {
  const [search, setSearch] = useState("");
  const [filterAuth, setFilterAuth] = useState<"all" | "public" | "session" | "admin">("all");
  const [filterMethod, setFilterMethod] = useState<"all" | "GET" | "POST" | "PUT" | "DELETE">("all");

  const allRoutes: (ApiRoute & { domain: string })[] = featureDomains.flatMap((d) =>
    d.apiRoutes.map((r) => ({ ...r, domain: d.name }))
  );

  const uniqueRoutes = allRoutes.filter(
    (r, i, arr) => arr.findIndex((x) => x.method === r.method && x.path === r.path) === i
  );

  const filtered = uniqueRoutes.filter((r) => {
    if (filterAuth !== "all" && r.auth !== filterAuth) return false;
    if (filterMethod !== "all" && r.method !== filterMethod) return false;
    if (search && !r.path.toLowerCase().includes(search.toLowerCase()) && !r.description.toLowerCase().includes(search.toLowerCase()) && !r.domain.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search routes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <div className="flex gap-1">
          {(["all", "GET", "POST", "PUT", "DELETE"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setFilterMethod(m)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterMethod === m
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
            >
              {m === "all" ? "All" : m}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "public", "session", "admin"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setFilterAuth(a)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterAuth === a
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
            >
              {a === "all" ? "All Auth" : a}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-slate-500">
        {filtered.length} of {uniqueRoutes.length} routes
      </p>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr className="text-gray-500 dark:text-slate-400">
                <th className="text-left p-3 font-medium w-16">Method</th>
                <th className="text-left p-3 font-medium">Path</th>
                <th className="text-left p-3 font-medium w-20">Auth</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Domain</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.method}-${r.path}`} className="border-t border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-200 align-top">
                  <td className="p-3"><MethodBadge method={r.method} /></td>
                  <td className="p-3 font-mono text-xs">{r.path}</td>
                  <td className="p-3"><AuthBadge auth={r.auth} /></td>
                  <td className="p-3 text-xs text-gray-500 dark:text-slate-400 hidden md:table-cell">{r.domain}</td>
                  <td className="p-3 text-xs text-gray-500 dark:text-slate-400 hidden lg:table-cell">{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Patterns Tab ───────────────────────────────────────── */

function PatternsTab() {
  return (
    <div className="space-y-4">
      {codePatterns.map((pattern) => (
        <div key={pattern.id} className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{pattern.name}</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{pattern.description}</p>
          <pre className="mt-3 p-3 rounded-lg bg-gray-900 dark:bg-slate-900 text-gray-100 text-xs font-mono leading-relaxed overflow-x-auto">
            {pattern.code}
          </pre>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pattern.usedIn.map((u) => (
              <span
                key={u}
                className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30"
              >
                {u}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────── */

function DeveloperContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("features");

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== "admin") {
    return (
      <main className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-500 dark:text-slate-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Developer</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Architecture reference for every feature domain in StockTracker.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-slate-700">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {tab === "features" ? (
          <FeaturesTab />
        ) : tab === "architecture" ? (
          <ArchitectureTab />
        ) : tab === "api" ? (
          <ApiRoutesTab />
        ) : (
          <PatternsTab />
        )}
      </div>
    </main>
  );
}

export default function DeveloperPage() {
  return <DeveloperContent />;
}
