"use client";

import { useState, useEffect } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import DataUpgradeNudge from "./DataUpgradeNudge";

const DISMISS_KEY = "nudge_dashboard_dismissed";

export default function DashboardUpgradeNudge() {
  const { holdings, demoMode } = usePortfolio();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* private browsing */
    }
  }, []);

  const hasBrokerData = holdings.some((h) => h.accountId);

  if (demoMode || dismissed || hasBrokerData || holdings.length === 0) return null;

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
