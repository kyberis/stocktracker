"use client";

import React, { useState, useEffect } from "react";
import { StatCard } from "../shared";

/* ── Docs Tab ────────────────────────────────────────────── */

interface DocEntry {
  name: string;
  path: string;
  dir: string;
  sizeKb: number;
  modifiedAt: string;
  type: string;
}

function DocsTab() {
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/docs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDocs(d.docs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function openDoc(doc: DocEntry) {
    setPreviewPath(doc.path);
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: doc.path }),
      });
      if (res.ok) {
        const html = await res.text();
        setPreviewHtml(html);
      }
    } catch { /* ignore */ }
    setPreviewLoading(false);
  }

  if (loading) return <p className="text-gray-500 dark:text-slate-400">Loading documents...</p>;

  if (previewPath) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setPreviewPath(null); setPreviewHtml(""); }}
            className="inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to documents
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-mono">{previewPath}</span>
            <button
              onClick={() => {
                const blob = new Blob([previewHtml], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank");
                setTimeout(() => URL.revokeObjectURL(url), 5000);
              }}
              className="inline-flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Open in new tab
            </button>
          </div>
        </div>
        {previewLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <div className="card p-0 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
            <iframe
              srcDoc={previewHtml}
              className="w-full border-0"
              style={{ height: "80vh" }}
              title={previewPath}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}
      </div>
    );
  }

  const grouped = docs.reduce<Record<string, DocEntry[]>>((acc, doc) => {
    const dir = doc.dir === "." ? "root" : doc.dir;
    if (!acc[dir]) acc[dir] = [];
    acc[dir].push(doc);
    return acc;
  }, {});

  const dirLabels: Record<string, string> = {
    docs: "Planning & Strategy",
    public: "Public Assets",
    "lilygo-t4s3": "Device Mockups",
    root: "Root",
  };

  const dirIcons: Record<string, string> = {
    docs: "📊",
    public: "🌐",
    "lilygo-t4s3": "📱",
    root: "📁",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Documents" value={docs.length} />
        <StatCard label="Directories" value={Object.keys(grouped).length} />
      </div>

      {Object.entries(grouped).map(([dir, dirDocs]) => (
        <div key={dir} className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span>{dirIcons[dir] || "📁"}</span>
            {dirLabels[dir] || dir}
            <span className="text-xs text-gray-400 dark:text-slate-500 font-normal">({dirDocs.length})</span>
          </h3>
          <div className="grid gap-2">
            {dirDocs.map((doc) => (
              <button
                key={doc.path}
                onClick={() => openDoc(doc)}
                className="card p-4 text-left hover:border-indigo-400 dark:hover:border-indigo-500/40 transition-all hover:shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">html</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {doc.name.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-0.5">{doc.path}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400 dark:text-slate-500">{doc.sizeKb} KB</span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      {new Date(doc.modifiedAt).toLocaleDateString()}
                    </span>
                    <svg className="w-4 h-4 text-gray-400 dark:text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default DocsTab;
