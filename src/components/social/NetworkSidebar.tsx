"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, UserPlus, Users, Search, MessageCircle } from "lucide-react";

interface NetworkSidebarProps {
  profile: {
    displayName: string;
    profileSlug: string;
    avatarUrl: string;
    connectionCount: number;
    postCount: number;
  } | null;
  pendingCount?: number;
}

export function NetworkSidebar({ profile, pendingCount = 0 }: NetworkSidebarProps) {
  const pathname = usePathname();
  const initials = (profile?.displayName || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const links = [
    { href: "/network", label: "My Feed", icon: Home },
    { href: profile?.profileSlug ? `/u/${profile.profileSlug}` : "/profile", label: "View my profile", icon: User },
    { href: "/network/connections?tab=pending", label: "Pending requests", icon: UserPlus, badge: pendingCount },
    { href: "/network/connections", label: "My connections", icon: Users },
    { href: "/network/search", label: "Find people", icon: Search },
    { href: "/network/conversations", label: "Conversations", icon: MessageCircle },
  ];

  return (
    <aside className="sticky top-20 flex flex-col gap-4">
      <div className="card p-5 text-center">
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-2xl font-bold text-white">
          {initials}
        </div>
        <h3 className="text-base font-bold text-[var(--foreground)]">{profile?.displayName || "Set up profile"}</h3>
        <p className="mt-0.5 text-sm text-[var(--muted)]">@{profile?.profileSlug || "..."}</p>
        <div className="mt-3 border-t border-[var(--border)] pt-3 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Connections</span><span className="font-semibold text-[var(--foreground)]">{profile?.connectionCount || 0}</span></div>
          <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Posts</span><span className="font-semibold text-[var(--foreground)]">{profile?.postCount || 0}</span></div>
        </div>
      </div>
      <div className="card p-3">
        <nav className="flex flex-col gap-0.5">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href}
                className={`flex items-center gap-2.5 rounded-[var(--radius-button,8px)] px-3 py-2.5 text-sm transition-colors ${
                  active ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
                }`}>
                <link.icon size={16} />
                {link.label}
                {link.badge ? (
                  <span className="ml-auto rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-bold text-white">{link.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
