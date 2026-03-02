"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AdminUser {
  id: string;
  username: string;
  role: "admin" | "user";
  mustChangePassword: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<Record<string, string>>({});

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

      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load users.");
        return;
      }
      setUsers(data.users || []);
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
    <main className="min-h-screen bg-slate-900 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Admin - User Management</h1>
          <button onClick={() => router.push("/")} className="btn-secondary">
            Back
          </button>
        </div>

        {loading && <p className="text-slate-400">Loading users...</p>}
        {error && <p className="text-red-400">{error}</p>}

        {!loading && !error && (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800">
                  <tr className="text-slate-300">
                    <th className="text-left p-3">Username</th>
                    <th className="text-left p-3">Role</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-slate-700 text-slate-200 align-top">
                      <td className="p-3">
                        <div className="font-medium">{user.username}</div>
                        {user.mustChangePassword && (
                          <div className="text-xs text-amber-400 mt-1">Must change password</div>
                        )}
                      </td>
                      <td className="p-3">{user.role}</td>
                      <td className="p-3">{new Date(user.createdAt).toLocaleString()}</td>
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
                            className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700"
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
