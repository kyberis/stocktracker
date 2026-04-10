"use client";

import React, { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Holding, Transaction, CashEntry, Account } from "@/lib/types";
import type { UserPortfolio, ImportEvent } from "../../shared";
import { relativeTime, formatEur } from "../../shared";
import AdminPortfolioCharts from "./admin-portfolio-chart";

interface UserInfo {
  id: string;
  username: string;
  role: "admin" | "user";
  plan: "free" | "starter" | "pro";
  email: string;
  displayName: string;
  authProvider: "credentials" | "google" | "apple";
  emailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastActiveAt: string;
  planExpiresAt: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  taxResidency: string;
  onboardingCompleted: boolean;
  aiCallsThisMonth: number;
  experienceLevel: string;
  language: string;
  trialInvitedAt: string;
  trialActivatedAt: string;
  trialToken: string;
  trialExpiredNotified: boolean;
}

interface AllPortfolio {
  id: string;
  name: string;
  currency: string;
  isDefault: boolean;
}

interface ChecklistStepInfo {
  step: string;
  completedAt: string | null;
}

interface ChecklistInfo {
  steps: ChecklistStepInfo[];
  dismissed: boolean;
}

interface PageData {
  user: UserInfo;
  portfolios: UserPortfolio[];
  importEvents: ImportEvent[];
  holdings: Holding[];
  transactions: Transaction[];
  cash: CashEntry[];
  accounts: Account[];
  allPortfolios: AllPortfolio[];
  checklist: ChecklistInfo;
}

type DataTab = "holdings" | "transactions" | "cash";

/* ── Badge helpers ──────────────────────────────────────────── */

function AuthBadge({ provider }: { provider: string }) {
  if (provider === "google")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400">G Google</span>;
  if (provider === "apple")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/5 text-slate-300"> Apple</span>;
  return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400">Credentials</span>;
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "pro") return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500">Trefolio</span>;
  if (plan === "starter") return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400">Bifolio</span>;
  return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400">Folio</span>;
}

/* ── Data table sub-components ──────────────────────────────── */

