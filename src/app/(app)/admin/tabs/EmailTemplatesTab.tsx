"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TabSkeleton } from "../shared";

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  subjectEs: string;
  bodyHtml: string;
  bodyHtmlEs: string;
  bodyText: string;
  bodyTextEs: string;
  category: string;
  experienceLevel: string;
  createdAt: string;
  updatedAt: string;
  stats?: { totalSent: number; delivered: number; opened: number; clicked: number; bounced: number };
}

type EditLang = "en" | "es";
type PreviewMode = "html" | "text";

const EMPTY_TEMPLATE: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt"> = {
  slug: "",
  name: "",
  subject: "",
  subjectEs: "",
  bodyHtml: "",
  bodyHtmlEs: "",
  bodyText: "",
  bodyTextEs: "",
  category: "general",
  experienceLevel: "",
};

const CATEGORIES = ["general", "onboarding", "lifecycle", "marketing", "alert", "billing"];
const EXP_LEVELS = [
  { value: "", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "experienced", label: "Experienced" },
  { value: "professional", label: "Professional" },
];

export default function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editLang, setEditLang] = useState<EditLang>("en");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("html");
  const [msg, setMsg] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email-templates");
      if (res.ok) setTemplates(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleCreate = () => {
    setEditing({ ...EMPTY_TEMPLATE, id: "", createdAt: "", updatedAt: "" } as EmailTemplate);
    setIsNew(true);
    setEditLang("en");
  };

  const handleEdit = async (t: EmailTemplate) => {
    const res = await fetch(`/api/admin/email-templates/${t.id}`);
    if (res.ok) {
      const data = await res.json();
      setEditing(data);
    } else {
      setEditing(t);
    }
    setIsNew(false);
    setEditLang("en");
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setMsg("");

    const payload = {
      slug: editing.slug,
      name: editing.name,
      subject: editing.subject,
      subjectEs: editing.subjectEs,
      bodyHtml: editing.bodyHtml,
      bodyHtmlEs: editing.bodyHtmlEs,
      bodyText: editing.bodyText,
      bodyTextEs: editing.bodyTextEs,
      category: editing.category,
      experienceLevel: editing.experienceLevel,
    };

    try {
      const res = isNew
        ? await fetch("/api/admin/email-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch(`/api/admin/email-templates/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      if (res.ok) {
        setMsg("Saved");
        setEditing(null);
        setIsNew(false);
        fetchTemplates();
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg(data.error || "Save failed");
      }
    } catch {
      setMsg("Save failed");
    }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const handleDelete = async () => {
    if (!editing || isNew) return;
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/admin/email-templates/${editing.id}`, { method: "DELETE" });
    setEditing(null);
    fetchTemplates();
  };

  const updateField = (field: string, value: string) => {
    if (!editing) return;
    setEditing({ ...editing, [field]: value });
  };

  const currentSubject = editLang === "es" ? "subjectEs" : "subject";
  const currentHtml = editLang === "es" ? "bodyHtmlEs" : "bodyHtml";
  const currentText = editLang === "es" ? "bodyTextEs" : "bodyText";

  useEffect(() => {
    if (iframeRef.current && editing && previewMode === "html") {
      const html = editing[currentHtml] || editing.bodyHtml;
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [editing, currentHtml, previewMode]);

  if (loading) return <TabSkeleton />;

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => { setEditing(null); setIsNew(false); }} className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="m15 19-7-7 7-7" /></svg>
            Back to list
          </button>
          <div className="flex items-center gap-2">
            {msg && <span className={`text-xs font-medium ${msg === "Saved" ? "text-emerald-500" : "text-red-400"}`}>{msg}</span>}
            {!isNew && (
              <button onClick={handleDelete} className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 border border-red-400/30 rounded-lg hover:bg-red-400/5">
                Delete
              </button>
            )}
            <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-50">
              {saving ? "Saving..." : isNew ? "Create" : "Save"}
            </button>
          </div>
        </div>

        {/* Meta fields */}
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">Slug</label>
            <input value={editing.slug} onChange={(e) => updateField("slug", e.target.value)} className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" placeholder="welcome-email" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">Name</label>
            <input value={editing.name} onChange={(e) => updateField("name", e.target.value)} className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" placeholder="Welcome Email" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">Category</label>
            <select value={editing.category} onChange={(e) => updateField("category", e.target.value)} className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">Experience Level</label>
            <select value={editing.experienceLevel} onChange={(e) => updateField("experienceLevel", e.target.value)} className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
              {EXP_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>

        {/* Language + Preview toggles */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden">
            {(["en", "es"] as const).map((lang) => (
              <button key={lang} onClick={() => setEditLang(lang)} className={`px-3 py-1 text-xs font-medium transition-colors ${editLang === lang ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600"}`}>
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden">
            {(["html", "text"] as const).map((mode) => (
              <button key={mode} onClick={() => setPreviewMode(mode)} className={`px-3 py-1 text-xs font-medium transition-colors ${previewMode === mode ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600"}`}>
                {mode === "html" ? "HTML" : "Plain Text"}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="card p-4">
          <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">Subject ({editLang.toUpperCase()})</label>
          <input
            value={editing[currentSubject] || ""}
            onChange={(e) => updateField(currentSubject, e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            placeholder="Email subject line..."
          />
        </div>

        {/* Body editor + preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-4">
            <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">
              {previewMode === "html" ? `HTML Body (${editLang.toUpperCase()})` : `Plain Text Body (${editLang.toUpperCase()})`}
            </label>
            <textarea
              value={previewMode === "html" ? (editing[currentHtml] || "") : (editing[currentText] || "")}
              onChange={(e) => updateField(previewMode === "html" ? currentHtml : currentText, e.target.value)}
              rows={20}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-y"
              placeholder={previewMode === "html" ? "<html>..." : "Plain text content..."}
            />
          </div>
          <div className="card p-4">
            <div className="text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">Preview</div>
            {previewMode === "html" ? (
              <iframe
                ref={iframeRef}
                className="w-full h-[480px] rounded-lg border border-gray-200 dark:border-slate-600 bg-white"
                sandbox="allow-same-origin"
                title="Email preview"
              />
            ) : (
              <pre className="w-full h-[480px] overflow-auto rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 p-3 text-xs text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
                {editing[currentText] || editing.bodyText || "(no plain text content)"}
              </pre>
            )}
          </div>
        </div>

        {/* Stats */}
        {editing.stats && editing.stats.totalSent > 0 && (
          <div className="card p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">Send Statistics</h3>
            <div className="grid grid-cols-5 gap-3">
              {([
                ["Sent", editing.stats.totalSent, "text-gray-700 dark:text-slate-300"],
                ["Delivered", editing.stats.delivered, "text-emerald-500"],
                ["Opened", editing.stats.opened, "text-sky-500"],
                ["Clicked", editing.stats.clicked, "text-violet-500"],
                ["Bounced", editing.stats.bounced, "text-red-400"],
              ] as [string, number, string][]).map(([label, val, color]) => (
                <div key={label} className="text-center">
                  <div className={`text-lg font-bold ${color}`}>{val}</div>
                  <div className="text-[10px] text-gray-500 dark:text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Templates</h2>
        <button onClick={handleCreate} className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg">
          Create Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400">No email templates yet.</p>
          <button onClick={handleCreate} className="mt-3 px-4 py-2 text-sm font-medium text-indigo-500 hover:text-indigo-400">
            Create your first template
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <th className="text-left p-3 font-medium text-[10px] uppercase">Name</th>
                <th className="text-left p-3 font-medium text-[10px] uppercase">Slug</th>
                <th className="text-left p-3 font-medium text-[10px] uppercase">Category</th>
                <th className="text-left p-3 font-medium text-[10px] uppercase">Experience</th>
                <th className="text-left p-3 font-medium text-[10px] uppercase">ES</th>
                <th className="text-left p-3 font-medium text-[10px] uppercase">Updated</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => handleEdit(t)}
                  className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/30 cursor-pointer"
                >
                  <td className="p-3 font-medium text-gray-900 dark:text-white">{t.name}</td>
                  <td className="p-3 font-mono text-gray-500 dark:text-slate-400">{t.slug}</td>
                  <td className="p-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400">{t.category}</span>
                  </td>
                  <td className="p-3 text-gray-500 dark:text-slate-400">{t.experienceLevel || "All"}</td>
                  <td className="p-3">
                    {t.subjectEs ? (
                      <span className="inline-flex w-4 h-4 rounded-full bg-emerald-500/20 items-center justify-center text-[9px] text-emerald-500">✓</span>
                    ) : (
                      <span className="text-gray-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-400 dark:text-slate-500">{new Date(t.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
