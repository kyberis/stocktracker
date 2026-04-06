"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NetworkSidebar, NetworkMobileNav } from "@/components/social/NetworkSidebar";
import { PostCard } from "@/components/social/PostCard";
import { PenSquare } from "lucide-react";

interface ProfileData {
  displayName: string;
  profileSlug: string;
  avatarUrl: string;
  connectionCount: number;
  postCount: number;
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

export default function NetworkFeedPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/social/profile").then(r => r.ok ? r.json() : null),
      fetch("/api/social/feed").then(r => r.ok ? r.json() : { posts: [] }),
      fetch("/api/social/connections?filter=pending_received").then(r => r.ok ? r.json() : { counts: {} }),
    ]).then(([profileData, feedData, connData]) => {
      setProfile(profileData);
      setPosts(feedData.posts || []);
      setPendingCount(connData.counts?.pendingReceived || 0);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-6">
      <NetworkMobileNav profile={profile} pendingCount={pendingCount} />
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="hidden w-[260px] shrink-0 lg:block">
          <NetworkSidebar profile={profile} pendingCount={pendingCount} />
        </div>

        {/* Feed */}
        <div className="min-w-0 flex-1">
          {/* Compose Prompt */}
          <div className="card mb-6 flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-sm font-bold text-white">
              {(profile?.displayName || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <Link href="/network/compose"
              className="flex-1 rounded-[var(--radius-button,8px)] bg-[var(--card-hover)] px-4 py-2.5 text-sm text-[var(--muted)] hover:brightness-110 transition-colors">
              Share an insight, analysis, or update...
            </Link>
            <Link href="/network/compose"
              className="btn-primary inline-flex items-center gap-1.5 text-sm font-semibold">
              <PenSquare size={14} /> Write
            </Link>
          </div>

          {/* Posts */}
          <div className="flex flex-col gap-4">
            {posts.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-lg font-semibold text-[var(--foreground)]">Your feed is empty</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Connect with others or publish your first post to get started.</p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Link href="/network/search" className="btn-secondary text-sm font-semibold">
                    Find People
                  </Link>
                  <Link href="/network/compose" className="btn-primary text-sm font-semibold">
                    Create Post
                  </Link>
                </div>
              </div>
            ) : (
              posts.map(post => <PostCard key={post.id} post={post} showAuthor={true} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
