"use client";

import { useState, useEffect } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import DataUpgradeNudge from "./DataUpgradeNudge";

const DISMISS_KEY = "nudge_dashboard_dismissed";

export default function DashboardUpgradeNudge() {
  const { holdings, demoMode } = usePortfolio();
  const [dismissed, setDismissed] = useState(true);
  const [hasConnection, setHasConnection] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* private browsing */
    }
  }, []);

  useEffect(() => {
    if (demoMode) return;
    if (holdings.some((h) => h.accountId)) {
      setHasConnection(true);
      return;
    }
    fetch("/api/accounts")
      .then((r) => (r.ok ? r.json() : []))
      .then((accounts: unknown[]) => { if (accounts.length > 0) setHasConnection(true); })
      .catch(() => {});
  }, [demoMode, holdings]);

  if (demoMode || dismissed || hasConnection || holdings.length === 0) return null;

  return (
    <DataUpgradeNudge
      variant="emerald"
      titleKey="nudgeDashboardTitle"
      descKey="nudgeDashboardDesc"
      dismissKey={DISMISS_KEY}
      dismissMode="permanent"
      className="mb-4"
    />
  );
}
