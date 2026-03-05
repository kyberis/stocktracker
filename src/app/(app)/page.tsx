"use client";

import { PortfolioProvider } from "@/lib/portfolio-context";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <PortfolioProvider>
      <Dashboard />
    </PortfolioProvider>
  );
}
