"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, MessageCircle, UserMinus, Check, X } from "lucide-react";
import { ExperienceBadge } from "@/components/social/ExperienceBadge";
import { NetworkMobileNav } from "@/components/social/NetworkSidebar";

interface ConnectionUser {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string;
  profileSlug: string;
  headline: string;
  experienceLevel: string;
  connectedAt: string;
  connectionCount: number;
  postCount: number;
}

interface Counts { accepted: number; pendingReceived: number; pendingSent: number; }

const TABS = [
  { key: "accepted", label: "My Connections", countKey: "accepted" as const },
  { key: "pending_received", label: "Pending Requests", countKey: "pendingReceived" as const },
  { key: "pending_sent", label: "Sent Requests", countKey: "pendingSent" as const },
];

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export default function ConnectionsPage() {
  const [tab, setTab] = useState("accepted");
  const [connections, setConnections] = useState<ConnectionUser[]>([]);
  const [counts, setCounts] = useState<Counts>({ accepted: 0, pendingReceived: 0, pendingSent: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  function loadConnections(filter: string) {
    setLoading(true);
    const params = new URLSearchParams({ filter });
    if (search) params.set("search", search);
    fetch(`/api/social/connections?${params}`)
      .then(r => r.json())
      .then(data => {
        setConnections(data.connections || []);
        setCounts(data.counts || counts);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadConnections(tab); }, [tab]);

  async function handleAction(connId: string, action: string) {
    if (action === "accept" || action === "reject") {
      await fetch(`/api/social/connections/${connId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } else {
      await fetch(`/api/social/connections/${connId}`, { method: "DELETE" });
    }
    loadConnections(tab);
  }

  async function handleMessage(userId: string) {
    const res = await fetch(`/api/social/connections/${userId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId }),
    });
    if (res.ok) {
      const { token } = await res.json();
      window.location.href = `/network/conversations?chat=${token}`;
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-6">
      <NetworkMobileNav profile={null} pendingCount={counts.pendingReceived} />
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-[var(--foreground)]">Connections</h1>

      <div className="mb-6 flex gap-0.5 border-b border-[var(--border)]">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.key ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}>
            {t.label}
            {counts[t.countKey] > 0 && (
              <span className="ml-1.5 rounded-full bg-[var(--card-hover)] px-1.5 py-0.5 text-[11px] font-bold">{counts[t.countKey]}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "accepted" && (
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && loadConnections(tab)}
            placeholder="Search connections..."
            className="w-full rounded-[var(--radius-button,8px)] border border-[var(--border)] bg-[var(--card)] py-2.5 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none" />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : connections.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--muted)]">
          {tab === "accepted" ? "No connections yet." : tab === "pending_received" ? "No pending requests." : "No sent requests."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {connections.map(conn => {
            const initials = conn.displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={conn.id || conn.userId} className="card flex items-center gap-4 p-4">
                <Link href={`/u/${conn.profileSlug}`}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-sm font-bold text-white">
                  {initials}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/u/${conn.profileSlug}`} className="font-semibold text-[var(--foreground)] hover:underline">{conn.displayName}</Link>
                    {conn.experienceLevel && <ExperienceBadge level={conn.experienceLevel} />}
                  </div>
                  {conn.headline && <p className="text-sm text-[var(--muted)] truncate">{conn.headline}</p>}
                  <p className="text-xs text-[var(--muted)]">
                    {tab === "accepted" ? `Connected since ${timeAgo(conn.connectedAt)}` : `Sent ${timeAgo(conn.connectedAt)}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {tab === "accepted" && (
                    <>
                      <button onClick={() => handleMessage(conn.userId)}
                        className="inline-flex items-center gap-1 rounded-[var(--radius-button,8px)] bg-[var(--card-hover)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] hover:brightness-110 transition-colors">
                        <MessageCircle size={14} /> Message
                      </button>
                      <button onClick={() => handleAction(conn.id, "remove")}
                        className="rounded-[var(--radius-button,8px)] bg-[var(--card-hover)] p-2 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-400 transition-colors">
                        <UserMinus size={14} />
                      </button>
                    </>
                  )}
                  {tab === "pending_received" && (
                    <>
                      <button onClick={() => handleAction(conn.id, "accept")}
                        className="btn-primary inline-flex items-center gap-1 text-sm font-semibold">
                        <Check size={14} /> Accept
                      </button>
                      <button onClick={() => handleAction(conn.id, "reject")}
                        className="inline-flex items-center gap-1 rounded-[var(--radius-button,8px)] bg-[var(--card-hover)] px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors">
                        <X size={14} /> Decline
                      </button>
                    </>
                  )}
                  {tab === "pending_sent" && (
                    <button onClick={() => handleAction(conn.id, "withdraw")}
                      className="inline-flex items-center gap-1 rounded-[var(--radius-button,8px)] bg-[var(--card-hover)] px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors">
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
