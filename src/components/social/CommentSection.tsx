"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageCircle, Send, Loader2, Trash2, CornerDownRight } from "lucide-react";

interface Comment {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorSlug: string;
  authorAvatar: string;
}

interface CommentSectionProps {
  postId: string;
  currentUserId?: string | null;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onReply,
  replies,
  depth,
}: {
  comment: Comment;
  currentUserId?: string | null;
  onDelete: (id: string) => void;
  onReply: (parentId: string) => void;
  replies: Comment[];
  depth: number;
}) {
  const initials = (comment.authorName || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const isOwn = currentUserId === comment.userId;

  return (
    <div className={depth > 0 ? "ml-8 mt-3" : "mt-4"}>
      <div className="flex gap-3">
        <Link href={comment.authorSlug ? `/u/${comment.authorSlug}` : "#"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-[10px] font-bold text-white">
          {initials}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={comment.authorSlug ? `/u/${comment.authorSlug}` : "#"}
              className="text-sm font-semibold text-[var(--foreground)] hover:underline">
              {comment.authorName}
            </Link>
            <span className="text-xs text-[var(--muted)]">{timeAgo(comment.createdAt)}</span>
            {comment.createdAt !== comment.updatedAt && (
              <span className="text-xs text-[var(--muted)] italic">edited</span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--foreground)] opacity-90 whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="mt-1.5 flex items-center gap-3">
            {currentUserId && depth === 0 && (
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <CornerDownRight size={12} /> Reply
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
      {replies.length > 0 && (
        <div className="border-l-2 border-[var(--border)] pl-1">
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onReply={onReply}
              replies={[]}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({ postId, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [allowComments, setAllowComments] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/social/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setTotal(data.total || 0);
        setAllowComments(data.allowComments !== false);
      }
    } catch {}
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/social/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), parentId: replyTo }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [...prev, newComment]);
        setTotal(prev => prev + 1);
        setContent("");
        setReplyTo(null);
      }
    } catch {}
    setSending(false);
  }

  async function handleDelete(commentId: string) {
    const res = await fetch(`/api/social/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
      setTotal(prev => Math.max(0, prev - 1));
    }
  }

  function handleReply(parentId: string) {
    setReplyTo(parentId);
    document.getElementById("comment-input")?.focus();
  }

  const replyAuthor = replyTo ? comments.find(c => c.id === replyTo)?.authorName : null;

  const topLevel = comments.filter(c => !c.parentId);
  const repliesMap: Record<string, Comment[]> = {};
  for (const c of comments) {
    if (c.parentId) {
      if (!repliesMap[c.parentId]) repliesMap[c.parentId] = [];
      repliesMap[c.parentId].push(c);
    }
  }

  return (
    <div className="mt-10 border-t border-[var(--border)] pt-8">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={20} className="text-[var(--foreground)]" />
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Comments{total > 0 && ` (${total})`}
        </h2>
      </div>

      {!allowComments && (
        <p className="text-sm text-[var(--muted)] italic mb-4">Comments are disabled for this post.</p>
      )}

      {allowComments && currentUserId && (
        <form onSubmit={handleSubmit} className="mb-6">
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 text-xs text-[var(--muted)]">
              <CornerDownRight size={12} />
              <span>Replying to {replyAuthor || "comment"}</span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-[var(--accent)] hover:underline">Cancel</button>
            </div>
          )}
          <div className="flex gap-3">
            <textarea
              id="comment-input"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write a comment..."
              maxLength={2000}
              rows={2}
              className="flex-1 text-sm rounded-[var(--radius-button,8px)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
            />
            <button
              type="submit"
              disabled={!content.trim() || sending}
              className="self-end btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Post
            </button>
          </div>
        </form>
      )}

      {allowComments && !currentUserId && (
        <p className="text-sm text-[var(--muted)] mb-6">
          <Link href="/login" className="text-[var(--accent)] hover:underline">Sign in</Link> to leave a comment.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
        </div>
      ) : topLevel.length === 0 ? (
        allowComments && (
          <p className="text-sm text-[var(--muted)] text-center py-6">No comments yet. Be the first to share your thoughts.</p>
        )
      ) : (
        <div className="space-y-1">
          {topLevel.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              onDelete={handleDelete}
              onReply={handleReply}
              replies={repliesMap[c.id] || []}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
