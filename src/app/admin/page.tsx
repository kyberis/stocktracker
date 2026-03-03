"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "@/lib/theme-context";

interface AdminUser {
  id: string;
  username: string;
  role: "admin" | "user";
  mustChangePassword: boolean;
  createdAt: string;
}

type ProviderName = "yahoo" | "alphavantage";

function AdminContent() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<Record<string, string>>({});

  const [avProvider, setAvProvider] = useState<ProviderName>("yahoo");
  const [avApiKey, setAvApiKey] = useState("");
  const [showAvKey, setShowAvKey] = useState(false);
  const [avSaved, setAvSaved] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = await meRes.json();
      if (!meRes.ok || meData.user?.role !== "admin") {
        router.replace("/");
        return;
      }

      const [usersRes, settingsRes] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/user-settings", { cache: "no-store" }),
      ]);

      const usersData = await usersRes.json();
      if (!usersRes.ok) {
        setError(usersData.error || "Failed to load users.");
        return;
      }
      setUsers(usersData.users || []);

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setAvProvider(settings.provider === "alphavantage" ? "alphavantage" : "yahoo");
        setAvApiKey(settings.alphaVantageApiKey || "");
      }
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveApiSettings = async () => {
    try {
      const res = await fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: avProvider, alphaVantageApiKey: avApiKey }),
      });
      if (res.ok) {
        setAvSaved(true);
        setTimeout(() => setAvSaved(false), 2000);
      }
    } catch { /* ignore */ }
  };

  const handlePasswordReset = async (e: FormEvent, userId: string) => {
    e.preventDefault();
    const newPassword = resetPassword[userId] || "";
    if (!newPassword) return;

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newPassword }),
    });
    if (res.ok) {
      setResetPassword((prev) => ({ ...prev, [userId]: "" }));
    }
  };

  const handleResetData = async (userId: string, mode: "seed" | "empty") => {
    await fetch("/api/admin/reset-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mode }),
    });
  };

  const handleDelete = async (userId: string) => {
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(userId)}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin - User Management</h1>
          <button onClick={() => router.push("/")} className="btn-secondary">
            Back
          </button>
        </div>

        {!loading && !error && (
          <div className="card p-5 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Settings</h2>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Data Provider</label>
                <select
                  value={avProvider}
                  onChange={(e) => setAvProvider(e.target.value as ProviderName)}
                  className="text-sm"
                >
                  <option value="yahoo">Yahoo Finance</option>
                  <option value="alphavantage">Alpha Vantage</option>
                </select>
              </div>
              <div className="flex-1 w-full sm:w-auto">
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Alpha Vantage API Key</label>
                <div className="relative">
                  <input
                    type={showAvKey ? "text" : "password"}
                    value={avApiKey}
                    onChange={(e) => setAvApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="w-full text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAvKey(!showAvKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {showAvKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button
                onClick={handleSaveApiSettings}
                className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
              >
                {avSaved ? "Saved!" : "Save"}
              </button>
            </div>
            {avProvider === "alphavantage" && !avApiKey.trim() && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">An API key is required for Alpha Vantage.</p>
            )}
          </div>
        )}

        {loading && <p className="text-gray-500 dark:text-slate-400">Loading users...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/50">
                  <tr className="text-gray-500 dark:text-slate-400">
                    <th className="text-left p-3 font-medium">Username</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Created</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-200 align-top">
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-white">{user.username}</div>
                        {user.mustChangePassword && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">Must change password</div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                            : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 dark:text-slate-400">{new Date(user.createdAt).toLocaleString()}</td>
                      <td className="p-3 space-y-2">
                        <form
                          className="flex items-center gap-2"
                          onSubmit={(e) => handlePasswordReset(e, user.id)}
                        >
                          <input
                            type="password"
                            placeholder="New password"
                            value={resetPassword[user.id] || ""}
                            onChange={(e) =>
                              setResetPassword((prev) => ({ ...prev, [user.id]: e.target.value }))
                            }
                            className="text-xs px-2 py-1.5"
                          />
                          <button type="submit" className="btn-secondary text-xs px-2 py-1">
                            Reset password
                          </button>
                        </form>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleResetData(user.id, "seed")}
                            className="btn-secondary text-xs px-2 py-1"
                          >
                            Reset data to seed
                          </button>
                          <button
                            onClick={() => handleResetData(user.id, "empty")}
                            className="btn-secondary text-xs px-2 py-1"
                          >
                            Reset data empty
                          </button>
                          {user.username !== "admin" && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="btn-danger text-xs px-2 py-1"
                            >
                              Delete user
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <ThemeProvider>
      <AdminContent />
    </ThemeProvider>
  );
}
