"use client";

import Link from "next/link";
import ProCompareCard from "@/components/ProCompareCard";
import { useCommerceEnabled } from "@/lib/commerce";
import { useI18n } from "@/lib/i18n";

export default function BillingPage() {
  const { t } = useI18n();
  const commerceEnabled = useCommerceEnabled();

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("billingPageHeading")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-slate-400">
          {t("billingPageSubtitle")}
        </p>
      </div>

      {commerceEnabled ? (
        <ProCompareCard surface="profile_always_on" reason="upgrade_required" />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
          <p>{t("billingPageUnavailable")}</p>
          <Link href="/profile" className="mt-3 inline-block font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
            {t("profile")}
          </Link>
        </div>
      )}
    </main>
  );
}
