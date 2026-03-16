"use client";

import React, { useEffect, useState } from "react";

/* ── X API Keys Card ─────────────────────────────────────── */

interface XKeyState { hasKey: boolean; maskedKey: string }

function XKeysCard() {
  const [keys, setKeys] = useState<Record<string, XKeyState>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const labels: Record<string, { label: string; placeholder: string }> = {
    x_api_key: { label: "API Key", placeholder: "Enter X API Key" },
    x_api_secret: { label: "API Secret", placeholder: "Enter X API Secret" },
    x_access_token: { label: "Access Token", placeholder: "Enter Access Token" },
    x_access_token_secret: { label: "Access Token Secret", placeholder: "Enter Access Token Secret" },
  };

  useEffect(() => {
    fetch("/api/admin/x-keys", { cache: "no-store" })
      .then((r) => r.json())
      .then(setKeys)
      .catch(() => {});
  }, []);

  const handleSave = async (keyName: string) => {
    setSaving(true);
    const res = await fetch("/api/admin/x-keys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [keyName]: value.trim() }),
    });
    if (res.ok) {
      const trimmed = value.trim();
      setKeys((prev) => ({ ...prev, [keyName]: { hasKey: trimmed.length > 0, maskedKey: trimmed ? `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}` : "" } }));
      setEditing(null);
      setValue("");
    }
    setSaving(false);
  };

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">X / Twitter API Keys</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
        OAuth 1.0a credentials for automated posting. Get keys at{" "}
        <a href="https://developer.x.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="underline">developer.x.com</a>.
      </p>
      <div className="space-y-3">
        {Object.entries(labels).map(([keyName, { label, placeholder }]) => {
          const state = keys[keyName];
          const isEditing = editing === keyName;
          return (
            <div key={keyName} className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300 w-36 shrink-0">{label}</span>
              {state?.hasKey && !isEditing ? (
                <>
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{state.maskedKey}</span>
                  <button onClick={() => { setEditing(keyName); setValue(""); }} className="btn-secondary text-xs px-2 py-1">Change</button>
                </>
              ) : (
                <>
                  <input
                    type="password"
                    value={isEditing ? value : ""}
                    onChange={(e) => { setEditing(keyName); setValue(e.target.value); }}
                    onFocus={() => setEditing(keyName)}
                    placeholder={placeholder}
                    className="text-xs flex-1"
                  />
                  {isEditing && (
                    <>
                      <button onClick={() => handleSave(keyName)} disabled={saving || !value.trim()} className="btn-primary text-xs px-3 py-1 disabled:opacity-40">{saving ? "..." : "Save"}</button>
                      <button onClick={() => { setEditing(null); setValue(""); }} className="btn-secondary text-xs px-2 py-1">Cancel</button>
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default XKeysCard;
