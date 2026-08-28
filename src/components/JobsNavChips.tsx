"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgentChrome } from "@/contexts/agent-chrome-context";
import { usePortfolioCommand } from "@/contexts/portfolio-command-context";
import { useJobsNav } from "@/contexts/jobs-nav-context";
import { useFeatureFlags } from "@/lib/feature-flag-context";
import { getChipsForJob, isJobsNavChipActive, type JobsNavChip } from "@/lib/jobs-nav";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";

const chipClass = (active: boolean) =>
  `inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 sm:min-h-8 ${
    active
      ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
      : "border-gray-200/90 text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-600/80 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800/80"
  }`;

export default function JobsNavChips() {
  const { t } = useI18n();
  const track = useTrack();
  const pathname = usePathname();
  const { job } = useJobsNav();
  const flags = useFeatureFlags();
  const { gatedAdd } = usePortfolioCommand();
  const { openWarren } = useAgentChrome();
  const chips = getChipsForJob(job, flags);

  function onAction(chip: JobsNavChip) {
    track("jobs_nav_chip_clicked", { job, chip: chip.id });
    if (chip.kind === "add") {
      gatedAdd("stock");
      return;
    }
    if (chip.kind === "warren") {
      openWarren();
    }
  }

  return (
    <nav
      className="w-full min-w-0 overflow-x-auto overflow-y-hidden py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label={t("jobsNavChipsAriaLabel")}
    >
      <ul className="m-0 flex w-max min-w-0 list-none flex-nowrap items-center gap-1.5 p-0">
        {chips.map((chip) => {
          const active = isJobsNavChipActive(chip, pathname);
          if (chip.kind === "href" && chip.href) {
            return (
              <li key={chip.id} className="shrink-0 snap-start">
                <Link
                  href={chip.href}
                  className={chipClass(active)}
                  aria-current={active ? "page" : undefined}
                  onClick={() => track("jobs_nav_chip_clicked", { job, chip: chip.id })}
                >
                  {t(chip.labelKey)}
                </Link>
              </li>
            );
          }
          return (
            <li key={chip.id} className="shrink-0 snap-start">
              <button type="button" className={chipClass(false)} onClick={() => onAction(chip)}>
                {t(chip.labelKey)}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
