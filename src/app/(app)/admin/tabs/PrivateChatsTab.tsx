"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Copy, Check, Trash2, MessageSquare, ExternalLink } from "lucide-react";

interface ChatParticipant {
  userId: string;
  displayName: string;
  avatarUrl: string;
  membershipStatus?: string;
}

interface ChatRoom {
  id: string;
  createdBy: string;
  label: string;
  isActive: boolean;
  createdAt: string;
  messageCount: number;
  participants?: ChatParticipant[];
}

function PrivateChatsTab() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [kickingId, setKickingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user?.id) setAdminUserId(d.user.id);
      })
      .catch(() => {});
  }, []);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/chats", { cache: "no-store" });
      if (res.ok) {
        const data: ChatRoom[] = await res.json();
        const withParts = await Promise.all(
          data.map(async (room) => {
            try {
              const pr = await fetch(`/api/admin/chats/${room.id}/participants`, { cache: "no-store" });
              if (!pr.ok) return { ...room, participants: [] as ChatParticipant[] };
              const pj = await pr.json();
              return { ...room, participants: pj.participants || [] };
            } catch {
              return { ...room, participants: [] as ChatParticipant[] };
            }
          })
        );
        setRooms(withParts);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() }),
      });
      if (res.ok) {
        setLabel("");
        loadRooms();
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/chats/${id}`, { method: "DELETE" });
      if (res.ok) loadRooms();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  function copyLink(id: string) {
    const url = `${window.location.origin}/chat/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  async function kickParticipant(roomId: string, userId: string, displayName: string) {
    if (!window.confirm(`Remove ${displayName || userId} from this chat? They can rejoin if a slot opens.`)) return;
    setKickingId(`${roomId}:${userId}`);
    try {
      const res = await fetch(`/api/admin/chats/${roomId}/participants/${userId}`, { method: "DELETE" });
      if (res.ok) loadRooms();
    } catch {
      // ignore
    } finally {
      setKickingId(null);
    }
  }

  const activeRooms = rooms.filter((r) => r.isActive);
  const inactiveRooms = rooms.filter((r) => !r.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Private Chat Rooms
        </h2>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex items-center gap-3">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Chat label (optional)"
          className="flex-1 max-w-sm px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {creating ? "Creating…" : "Create Chat"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading…</p>
      ) : activeRooms.length === 0 && inactiveRooms.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          No chat rooms yet. Create one above.
        </p>
      ) : (
        <>
          {/* Active rooms */}
          {activeRooms.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                Active ({activeRooms.length})
              </h3>
              <div className="divide-y divide-gray-200 dark:divide-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                {activeRooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {room.label || `Chat ${room.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {room.messageCount} messages · Created{" "}
                          {new Date(room.createdAt + "Z").toLocaleDateString()}
                        </p>
                        {room.participants && room.participants.length > 0 && (
                          <ul className="mt-2 text-xs text-gray-600 dark:text-slate-400 space-y-1">
                            {room.participants.map((p) => (
                              <li key={p.userId} className="flex items-center justify-between gap-2">
                                <span className="truncate">
                                  {p.displayName}
                                  <span className="text-gray-400 dark:text-slate-500 font-mono ml-1">({p.userId.slice(0, 8)}…)</span>
                                </span>
                                {adminUserId && p.userId !== adminUserId && (
                                  <button
                                    type="button"
                                    onClick={() => kickParticipant(room.id, p.userId, p.displayName)}
                                    disabled={kickingId === `${room.id}:${p.userId}`}
                                    className="shrink-0 text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                                  >
                                    {kickingId === `${room.id}:${p.userId}` ? "Removing…" : "Remove"}
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`/chat/${room.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        title="Open chat"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => copyLink(room.id)}
                        className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        title="Copy link"
                      >
                        {copiedId === room.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeactivate(room.id)}
                        disabled={deletingId === room.id}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                        title="Deactivate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive rooms */}
          {inactiveRooms.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                Deactivated ({inactiveRooms.length})
              </h3>
              <div className="divide-y divide-gray-200 dark:divide-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden opacity-60">
                {inactiveRooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-slate-400 truncate">
                          {room.label || `Chat ${room.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {room.messageCount} messages · Created{" "}
                          {new Date(room.createdAt + "Z").toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PrivateChatsTab;
