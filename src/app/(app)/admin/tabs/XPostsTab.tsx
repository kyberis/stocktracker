"use client";

import React, { useCallback, useEffect, useState } from "react";

/* ── X Posts Tab ─────────────────────────────────────────── */

interface XPost {
  id: string;
  content: string;
  imageUrl: string;
  hashtags: string;
  scheduledAt: string;
  status: string;
  postedAt: string;
  xPostId: string;
  errorMessage: string;
  createdAt: string;
}

function XPostsTab() {
  const [posts, setPosts] = useState<XPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "posted" | "failed">("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/x-posts", { cache: "no-store" });
      const data = await res.json();
      setPosts(data.posts || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!content.trim() || !scheduledAt) return;
    setSaving(true);
    const res = await fetch("/api/admin/x-posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim(), hashtags: hashtags.trim(), scheduledAt: new Date(scheduledAt).toISOString() }),
    });
    if (res.ok) {
      setContent("");
      setHashtags("");
      setScheduledAt("");
      setShowForm(false);
      await load();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/x-posts?id=${id}`, { method: "DELETE" });
    await load();
  };

  const handleCancel = async (id: string) => {
    await fetch("/api/admin/x-posts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "cancelled" }),
    });
    await load();
  };

  const handleReschedule = async (id: string) => {
    await fetch("/api/admin/x-posts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "pending" }),
    });
    await load();
  };

  const handleSaveEdit = async (id: string, newContent: string, newHashtags: string, newScheduledAt: string) => {
    await fetch("/api/admin/x-posts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content: newContent, hashtags: newHashtags, scheduledAt: newScheduledAt ? new Date(newScheduledAt).toISOString() : undefined }),
    });
    setEditingId(null);
    await load();
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/x-posts/seed", { method: "POST" });
      if (res.ok) await load();
    } catch { /* ignore */ }
    setSeeding(false);
  };

  const filtered = filter === "all" ? posts : posts.filter((p) => p.status === filter);
  const counts = { all: posts.length, pending: posts.filter((p) => p.status === "pending").length, posted: posts.filter((p) => p.status === "posted").length, failed: posts.filter((p) => p.status === "failed").length };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
      posted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
      failed: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
      cancelled: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400",
    };
    return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.cancelled}`}>{status}</span>;
  };

  const charCount = content.length;
  const fullLength = content.length + (hashtags ? 2 + hashtags.length : 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "pending", "posted", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${filter === f ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600"}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {posts.length === 0 && (
            <button onClick={handleSeed} disabled={seeding} className="btn-secondary text-xs px-4 py-2 disabled:opacity-40">
              {seeding ? "Seeding..." : "Seed 14 Posts"}
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs px-4 py-2">
            {showForm ? "Cancel" : "+ New Post"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Tweet content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full text-sm"
              placeholder="Write your tweet..."
            />
            <p className={`text-xs mt-1 ${fullLength > 280 ? "text-red-500" : "text-gray-400 dark:text-slate-500"}`}>
              {fullLength}/280 characters
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Hashtags (appended after content)</label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="w-full text-sm"
              placeholder="#buildinpublic #FinTwit #portfoliotracker"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Scheduled at (UTC)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="text-sm"
            />
          </div>
          <button onClick={handleCreate} disabled={saving || !content.trim() || !scheduledAt || fullLength > 280} className="btn-primary text-xs px-4 py-2 disabled:opacity-40">
            {saving ? "Scheduling..." : "Schedule Post"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400">No posts found. Create your first scheduled post above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <XPostCard
              key={post.id}
              post={post}
              isEditing={editingId === post.id}
              onEdit={() => setEditingId(post.id)}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={handleSaveEdit}
              onDelete={handleDelete}
              onCancel={handleCancel}
              onReschedule={handleReschedule}
              statusBadge={statusBadge}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function XPostCard({
  post,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onCancel,
  onReschedule,
  statusBadge,
}: {
  post: XPost;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, content: string, hashtags: string, scheduledAt: string) => void;
  onDelete: (id: string) => void;
  onCancel: (id: string) => void;
  onReschedule: (id: string) => void;
  statusBadge: (status: string) => React.ReactNode;
}) {
  const [editContent, setEditContent] = useState(post.content);
  const [editHashtags, setEditHashtags] = useState(post.hashtags);
  const [editScheduledAt, setEditScheduledAt] = useState(post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : "");

  useEffect(() => {
    setEditContent(post.content);
    setEditHashtags(post.hashtags);
    setEditScheduledAt(post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : "");
  }, [post, isEditing]);

  const fullEditLength = editContent.length + (editHashtags ? 2 + editHashtags.length : 0);

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {statusBadge(post.status)}
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {new Date(post.scheduledAt).toLocaleString()}
            </span>
            {post.xPostId && (
              <a href={`https://x.com/i/status/${post.xPostId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline">
                View on X
              </a>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4} className="w-full text-sm" />
              <input type="text" value={editHashtags} onChange={(e) => setEditHashtags(e.target.value)} className="w-full text-sm" placeholder="Hashtags" />
              <input type="datetime-local" value={editScheduledAt} onChange={(e) => setEditScheduledAt(e.target.value)} className="text-sm" />
              <p className={`text-xs ${fullEditLength > 280 ? "text-red-500" : "text-gray-400"}`}>{fullEditLength}/280</p>
              <div className="flex gap-2">
                <button onClick={() => onSaveEdit(post.id, editContent, editHashtags, editScheduledAt)} disabled={fullEditLength > 280} className="btn-primary text-xs px-3 py-1 disabled:opacity-40">Save</button>
                <button onClick={onCancelEdit} className="btn-secondary text-xs px-3 py-1">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{post.content}</p>
              {post.hashtags && <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">{post.hashtags}</p>}
              {post.errorMessage && <p className="text-xs text-red-500 mt-1">Error: {post.errorMessage}</p>}
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex flex-col gap-1 shrink-0">
            {post.status === "pending" && (
              <>
                <button onClick={onEdit} className="btn-secondary text-xs px-2 py-1">Edit</button>
                <button onClick={() => onCancel(post.id)} className="btn-secondary text-xs px-2 py-1">Cancel</button>
              </>
            )}
            {post.status === "failed" && (
              <button onClick={() => onReschedule(post.id)} className="btn-secondary text-xs px-2 py-1">Retry</button>
            )}
            {post.status === "cancelled" && (
              <button onClick={() => onReschedule(post.id)} className="btn-secondary text-xs px-2 py-1">Requeue</button>
            )}
            <button onClick={() => onDelete(post.id)} className="btn-danger text-xs px-2 py-1">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default XPostsTab;
