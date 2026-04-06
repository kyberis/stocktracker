"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Users, FileText } from "lucide-react";
import { ExperienceBadge } from "@/components/social/ExperienceBadge";
import { ConnectionButton } from "@/components/social/ConnectionButton";

const LEVEL_FILTERS = [
  { key: "", label: "All Levels" },
  { key: "beginner", label: "Beginner" },
  { key: "intermediate", label: "Intermediate" },
  { key: "experienced", label: "Experienced" },
  { key: "professional", label: "Professional" },
];

interface PersonResult {
  userId: string;
  displayName: string;
  avatarUrl: string;
  profileSlug: string;
  headline: string;
  experienceLevel: string;
  connectionCount: number;
  postCount: number;
  connectionStatus: string | null;
}

export default function PeopleSearchPage() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [hasPosts, setHasPosts] = useState(false);
  const [hasConnections, setHasConnections] = useState(false);
  const [results, setResults] = useState<PersonResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (level) params.set("level", level);
      if (hasPosts) params.set("hasPosts", "true");
      if (hasConnections) params.set("hasConnections", "true");
      const res = await fetch(`/api/social/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-6">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-[var(--foreground)]">Find People</h1>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Search by name, username, or keyword..."
          className="w-full rounded-[var(--radius-card,16px)] border border-[var(--border)] bg-[var(--card)] py-3 pl-11 pr-4 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none" />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {LEVEL_FILTERS.map(f => (
          <button key={f.key} onClick={() => { setLevel(f.key); }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              level === f.key ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--foreground)]"
            }`}>
            {f.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-[var(--border)]" />
        <button onClick={() => setHasPosts(!hasPosts)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            hasPosts ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--foreground)]"
          }`}>
          Has Posts
        </button>
        <button onClick={() => setHasConnections(!hasConnections)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            hasConnections ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--foreground)]"
          }`}>
          Has Connections
        </button>
        <button onClick={handleSearch}
          className="btn-primary ml-auto text-sm font-semibold">
          Search
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      )}

      {!loading && searched && (
        <p className="mb-4 text-sm text-[var(--muted)]">
          Showing {results.length} result{results.length !== 1 ? "s" : ""}{query ? ` for "${query}"` : ""}
        </p>
      )}

      {!loading && (
        <div className="flex flex-col gap-3">
          {results.map(person => {
            const initials = person.displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={person.userId} className="card flex items-center gap-4 p-5">
                <Link href={`/u/${person.profileSlug}`}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-lg font-bold text-white">
                  {initials}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/u/${person.profileSlug}`} className="text-base font-semibold text-[var(--foreground)] hover:underline truncate">{person.displayName}</Link>
                    {person.experienceLevel && <ExperienceBadge level={person.experienceLevel} />}
                  </div>
                  <p className="text-sm text-[var(--muted)]">@{person.profileSlug}</p>
                  {person.headline && <p className="mt-1 text-sm text-[var(--foreground)] opacity-80 truncate">{person.headline}</p>}
                  <div className="mt-1.5 flex items-center gap-4 text-xs text-[var(--muted)]">
                    <span className="flex items-center gap-1"><FileText size={12} /> {person.postCount} posts</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {person.connectionCount} connections</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/u/${person.profileSlug}`}
                    className="btn-secondary text-sm font-semibold">
                    View Profile
                  </Link>
                  {person.connectionStatus === "accepted" ? (
                    <span className="rounded-[var(--radius-button,8px)] border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-sm font-semibold text-[var(--muted)]">Connected</span>
                  ) : (
                    <ConnectionButton connectionStatus={person.connectionStatus} targetUserId={person.userId} size="sm" />
                  )}
                </div>
              </div>
            );
          })}
          {searched && !loading && results.length === 0 && (
            <div className="py-12 text-center text-sm text-[var(--muted)]">No results found. Try a different search.</div>
          )}
        </div>
      )}
    </div>
  );
}
