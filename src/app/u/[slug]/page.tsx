"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ExperienceBadge } from "@/components/social/ExperienceBadge";
import { ConnectionButton } from "@/components/social/ConnectionButton";
import { PostCard } from "@/components/social/PostCard";
import { FileText, ArrowLeft, Lock } from "lucide-react";

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
}

const POST_TABS = [
  { key: "", label: "All Posts" },
  { key: "analysis", label: "Analysis" },
  { key: "trade_idea", label: "Trade Ideas" },
  { key: "portfolio_update", label: "Portfolio Updates" },
];

export default function PublicProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [activeTab, setActiveTab] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/social/profile/${slug}`)
      .then((r) => r.json())
      .then(setProfile)
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <p className="mt-2 text-[var(--muted)]">
          This profile doesn&apos;t exist or hasn&apos;t been set up yet.
        </p>
        <Link href="/" className="mt-4 text-[var(--accent)] hover:underline">
          ← Go home
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
      <div className="min-h-screen bg-[var(--background)]">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft size={14} />
            Back
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-[900px] px-6 py-8">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={14} />
          Back
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
    </div>
  );
}
