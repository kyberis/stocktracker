"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Send, Globe, Users, Lock } from "lucide-react";
import Link from "next/link";

const POST_TYPES = [
  { key: "article", label: "Article" },
  { key: "analysis", label: "Analysis" },
  { key: "trade_idea", label: "Trade Idea" },
  { key: "portfolio_update", label: "Portfolio Update" },
  { key: "link", label: "Link" },
];

const VISIBILITY_OPTIONS = [
  { key: "public", label: "Public", desc: "Anyone can see this post", icon: Globe },
  { key: "network", label: "My Network", desc: "Only your connections can see this post", icon: Users },
  { key: "private", label: "Private", desc: "Only you can see this post", icon: Lock },
];

export default function ComposePostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("article");
  const [visibility, setVisibility] = useState("public");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(isDraft: boolean) {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: `<p>${content.replace(/\n/g, "</p><p>")}</p>`,
          contentFormat: "html",
          visibility,
          postType,
          isDraft,
        }),
      });
      if (res.ok) {
        router.push("/network");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-6">
      <Link href="/network" className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft size={14} /> Back to feed
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] mb-6">Create Post</h1>

      {/* Post Type */}
      <div className="mb-6">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Post Type</label>
        <div className="flex flex-wrap gap-2">
          {POST_TYPES.map(t => (
            <button key={t.key} onClick={() => setPostType(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                postType === t.key ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--foreground)]"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Post title..."
          className="w-full rounded-[var(--radius-card,16px)] border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-lg font-bold text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none" />
      </div>

      {/* Content */}
      <div className="mb-6">
        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder="Share your insight, analysis, or update..."
          rows={14}
          className="w-full rounded-[var(--radius-card,16px)] border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-[15px] leading-relaxed text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none resize-none" />
      </div>

      {/* Visibility */}
      <div className="mb-8">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Visibility</label>
        <div className="grid grid-cols-3 gap-3">
          {VISIBILITY_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => setVisibility(opt.key)}
              className={`flex flex-col items-center gap-2 rounded-[var(--radius-card,16px)] border p-4 text-center transition-colors ${
                visibility === opt.key
                  ? "border-[var(--accent)] bg-[var(--accent-light,rgba(16,185,129,0.1))]"
                  : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted)]"
              }`}>
              <opt.icon size={20} className={visibility === opt.key ? "text-[var(--accent)]" : "text-[var(--muted)]"} />
              <span className={`text-sm font-semibold ${visibility === opt.key ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>{opt.label}</span>
              <span className="text-[11px] text-[var(--muted)]">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-5">
        <button onClick={() => handleSubmit(true)} disabled={saving || !content.trim()}
          className="btn-secondary inline-flex items-center gap-1.5 text-sm font-semibold disabled:opacity-40">
          <Save size={14} /> Save Draft
        </button>
        <button onClick={() => handleSubmit(false)} disabled={saving || !content.trim()}
          className="btn-primary inline-flex items-center gap-1.5 text-sm font-semibold disabled:opacity-40">
          <Send size={14} /> Publish Post
        </button>
      </div>
    </div>
  );
}
