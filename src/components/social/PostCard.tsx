"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ExperienceBadge } from "./ExperienceBadge";
import { VisibilityBadge } from "./VisibilityBadge";

const POST_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  article: { label: "Article", color: "bg-[var(--muted)]/10 text-[var(--muted)]" },
  analysis: { label: "Analysis", color: "bg-blue-500/10 text-blue-400" },
  trade_idea: { label: "Trade Idea", color: "bg-amber-500/10 text-amber-400" },
  portfolio_update: { label: "Portfolio Update", color: "bg-blue-500/10 text-blue-400" },
  link: { label: "Link", color: "bg-[var(--muted)]/10 text-[var(--muted)]" },
};

interface PostCardProps {
  post: {
    id: string;
    title: string;
    content: string;
    postType: string;
    visibility: string;
    publishedAt: string;
    authorName?: string;
    authorAvatar?: string;
    authorSlug?: string;
    authorExperience?: string;
    commentCount?: number;
  };
  showAuthor?: boolean;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").slice(0, 200);
}

export function PostCard({ post, showAuthor = true }: PostCardProps) {
  const typeConfig = POST_TYPE_LABELS[post.postType] || POST_TYPE_LABELS.article;
  const slug = post.authorSlug || "";
  const initials = (post.authorName || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="card p-5">
      {showAuthor && post.authorName && (
        <div className="mb-3 flex items-center gap-3">
          <Link href={`/u/${slug}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-sm font-bold text-white">
            {initials}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link href={`/u/${slug}`} className="text-sm font-semibold text-[var(--foreground)] hover:underline">{post.authorName}</Link>
              {post.authorExperience && <ExperienceBadge level={post.authorExperience} />}
            </div>
            <p className="text-xs text-[var(--muted)]">@{slug} · {timeAgo(post.publishedAt)}</p>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${typeConfig.color}`}>{typeConfig.label}</span>
        </div>
      )}

      {!showAuthor && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${typeConfig.color}`}>{typeConfig.label}</span>
            <VisibilityBadge visibility={post.visibility} />
          </div>
          <span className="text-xs text-[var(--muted)]">{timeAgo(post.publishedAt)}</span>
        </div>
      )}

      <div>
        {post.title && (
          <h3 className="mb-1.5 text-lg font-bold leading-tight text-[var(--foreground)]">
            <Link href={`/u/${slug}/posts/${post.id}`} className="hover:underline">{post.title}</Link>
          </h3>
        )}
        <p className="text-sm leading-relaxed text-[var(--foreground)] opacity-80">{stripHtml(post.content)}...</p>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <div className="flex items-center gap-4">
          <Link href={`/u/${slug}/posts/${post.id}`} className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            Read more →
          </Link>
          {(post.commentCount ?? 0) > 0 && (
            <Link href={`/u/${slug}/posts/${post.id}`} className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              <MessageCircle size={13} />
              {post.commentCount}
            </Link>
          )}
        </div>
        {showAuthor && <VisibilityBadge visibility={post.visibility} />}
      </div>
    </div>
  );
}
