"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ExperienceBadge } from "@/components/social/ExperienceBadge";
import { ConnectionButton } from "@/components/social/ConnectionButton";
import { PostCard } from "@/components/social/PostCard";
import { FileText, ArrowLeft, Lock, TrendingUp, TrendingDown, PieChart, BarChart3 } from "lucide-react";

interface ProfileData {
  userId: string;
  displayName: string;
  avatarUrl: string;
  profileSlug: string;
  bio: string;
  headline: string;
  socialVisibility: string;
  experienceLevel: string;
  sharePortfolioValue: boolean;
  shareHoldings: boolean;
  connectionCount: number;
  postCount: number;
  connectionStatus: string | null;
  isOwner: boolean;
  isPrivate?: boolean;
}

interface PostData {
  id: string;
  title: string;
  content: string;
  postType: string;
  visibility: string;
  publishedAt: string;
  authorName: string;
  authorAvatar: string;
  authorSlug: string;
  authorExperience: string;
  commentCount?: number;
}

interface PortfolioData {
  sharePortfolioValue: boolean;
  shareHoldings: boolean;
  totalValue?: number;
  totalGainLoss?: number;
  totalGainLossPercent?: number;
  dayChange?: number;
  dayChangePercent?: number;
  holdingsCount: number;
  topHoldings?: { ticker: string; name: string; weight: number; assetType: string }[];
  allocation?: { label: string; percent: number; color: string }[];
}

