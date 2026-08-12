"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import ExperimentMetricsCatalogPanel from "@/components/admin/ExperimentMetricsCatalogPanel";

export default function AdminExperimentMetricsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/");
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="p-6 text-sm text-gray-500 dark:text-slate-400">Loading…</div>
    );
  }

  if (user.role !== "admin") return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
            Experiments
          </p>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Metrics catalog
          </h1>
        </div>
        <Link href="/admin/experiments" className="btn-secondary text-sm">
          ← Back to experiments
        </Link>
      </div>

      <div className="card p-4 sm:p-5">
        <ExperimentMetricsCatalogPanel />
      </div>
    </div>
  );
}
