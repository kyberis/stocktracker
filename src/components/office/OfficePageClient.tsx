"use client";

import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { resolveIdpUpgradeHref } from "@/lib/idp/config";
import { planAtLeast, planOf } from "@/lib/plan-rank";
import OfficeExperience from "./OfficeExperience";
import styles from "./office.module.css";

export default function OfficePageClient() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isPro = planAtLeast(planOf(user), "pro");

  if (!isPro) {
    return (
      <div className={styles.paywallWrap}>
        <div className={styles.paywallPreview} aria-hidden>
          <OfficeExperience interactive={false} />
        </div>
        <div className={styles.paywallOverlay}>
          <div className={styles.paywallCard}>
            <h2>{t("officePaywallTitle")}</h2>
            <p>{t("officePaywallDesc")}</p>
            <a href={resolveIdpUpgradeHref({ interval: "monthly", feature: "office" })} className={styles.paywallCta}>
              {t("officePaywallCta")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <OfficeExperience interactive />;
}