const POST_TABS = [
  { key: "", label: "All Posts" },
  { key: "analysis", label: "Analysis" },
  { key: "trade_idea", label: "Trade Ideas" },
  { key: "portfolio_update", label: "Portfolio Updates" },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function PortfolioSection({ data }: { data: PortfolioData }) {
  const hasValue = data.sharePortfolioValue && data.totalValue !== undefined;
  const hasHoldings = data.shareHoldings && data.topHoldings && data.topHoldings.length > 0;

  if (!hasValue && !hasHoldings) return null;

  return (
    <div className="mt-7 px-7">
      <div className="border-t border-[var(--border)] pt-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Portfolio</h2>

        {hasValue && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted)] uppercase tracking-wider">Total Value</p>
              <p className="text-lg font-bold text-[var(--foreground)]">{formatCurrency(data.totalValue!)}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted)] uppercase tracking-wider">Total Return</p>
              <div className="flex items-center gap-1.5">
                {data.totalGainLoss! >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
                <p className={`text-lg font-bold ${data.totalGainLoss! >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {data.totalGainLossPercent! >= 0 ? "+" : ""}{data.totalGainLossPercent!.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted)] uppercase tracking-wider">Day Change</p>
              <div className="flex items-center gap-1.5">
                <p className={`text-lg font-bold ${(data.dayChange ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {(data.dayChangePercent ?? 0) >= 0 ? "+" : ""}{(data.dayChangePercent ?? 0).toFixed(2)}%
                </p>
              </div>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted)] uppercase tracking-wider">Holdings</p>
              <p className="text-lg font-bold text-[var(--foreground)]">{data.holdingsCount}</p>
            </div>
          </div>
        )}

        {hasHoldings && (
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Top Holdings */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} className="text-[var(--muted)]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Top Holdings</h3>
              </div>
              <div className="space-y-2">
                {data.topHoldings!.slice(0, 10).map((h) => (
                  <div key={h.ticker} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-[var(--foreground)] truncate">{h.ticker}</span>
                      <span className="text-xs text-[var(--muted)] truncate hidden sm:inline">{h.name}</span>
                    </div>
                    <div className="shrink-0 ml-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[var(--card-hover)] overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(h.weight, 100)}%` }} />
                        </div>
                        <span className="text-xs font-medium text-[var(--muted)] w-10 text-right">{h.weight}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Allocation */}
            {data.allocation && data.allocation.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <PieChart size={14} className="text-[var(--muted)]" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Allocation</h3>
                </div>
                <div className="space-y-2.5">
                  {data.allocation.map((a) => (
                    <div key={a.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-[var(--foreground)] font-medium">{a.label}</span>
                        <span className="text-xs text-[var(--muted)]">{a.percent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--card-hover)] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${a.percent}%`, backgroundColor: a.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [activeTab, setActiveTab] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/social/profile/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        setProfile(p);
        if (p && (p.sharePortfolioValue || p.shareHoldings) && !p.isPrivate) {
          fetch(`/api/social/profile/${slug}/portfolio`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d && setPortfolio(d))
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const typeParam = activeTab ? `&type=${activeTab}` : "";
    fetch(`/api/social/posts?slug=${slug}${typeParam}`)
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch(() => {});
  }, [slug, activeTab]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-[var(--foreground)]">
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <p className="mt-2 text-[var(--muted)]">
          This profile doesn&apos;t exist or hasn&apos;t been set up yet.
        </p>
        <Link href="/network" className="mt-4 text-[var(--accent)] hover:underline">
          ← Back to Network
        </Link>
      </div>
    );
  }

  const initials = profile.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (
    profile.isPrivate &&
    !profile.isOwner &&
    profile.connectionStatus !== "connected"
  ) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <Link
          href="/network"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={14} />
          Back to Network
        </Link>
        <div className="card overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-[var(--background)] via-[var(--card)] to-emerald-900/30" />
          <div className="-mt-8 flex items-center gap-5 px-7">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-emerald-500 bg-gradient-to-br from-emerald-500 to-blue-500 text-2xl font-bold text-white">
              {initials}
            </div>
            <div className="pt-10">
              <h1 className="text-xl font-extrabold text-[var(--foreground)]">
                {profile.displayName}
              </h1>
              <p className="text-sm text-[var(--muted)]">
                @{profile.profileSlug}
              </p>
            </div>
          </div>
          <div className="mt-8 border-t border-dashed border-[var(--border)] p-8 text-center">
            <Lock size={24} className="mx-auto mb-2 text-[var(--muted)]" />
            <p className="text-sm text-[var(--muted)]">
              This profile is private.{" "}
              <strong className="text-[var(--foreground)]">Connect</strong> to see more.
            </p>
            <div className="mt-4">
              <ConnectionButton
                connectionStatus={profile.connectionStatus}
                targetUserId={profile.userId}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-6 py-3 sm:py-6">
      <Link
        href="/network"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={14} />
        Back to Network
      </Link>
      <div className="card overflow-hidden">
        {/* Cover */}
        <div className="h-44 bg-gradient-to-r from-[var(--background)] via-blue-900/40 to-emerald-500/60" />

        {/* Hero */}
        <div className="-mt-12 flex gap-7 px-7">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[3px] border-emerald-500 bg-gradient-to-br from-emerald-500 to-blue-500 text-[38px] font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 pt-14">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[var(--foreground)]">
              {profile.displayName}
            </h1>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              @{profile.profileSlug}
            </p>
            {profile.headline && (
              <p className="mt-2 text-[15px] text-[var(--muted)]">
                {profile.headline}
              </p>
            )}
            <div className="mt-3 flex items-center gap-5 text-sm text-[var(--muted)]">
              <span>
                <strong className="text-[var(--foreground)]">
                  {profile.connectionCount}
                </strong>{" "}
                connections
              </span>
              <span>
                <strong className="text-[var(--foreground)]">{profile.postCount}</strong>{" "}
                posts
              </span>
              {profile.experienceLevel && (
                <ExperienceBadge level={profile.experienceLevel} />
              )}
            </div>
            {!profile.isOwner && (
              <div className="mt-4 flex gap-2">
                <ConnectionButton
                  connectionStatus={profile.connectionStatus}
                  targetUserId={profile.userId}
                />
              </div>
            )}
            {profile.isOwner && (
              <div className="mt-4">
                <Link
                  href="/profile"
                  className="btn-secondary inline-flex items-center gap-1.5 text-sm font-semibold"
                >
                  Edit Profile
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mt-7 px-7">
            <div className="border-t border-[var(--border)] pt-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                About
              </h2>
              <p className="text-[15px] leading-relaxed text-[var(--foreground)] opacity-85">
                {profile.bio}
              </p>
            </div>
          </div>
        )}

        {/* Portfolio */}
        {portfolio && <PortfolioSection data={portfolio} />}

        {/* Post Tabs */}
        <div className="mt-7 flex gap-0.5 border-b border-[var(--border)] px-7">
          {POST_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Posts */}
        <div className="flex flex-col gap-4 p-7">
          {posts.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--muted)]">
              <FileText
                size={24}
                className="mx-auto mb-2 text-[var(--muted)]"
              />
              No posts yet
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} showAuthor={false} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
