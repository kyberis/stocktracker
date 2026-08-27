"use client";

import HomeV2Dashboard from "@/components/homepage/HomeV2Dashboard";

/** Default authenticated home — unified daily check-in (Home v2). */
export default function DashboardShell({
  agentIntroAlreadyShownToday = false,
}: {
  agentIntroAlreadyShownToday?: boolean;
}) {
  return <HomeV2Dashboard agentIntroAlreadyShownToday={agentIntroAlreadyShownToday} />;
}
