"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SubscriptionPlan } from "@/lib/types";
import type { FeatureQuotaKey, QuotaWindow } from "@/lib/platform-config";

export interface AuthQuotaUsage {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  window: QuotaWindow;
}

export type AuthQuotas = Partial<Record<FeatureQuotaKey, AuthQuotaUsage>>;

type AuthUserRole = "admin" | "user";

type AuthProvider = "credentials" | "google" | "apple" | "passkey";

interface AuthUser {
  id: string;
  username: string;
  role: AuthUserRole;
  mustChangePassword: boolean;
  email: string;
  displayName: string;
  avatarUrl: string;
  plan: SubscriptionPlan;
  planExpiresAt: string;
  aiCallsThisMonth: number;
  aiCallsResetAt: string;
  aiCallsToday: number;
  aiDailyResetAt: string;
  aiTokensThisMonth: number;
  aiTokensToday: number;
  aiTokenLimit: number;
  emailVerified: boolean;
  authProvider: AuthProvider;
  googleLinked: boolean;
  passkeyCount: number;
  portfolioReviewCount: number;
  portfolioReviewResetAt: string;
  deviceProEligible: boolean;
  devicePortfolioId: string;
  lastActiveAt: string;
  taxResidency: string;
  onboardingCompleted: boolean;
  trialActivatedAt: string;
  impersonation: { impersonatorId: string; impersonatorUsername: string } | null;
  quotas?: AuthQuotas;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  exitImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      const u = data.user;
      setUser(
        u
          ? { ...u, impersonation: u.impersonation ?? null }
          : null,
      );
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, []);

  const exitImpersonation = useCallback(async () => {
    const res = await fetch("/api/auth/exit-impersonation", { method: "POST" });
    if (!res.ok) return;
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/admin/users";
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, isLoading, refreshUser, logout, exitImpersonation }),
    [user, isLoading, refreshUser, logout, exitImpersonation]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