function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  if (holdings.length === 0) return <p className="text-xs text-gray-400 dark:text-slate-500 py-4 text-center">No holdings</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
            <th className="text-left p-2 font-medium text-[10px] uppercase">Ticker</th>
            <th className="text-left p-2 font-medium text-[10px] uppercase">Name</th>
            <th className="text-left p-2 font-medium text-[10px] uppercase">ISIN</th>
            <th className="text-left p-2 font-medium text-[10px] uppercase">Type</th>
            <th className="text-right p-2 font-medium text-[10px] uppercase">Shares</th>
            <th className="text-right p-2 font-medium text-[10px] uppercase">Avg Price</th>
            <th className="text-left p-2 font-medium text-[10px] uppercase">Currency</th>
            <th className="text-left p-2 font-medium text-[10px] uppercase">Exchange</th>
            <th className="text-right p-2 font-medium text-[10px] uppercase">Value (EUR)</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/30">
              <td className="p-2 font-mono font-semibold text-gray-900 dark:text-white">{h.ticker}</td>
              <td className="p-2 text-gray-700 dark:text-slate-300 max-w-[200px] truncate">{h.name || "—"}</td>
              <td className="p-2 font-mono text-gray-500 dark:text-slate-400 text-[11px]">{h.isin || "—"}</td>
              <td className="p-2">
                {h.assetType && h.assetType !== "stock" ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-500">{h.assetType}</span>
                ) : (
                  <span className="text-gray-400 dark:text-slate-500">stock</span>
                )}
              </td>
              <td className="p-2 text-right tabular-nums font-medium">{h.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
              <td className="p-2 text-right tabular-nums">{h.purchasePrice > 0 ? h.purchasePrice.toFixed(2) : "—"}</td>
              <td className="p-2">{h.displayCurrency || "—"}</td>
              <td className="p-2">{h.exchange || "—"}</td>
              <td className="p-2 text-right tabular-nums text-emerald-500 font-medium">{h.valueInEUR > 0 ? formatEur(h.valueInEUR) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) return <p className="text-xs text-gray-400 dark:text-slate-500 py-4 text-center">No transactions</p>;

  const [visibleCount, setVisibleCount] = useState(100);
  const visible = transactions.slice(0, visibleCount);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
              <th className="text-left p-2 font-medium text-[10px] uppercase">Date</th>
              <th className="text-left p-2 font-medium text-[10px] uppercase">Type</th>
              <th className="text-left p-2 font-medium text-[10px] uppercase">Ticker</th>
              <th className="text-left p-2 font-medium text-[10px] uppercase">Name</th>
              <th className="text-right p-2 font-medium text-[10px] uppercase">Shares</th>
              <th className="text-right p-2 font-medium text-[10px] uppercase">Price</th>
              <th className="text-right p-2 font-medium text-[10px] uppercase">Total</th>
              <th className="text-right p-2 font-medium text-[10px] uppercase">Fees</th>
              <th className="text-left p-2 font-medium text-[10px] uppercase">Currency</th>
              <th className="text-left p-2 font-medium text-[10px] uppercase">Broker</th>
              <th className="text-left p-2 font-medium text-[10px] uppercase">Source</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr key={t.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/30">
                <td className="p-2 tabular-nums whitespace-nowrap">{t.date}</td>
                <td className="p-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    t.type === "buy" ? "bg-emerald-500/10 text-emerald-500" :
                    t.type === "sell" ? "bg-red-500/10 text-red-400" :
                    t.type === "dividend" ? "bg-blue-500/10 text-blue-400" :
                    "bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400"
                  }`}>{t.type}</span>
                </td>
                <td className="p-2 font-mono font-semibold text-gray-900 dark:text-white">{t.ticker}</td>
                <td className="p-2 text-gray-700 dark:text-slate-300 max-w-[150px] truncate">{t.name || "—"}</td>
                <td className="p-2 text-right tabular-nums">{t.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                <td className="p-2 text-right tabular-nums">{t.pricePerShare > 0 ? t.pricePerShare.toFixed(2) : "—"}</td>
                <td className="p-2 text-right tabular-nums font-medium">{t.totalAmount > 0 ? t.totalAmount.toFixed(2) : "—"}</td>
                <td className="p-2 text-right tabular-nums text-gray-400">{t.fees > 0 ? t.fees.toFixed(2) : "—"}</td>
                <td className="p-2">{t.currency || "—"}</td>
                <td className="p-2">{t.brokerName || "—"}</td>
                <td className="p-2 text-gray-400 dark:text-slate-500 text-[11px]">{t.sourceRef || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visibleCount < transactions.length && (
        <div className="text-center pb-2">
          <button
            onClick={() => setVisibleCount((c) => c + 200)}
            className="text-xs text-indigo-500 hover:text-indigo-400 font-medium"
          >
            Show more ({transactions.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

function CashTable({ cash }: { cash: CashEntry[] }) {
  if (cash.length === 0) return <p className="text-xs text-gray-400 dark:text-slate-500 py-4 text-center">No cash / manual assets</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
            <th className="text-left p-2 font-medium text-[10px] uppercase">Name</th>
            <th className="text-left p-2 font-medium text-[10px] uppercase">Type</th>
            <th className="text-left p-2 font-medium text-[10px] uppercase">Source</th>
            <th className="text-right p-2 font-medium text-[10px] uppercase">Amount</th>
            <th className="text-left p-2 font-medium text-[10px] uppercase">Currency</th>
            <th className="text-right p-2 font-medium text-[10px] uppercase">EUR Value</th>
            <th className="text-left p-2 font-medium text-[10px] uppercase">Notes</th>
          </tr>
        </thead>
        <tbody>
          {cash.map((c) => (
            <tr key={c.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/30">
              <td className="p-2 font-medium text-gray-900 dark:text-white">{c.name}</td>
              <td className="p-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  c.type === "cash" ? "bg-emerald-500/10 text-emerald-500" :
                  c.type === "real_estate" ? "bg-amber-500/10 text-amber-500" :
                  c.type === "savings" ? "bg-blue-500/10 text-blue-400" :
                  "bg-purple-500/10 text-purple-400"
                }`}>{c.type || "cash"}</span>
              </td>
              <td className="p-2 text-gray-500 dark:text-slate-400">{c.source || "manual"}</td>
              <td className="p-2 text-right tabular-nums font-medium">{c.displayAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "—"}</td>
              <td className="p-2">{c.displayCurrency || "EUR"}</td>
              <td className="p-2 text-right tabular-nums text-emerald-500 font-medium">{formatEur(c.amountEUR)}</td>
              <td className="p-2 text-gray-400 dark:text-slate-500 max-w-[200px] truncate">{c.notes || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Email Status Badge ──────────────────────────────────────── */

function EmailStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    sent: "bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400",
    delivered: "bg-emerald-500/10 text-emerald-500",
    opened: "bg-sky-500/10 text-sky-400",
    clicked: "bg-violet-500/10 text-violet-400",
    bounced: "bg-red-500/10 text-red-400",
    failed: "bg-red-500/10 text-red-400",
    suppressed: "bg-amber-500/10 text-amber-400",
  };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${styles[status] || styles.sent}`}>
      {status}
    </span>
  );
}

/* ── Send Email Section ──────────────────────────────────────── */

interface EmailSendRecord {
  id: string;
  subject: string;
  status: string;
  sentAt: string;
  openedAt: string;
  openCount: number;
  clickedAt: string;
}

interface TemplateOption {
  id: string;
  name: string;
  slug: string;
  subject: string;
  subjectEs: string;
  bodyHtml: string;
  bodyHtmlEs: string;
  bodyText: string;
  bodyTextEs: string;
}

const LOCALE_LABELS: Record<string, string> = {
  en: "English", es: "Español", fr: "Français", de: "Deutsch", it: "Italiano",
  pt: "Português", nl: "Nederlands", pl: "Polski", cs: "Čeština", sk: "Slovenčina",
  hu: "Magyar", ro: "Română", bg: "Български", hr: "Hrvatski", sl: "Slovenščina",
  el: "Ελληνικά", sv: "Svenska", da: "Dansk", fi: "Suomi", et: "Eesti",
  lv: "Latviešu", lt: "Lietuvių", ga: "Gaeilge", mt: "Malti", nb: "Norsk bokmål",
  uk: "Українська", tr: "Türkçe", sr: "Српски", is: "Íslenska", sq: "Shqip",
  bs: "Bosanski", mk: "Македонски", be: "Беларуская", ca: "Català", cy: "Cymraeg",
};
const ALL_LOCALES = Object.keys(LOCALE_LABELS);

function SendEmailSection({ userId, userEmail, userLanguage }: { userId: string; userEmail: string; userLanguage: string }) {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [sends, setSends] = useState<EmailSendRecord[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [locale, setLocale] = useState(userLanguage || "en");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  const fetchData = useCallback(async () => {
    const [tRes, sRes] = await Promise.all([
      fetch("/api/admin/email-templates"),
      fetch(`/api/admin/email-sends?userId=${encodeURIComponent(userId)}`),
    ]);
    if (tRes.ok) setTemplates(await tRes.json());
    if (sRes.ok) setSends(await sRes.json());
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchLocalePreview = useCallback(async (templateId: string, loc: string) => {
    if (!templateId) return;
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/admin/email-templates/preview?templateId=${encodeURIComponent(templateId)}&locale=${encodeURIComponent(loc)}&userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setSubject(data.subject);
        setBodyHtml(data.bodyHtml);
      }
    } catch { /* ignore */ }
    setLoadingPreview(false);
  }, [userId]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (!templateId) { setSubject(""); setBodyHtml(""); setBodyText(""); return; }
    fetchLocalePreview(templateId, locale);
  };

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale);
    if (selectedTemplate) {
      fetchLocalePreview(selectedTemplate, newLocale);
    }
  };

  useEffect(() => {
    if (previewRef.current && bodyHtml) {
      const doc = previewRef.current.contentDocument;
      if (doc) { doc.open(); doc.write(bodyHtml); doc.close(); }
    }
  }, [bodyHtml]);

  const handleSend = async () => {
    if (!subject || !bodyHtml) return;
    setSending(true);
    setSendMsg("");
    try {
      const res = await fetch("/api/admin/email-templates/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate || undefined,
          userId,
          locale,
          subject,
          bodyHtml,
          bodyText: bodyText || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendMsg("Sent!");
        setShowCompose(false);
        setSubject(""); setBodyHtml(""); setBodyText(""); setSelectedTemplate("");
        fetchData();
      } else {
        setSendMsg(data.error || "Send failed");
      }
    } catch {
      setSendMsg("Send failed");
    }
    setSending(false);
    setTimeout(() => setSendMsg(""), 4000);
  };

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
          Email ({userEmail || "no email"})
        </h3>
        <div className="flex items-center gap-2">
          {sendMsg && <span className={`text-xs font-medium ${sendMsg === "Sent!" ? "text-emerald-500" : "text-red-400"}`}>{sendMsg}</span>}
          <button onClick={() => setShowCompose(!showCompose)} className="px-3 py-1 text-xs font-medium text-indigo-500 hover:text-indigo-400 border border-indigo-500/30 rounded-lg">
            {showCompose ? "Cancel" : "Compose Email"}
          </button>
        </div>
      </div>

      {showCompose && (
        <div className="space-y-3 border-t border-gray-100 dark:border-slate-700 pt-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-gray-500 dark:text-slate-400 mb-1">Template</label>
              <select value={selectedTemplate} onChange={(e) => handleTemplateSelect(e.target.value)} className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                <option value="">No template (custom)</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="w-48">
              <label className="block text-[10px] font-medium text-gray-500 dark:text-slate-400 mb-1">
                Locale {locale === userLanguage && <span className="text-emerald-500">(user default)</span>}
              </label>
              <select value={locale} onChange={(e) => handleLocaleChange(e.target.value)} className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                {ALL_LOCALES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc.toUpperCase()} — {LOCALE_LABELS[loc]}{loc === userLanguage ? " *" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 dark:text-slate-400 mb-1">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-slate-400 mb-1">HTML Body</label>
              <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} rows={10} className="w-full text-[11px] font-mono px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-y" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 dark:text-slate-400 mb-1">
                Preview
                {loadingPreview && <span className="text-indigo-400 animate-pulse">Loading...</span>}
              </div>
              <iframe ref={previewRef} className="w-full h-[240px] rounded-lg border border-gray-200 dark:border-slate-600 bg-white" sandbox="allow-same-origin" title="Email preview" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 dark:text-slate-500">
              Sending as <strong>{LOCALE_LABELS[locale]}</strong> to {userEmail}
            </span>
            <button onClick={handleSend} disabled={sending || !subject || !bodyHtml} className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-50">
              {sending ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>
      )}

      {/* Email History */}
      {sends.length > 0 && (
        <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">Email History</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 dark:text-slate-400">
                  <th className="text-left pb-1 font-medium text-[10px] uppercase">Subject</th>
                  <th className="text-left pb-1 font-medium text-[10px] uppercase">Status</th>
                  <th className="text-left pb-1 font-medium text-[10px] uppercase">Sent</th>
                  <th className="text-right pb-1 font-medium text-[10px] uppercase">Opens</th>
                  <th className="text-left pb-1 font-medium text-[10px] uppercase">Clicked</th>
                </tr>
              </thead>
              <tbody>
                {sends.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100 dark:border-slate-700/50">
                    <td className="py-1.5 font-medium text-gray-900 dark:text-white max-w-[200px] truncate">{s.subject}</td>
                    <td className="py-1.5"><EmailStatusBadge status={s.status} /></td>
                    <td className="py-1.5 text-gray-400 dark:text-slate-500">{new Date(s.sentAt).toLocaleDateString()}</td>
                    <td className="py-1.5 text-right tabular-nums">{s.openCount > 0 ? s.openCount : "—"}</td>
                    <td className="py-1.5 text-gray-400 dark:text-slate-500">{s.clickedAt ? new Date(s.clickedAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("all");
  const [dataTab, setDataTab] = useState<DataTab>("holdings");

  const [resetPwd, setResetPwd] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [impersonating, setImpersonating] = useState(false);

  const fetchData = useCallback(async (portfolioId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (portfolioId && portfolioId !== "all") params.set("portfolioId", portfolioId);
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/data?${params}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Failed to load user data");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Failed to load user data");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(selectedPortfolio); }, [fetchData, selectedPortfolio]);

  const handlePwdReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetPwd) return;
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newPassword: resetPwd }),
    });
    if (res.ok) { setResetPwd(""); setActionMsg("Password reset"); setTimeout(() => setActionMsg(""), 2000); }
  };

  const handleResetData = async (mode: "seed" | "empty") => {
    await fetch("/api/admin/reset-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mode }),
    });
    setActionMsg(mode === "seed" ? "Seeded" : "Emptied");
    setTimeout(() => setActionMsg(""), 2000);
    fetchData(selectedPortfolio);
  };

  const [generatingDigest, setGeneratingDigest] = useState(false);
  const [digestResult, setDigestResult] = useState<{ summaryText: string; emailSent: boolean; weekStart: string; weekEnd: string } | null>(null);
  const handleGenerateDigest = async () => {
    setGeneratingDigest(true);
    setActionMsg("Generating digest…");
    setDigestResult(null);
    try {
      const res = await fetch("/api/admin/weekly-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, force: true }),
      });
      const json = await res.json();
      if (res.ok) {
        setActionMsg(`Digest generated${json.emailSent ? " & emailed" : ""}`);
        setDigestResult({ summaryText: json.summaryText, emailSent: json.emailSent, weekStart: json.weekStart, weekEnd: json.weekEnd });
      } else {
        setActionMsg(`Digest failed: ${json.error}`);
      }
    } catch {
      setActionMsg("Digest generation failed");
    }
    setGeneratingDigest(false);
    setTimeout(() => setActionMsg(""), 6000);
  };

  const [backfilling, setBackfilling] = useState(false);
  const [checklistData, setChecklistData] = useState<ChecklistInfo | null>(null);
  const [resettingChecklist, setResettingChecklist] = useState(false);

  useEffect(() => {
    if (data?.checklist) setChecklistData(data.checklist);
  }, [data?.checklist]);
  const handleBackfill = async () => {
    setBackfilling(true);
    setActionMsg("Rebuilding snapshots…");
    try {
      const res = await fetch("/api/admin/backfill-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (res.ok) {
        setActionMsg(`Rebuilt ${json.snapshotsCreated} historical + ${json.liveSnapshots ?? 0} live snapshots`);
      } else {
        setActionMsg(`Rebuild failed: ${json.error}`);
      }
    } catch {
      setActionMsg("Rebuild failed");
    }
    setBackfilling(false);
    setTimeout(() => setActionMsg(""), 6000);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete this user? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(userId)}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/users");
  };

  const handleImpersonate = async () => {
    setImpersonating(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      setActionMsg(typeof json.error === "string" ? json.error : "Could not open session");
      setTimeout(() => setActionMsg(""), 5000);
    } catch {
      setActionMsg("Could not open session");
      setTimeout(() => setActionMsg(""), 5000);
    } finally {
      setImpersonating(false);
    }
  };

  const handleRoleChange = async (newRole: "admin" | "user") => {
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "setRole", role: newRole }),
    });
    if (res.ok && data) setData({ ...data, user: { ...data.user, role: newRole } });
  };

  const handlePlanChange = async (newPlan: "free" | "starter" | "pro") => {
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "setPlan", plan: newPlan }),
    });
    if (res.ok && data) setData({ ...data, user: { ...data.user, plan: newPlan } });
  };

  const parseImportMeta = (metadata: string): { broker?: string; method?: string; count?: string } => {
    try { return JSON.parse(metadata); } catch { return {}; }
  };

  if (loading && !data) {
    return (
      <main className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded" />
            <div className="h-40 bg-gray-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-60 bg-gray-200 dark:bg-slate-700 rounded-lg" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => router.push("/admin/users")} className="text-xs text-indigo-500 hover:text-indigo-400 mb-4 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="m15 19-7-7 7-7" /></svg>
            Back to Admin
          </button>
          <p className="text-red-500">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) return null;
  const { user } = data;

  const dataTabs: { key: DataTab; label: string; count: number }[] = [
    { key: "holdings", label: "Holdings", count: data.holdings.length },
    { key: "transactions", label: "Transactions", count: data.transactions.length },
    { key: "cash", label: "Cash & Assets", count: data.cash.length },
  ];

  return (
    <main className="px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/users")} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="m15 19-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{user.username}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <AuthBadge provider={user.authProvider} />
              <PlanBadge plan={user.plan} />
              {user.onboardingCompleted ? (
                <span className="text-[11px] text-emerald-500 font-medium">Onboarded</span>
              ) : (
                <span className="text-[11px] text-amber-400 font-medium">Onboarding pending</span>
              )}
              {user.language && (
                <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400">{user.language.toUpperCase()}</span>
              )}
              {user.experienceLevel && (
                <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-400">{user.experienceLevel}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-right text-xs text-gray-400 dark:text-slate-500">
              <div>Created {new Date(user.createdAt).toLocaleDateString()}</div>
              <div>Last active {relativeTime(user.lastActiveAt)}</div>
            </div>
            {user.role !== "admin" && user.username !== "admin" && (
              <button
                type="button"
                onClick={handleImpersonate}
                disabled={impersonating}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
              >
                {impersonating ? "Opening…" : "Open session as user"}
              </button>
            )}
          </div>
        </div>

        {/* Top info grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* User Info */}
          <div className="card p-4 space-y-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">User Information</h3>
            {([
              ["User ID", <span key="id" className="font-mono text-[11px] select-all">{user.id}</span>],
              ["Email", user.email || "—"],
              ["Display Name", user.displayName || "—"],
              ["Email Verified", user.emailVerified ? <span key="v" className="text-emerald-500">Yes</span> : <span key="v" className="text-gray-400">No</span>],
              ["Plan", `${user.plan === "pro" ? "Trefolio" : user.plan === "starter" ? "Bifolio" : "Folio"} (${user.plan})`],
              ["Plan Expires", user.planExpiresAt ? new Date(user.planExpiresAt).toLocaleDateString() : "—"],
              ["Stripe Customer", user.stripeCustomerId ? <span key="sc" className="font-mono text-[11px]">{user.stripeCustomerId}</span> : "—"],
              ["Tax Residency", user.taxResidency || "—"],
              ["Language", user.language ? user.language.toUpperCase() : "—"],
              ["Experience", user.experienceLevel || "—"],
              ["AI Calls (month)", String(user.aiCallsThisMonth)],
              ["Trial Invited", user.trialInvitedAt ? new Date(user.trialInvitedAt).toLocaleDateString() : "—"],
              ["Trial Activated", user.trialActivatedAt ? new Date(user.trialActivatedAt).toLocaleDateString() : "—"],
              ["Trial Token", user.trialToken ? <span key="tt" className="font-mono text-[11px] select-all break-all">{user.trialToken}</span> : "—"],
              ["Trial Expired Notified", user.trialExpiredNotified ? <span key="te" className="text-amber-500">Yes</span> : <span key="te" className="text-gray-400">No</span>],
            ] as [string, React.ReactNode][]).map(([label, value]) => (
              <div key={label} className="flex justify-between items-center text-xs gap-2">
                <span className="text-gray-500 dark:text-slate-400 shrink-0">{label}</span>
                <span className="text-gray-900 dark:text-white font-medium text-right truncate">{value}</span>
              </div>
            ))}
          </div>

          {/* Portfolios */}
          <div className="card p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">
              Portfolios ({data.portfolios.length})
            </h3>
            {data.portfolios.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 dark:text-slate-400">
                    <th className="text-left pb-1 font-medium text-[10px] uppercase">Name</th>
                    <th className="text-left pb-1 font-medium text-[10px] uppercase">Cur</th>
                    <th className="text-right pb-1 font-medium text-[10px] uppercase">Holdings</th>
                    <th className="text-right pb-1 font-medium text-[10px] uppercase">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.portfolios.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100 dark:border-slate-700/50">
                      <td className="py-1.5 font-medium text-gray-900 dark:text-white">
                        {p.name} {p.isDefault && <span className="text-[9px] text-gray-400 ml-1">Default</span>}
                      </td>
                      <td className="py-1.5 text-gray-500 dark:text-slate-400">{p.currency}</td>
                      <td className="py-1.5 text-right tabular-nums">{p.holdingCount}</td>
                      <td className="py-1.5 text-right tabular-nums text-emerald-500 font-medium">{formatEur(p.totalValueEur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-400">No portfolios</p>
            )}
          </div>

          {/* Import History + Actions */}
          <div className="card p-4 space-y-3">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">
                Broker Accounts ({data.accounts.length})
              </h3>
              {data.accounts.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {data.accounts.map((a) => (
                    <span key={a.id} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300">
                      {a.broker || a.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-400 dark:text-slate-600">No broker accounts</span>
              )}
            </div>

            {data.importEvents.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">Import Events</div>
                <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
                  {data.importEvents.map((ev, i) => {
                    const meta = parseImportMeta(ev.metadata);
                    const label = meta.broker ? `${meta.broker} CSV` : meta.method === "file" ? "AI Import (file)" : meta.method || ev.event;
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-gray-100 dark:border-slate-700/30 last:border-b-0">
                        <span className="text-gray-900 dark:text-white font-medium">{label}</span>
                        {meta.count && <span className="text-emerald-500 text-[11px] font-semibold">+{meta.count} txns</span>}
                        <span className="text-gray-400 dark:text-slate-500 text-[11px] ml-auto">{new Date(ev.createdAt).toLocaleDateString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-gray-200 dark:border-slate-700 space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                {user.username === "admin" ? (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">admin (protected)</span>
                ) : (
                  <select value={user.role} onChange={(e) => handleRoleChange(e.target.value as "admin" | "user")} className="text-xs px-2 py-1 rounded-lg">
                    <option value="user">Role: user</option>
                    <option value="admin">Role: admin</option>
                  </select>
                )}
                <select value={user.plan} onChange={(e) => handlePlanChange(e.target.value as "free" | "starter" | "pro")} className="text-xs px-2 py-1 rounded-lg">
                  <option value="free">Folio (free)</option>
                  <option value="starter">Bifolio (starter)</option>
                  <option value="pro">Trefolio (pro)</option>
                </select>
              </div>
              <form className="flex items-center gap-2" onSubmit={handlePwdReset}>
                <input type="password" placeholder="New password" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg flex-1" />
                <button type="submit" className="btn-secondary text-xs px-2 py-1">Reset pwd</button>
              </form>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleResetData("seed")} className="btn-secondary text-xs px-2 py-1">Seed data</button>
                <button onClick={() => handleResetData("empty")} className="btn-secondary text-xs px-2 py-1">Empty data</button>
                <button onClick={handleBackfill} disabled={backfilling} className="btn-secondary text-xs px-2 py-1">
                  {backfilling ? "Recalculating…" : "Recalculate snapshots"}
                </button>
                <button onClick={handleGenerateDigest} disabled={generatingDigest} className="btn-secondary text-xs px-2 py-1">
                  {generatingDigest ? "Generating…" : "Generate Digest"}
                </button>
                {user.username !== "admin" && (
                  <button onClick={handleDelete} className="btn-danger text-xs px-2 py-1">Delete user</button>
                )}
                {actionMsg && <span className="text-xs text-emerald-500 self-center">{actionMsg}</span>}
              </div>
            </div>

            {/* Digest result preview */}
            {digestResult && (
              <div className="border-t border-gray-100 dark:border-slate-700 pt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Digest Preview ({digestResult.weekStart} → {digestResult.weekEnd})
                  </span>
                  {digestResult.emailSent && <span className="text-[10px] font-semibold text-emerald-500">Email sent</span>}
                  <button onClick={() => setDigestResult(null)} className="ml-auto text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">Dismiss</button>
                </div>
                <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3">
                  {digestResult.summaryText}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Onboarding Checklist */}
        {checklistData && (
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Onboarding Checklist</h3>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  checklistData.dismissed
                    ? "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                    : checklistData.steps.every(s => s.completedAt)
                      ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
                }`}>
                  {checklistData.dismissed ? "Dismissed" : checklistData.steps.every(s => s.completedAt) ? "Complete" : "In Progress"}
                </span>
                <button
                  onClick={async () => {
                    setResettingChecklist(true);
                    try {
                      const res = await fetch("/api/admin/users", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId, action: "resetChecklist" }),
                      });
                      if (res.ok) {
                        setChecklistData({
                          steps: checklistData.steps.map(s => ({ ...s, completedAt: null })),
                          dismissed: false,
                        });
                        setActionMsg("Checklist reset");
                        setTimeout(() => setActionMsg(""), 4000);
                      }
                    } catch {}
                    setResettingChecklist(false);
                  }}
                  disabled={resettingChecklist}
                  className="btn-secondary text-[10px] px-2 py-0.5"
                >
                  {resettingChecklist ? "Resetting…" : "Reset"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {checklistData.steps.map((s) => {
                const labels: Record<string, string> = {
                  complete_profile: "Complete Profile",
                  add_stock: "Add Stock",
                  create_alert: "Create Alert",
                  explore_tools: "Explore Tools",
                };
                const done = !!s.completedAt;
                return (
                  <div
                    key={s.step}
                    className={`rounded-lg px-3 py-2 text-center border ${
                      done
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                        : "bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      {done ? (
                        <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                      )}
                      <span className={`text-[11px] font-semibold ${done ? "text-emerald-700 dark:text-emerald-400" : "text-gray-600 dark:text-slate-400"}`}>
                        {labels[s.step] || s.step}
                      </span>
                    </div>
                    {done && s.completedAt && (
                      <p className="text-[9px] text-gray-400 dark:text-slate-500">{relativeTime(s.completedAt)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Send Email */}
        <SendEmailSection userId={userId} userEmail={user.email} userLanguage={user.language || "en"} />

        {/* Portfolio Charts */}
        <AdminPortfolioCharts userId={userId} portfolios={data.portfolios} />

        {/* Data section */}
        <div className="card p-0 overflow-hidden">
          {/* Data toolbar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30">
            <div className="flex gap-1">
              {dataTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setDataTab(t.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    dataTab === t.key
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50"
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 text-[10px] font-semibold tabular-nums opacity-60">{t.count}</span>
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <label className="text-[11px] text-gray-500 dark:text-slate-400">Portfolio:</label>
              <select
                value={selectedPortfolio}
                onChange={(e) => setSelectedPortfolio(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg"
              >
                <option value="all">All portfolios</option>
                {data.allPortfolios.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.currency})</option>
                ))}
              </select>
              {loading && <span className="text-[11px] text-indigo-400">Loading...</span>}
            </div>
          </div>

          {/* Data content */}
          <div className="min-h-[200px]">
            {dataTab === "holdings" && <HoldingsTable holdings={data.holdings} />}
            {dataTab === "transactions" && <TransactionsTable transactions={data.transactions} />}
            {dataTab === "cash" && <CashTable cash={data.cash} />}
          </div>
        </div>

      </div>
    </main>
  );
}
