"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ExperienceBadge } from "@/components/social/ExperienceBadge";
import { ConnectionButton } from "@/components/social/ConnectionButton";
import { FinancialDisclaimer } from "@/components/social/FinancialDisclaimer";
import { CommentSection } from "@/components/social/CommentSection";
import { ArrowLeft, Share2 } from "lucide-react";

const POST_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  article: { label: "Article", color: "bg-[var(--card-hover)] text-[var(--muted)]" },
  analysis: { label: "Analysis", color: "bg-blue-500/10 text-blue-400" },
  trade_idea: { label: "Trade Idea", color: "bg-amber-500/10 text-amber-400" },
  portfolio_update: { label: "Portfolio Update", color: "bg-blue-500/10 text-blue-400" },
  link: { label: "Link", color: "bg-[var(--card-hover)] text-[var(--muted)]" },
};

function extractTickers(html: string): string[] {
  const matches = html.match(/\b[A-Z]{1,5}\b/g) || [];
  const common = new Set(["THE", "AND", "FOR", "NOT", "BUT", "ALL", "CAN", "HAS", "HER", "WAS", "ONE", "OUR", "OUT", "ARE", "HIS", "HOW", "ITS", "MAY", "NEW", "NOW", "OLD", "SEE", "WAY", "WHO", "DID", "GET", "HIM", "LET", "SAY", "SHE", "TOO", "USE"]);
  return [...new Set(matches.filter(t => t.length >= 2 && !common.has(t)))].slice(0, 5);
}

function estimateReadTime(html: string): string {
  const words = html.replace(/<[^>]*>/g, "").split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

interface PostData {
  id: string;
  userId: string;
  title: string;
  content: string;
  postType: string;
  visibility: string;
  publishedAt: string;
  authorName: string;
  authorAvatar: string;
  authorSlug: string;
  authorExperience: string;
  isOwner?: boolean;
  viewerId?: string | null;
}

export default function PostDetailPage() {
  const params = useParams<{ slug: string; id: string }>();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/social/posts/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <h1 className="text-2xl font-bold">Post not found</h1>
        <Link href="/" className="mt-4 text-[var(--accent)] hover:underline">← Go home</Link>
      </div>
    );
  }

  const typeConfig = POST_TYPE_LABELS[post.postType] || POST_TYPE_LABELS.article;
  const tickers = extractTickers(post.content);
  const readTime = estimateReadTime(post.content);
  const initials = post.authorName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const publishDate = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-[720px] px-6 py-8">
        <Link href={`/u/${params.slug}`} className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft size={14} /> Back to profile
        </Link>

        <article>
          <span className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold ${typeConfig.color}`}>{typeConfig.label}</span>

          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-[var(--foreground)]">{post.title}</h1>

          <div className="mt-4 flex items-center gap-3">
            <Link href={`/u/${post.authorSlug}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-sm font-bold text-white">
              {initials}
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link href={`/u/${post.authorSlug}`} className="text-sm font-semibold text-[var(--foreground)] hover:underline">{post.authorName}</Link>
                {post.authorExperience && <ExperienceBadge level={post.authorExperience} />}
              </div>
              <p className="text-xs text-[var(--muted)]">@{post.authorSlug} · {publishDate} · {readTime}</p>
            </div>
            <div className="ml-auto flex gap-2">
              <button className="rounded-[var(--radius-button,8px)] bg-[var(--card)] p-2 text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)] transition-colors"
                onClick={() => navigator.clipboard.writeText(window.location.href)}>
                <Share2 size={16} />
              </button>
            </div>
          </div>

          <div className="mt-8 prose prose-sm max-w-none text-[15px] leading-[1.75] text-[var(--foreground)] opacity-85"
            dangerouslySetInnerHTML={{ __html: post.content }} />

          {tickers.length > 0 && <FinancialDisclaimer tickers={tickers} />}

          {/* Author Card */}
          <div className="card mt-10 p-6">
            <div className="flex items-center gap-4">
              <Link href={`/u/${post.authorSlug}`}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-lg font-bold text-white">
                {initials}
              </Link>
              <div className="flex-1">
                <Link href={`/u/${post.authorSlug}`} className="text-lg font-bold text-[var(--foreground)] hover:underline">{post.authorName}</Link>
                <p className="text-sm text-[var(--muted)]">@{post.authorSlug}</p>
              </div>
              {!post.isOwner && (
                <ConnectionButton connectionStatus={null} targetUserId={post.userId} />
              )}
            </div>
          </div>

          <CommentSection postId={post.id} currentUserId={post.viewerId} />
        </article>
      </div>
    </div>
  );
}
