"use client";

import React from "react";

/* ── Shared Types ─────────────────────────────────────────── */

export interface AdminUser {
  id: string;
  username: string;
  role: "admin" | "user";
  plan: "free" | "pro";
  email: string;
  displayName: string;
  authProvider: "credentials" | "google" | "apple";
  emailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastActiveAt: string;
  planExpiresAt: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  taxResidency: string;
  onboardingCompleted: boolean;
  aiCallsThisMonth: number;
  portfolioCount: number;
  holdingCount: number;
  totalHoldingsEur: number;
  cashCount: number;
  totalCashEur: number;
  transactionCount: number;
  brokerAccounts: string;
  brokerImports: string;
}

export interface UserPortfolio {
  id: string;
  name: string;
  currency: string;
  isDefault: boolean;
  holdingCount: number;
  totalValueEur: number;
}

export interface ImportEvent {
  event: string;
  metadata: string;
  createdAt: string;
}

export interface UserDetail {
  portfolios: UserPortfolio[];
  importEvents: ImportEvent[];
}

export interface LandingAnalytics {
  totalPageViews: number;
  totalCtaClicks: number;
  eventsByType: { event: string; count: number }[];
  ctaBreakdown: { cta: string; count: number }[];
  dailyViews: { date: string; views: number }[];
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface NotificationUserStats {
  userId: string;
  username: string;
  email: string;
  plan: string;
  emailSent: number;
  whatsappSent: number;
  pushSent: number;
  deviceSent: number;
  total: number;
}

export interface AnalyticsSummary {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalEvents: number;
  eventsByType: { event: string; count: number }[];
  topStocks: { ticker: string; views: number }[];
  dailyActivity: { date: string; users: number; events: number }[];
  signupsByDay: { date: string; count: number }[];
  landing: LandingAnalytics;
  funnel: FunnelStage[];
  notificationStats?: NotificationUserStats[];
  attributionBySource?: {
    source: string;
    signups: number;
    paidConversions: number;
    conversionRate: number;
  }[];
  attributionByMedium?: {
    medium: string;
    signups: number;
    paidConversions: number;
    conversionRate: number;
  }[];
  utmValidation?: {
    approved: {
      sources: string[];
      mediums: string[];
    };
    unknown: {
      sourcesSignups: number;
      mediumsSignups: number;
    };
    nonApproved: {
      sources: { value: string; signups: number }[];
      mediums: { value: string; signups: number }[];
    };
  };
  referralFunnel?: {
    linkViews: number;
    linkCopiesOrShares: number;
    signups: number;
    accepted: number;
    rewarded: number;
    rejected: number;
    topReferrers: { userId: string; displayName: string; email: string; count: number; rewardDays: number }[];
    rejectionReasons: { reason: string; count: number }[];
  };
  conversionParity?: {
    overallMatchRate: number;
    byEvent: {
      event: "signup_completed" | "checkout_started" | "checkout_completed";
      internalCount: number;
      adDispatchedCount: number;
      matchRate: number;
    }[];
  };
}

/* ── Shared Components ────────────────────────────────────── */

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

export function TabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded" />
      <div className="h-40 bg-gray-200 dark:bg-slate-700 rounded-lg" />
    </div>
  );
}

/* ── Shared Helpers ────────────────────────────────────────── */

export function relativeTime(iso: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatEur(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${Math.round(value).toLocaleString()}`;
}
