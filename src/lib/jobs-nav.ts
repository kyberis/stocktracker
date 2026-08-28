import type { TranslationKey } from "@/lib/i18n";

export const JOBS_NAV_JOBS = ["alta", "evaluar", "descubrir"] as const;
export type JobsNavJob = (typeof JOBS_NAV_JOBS)[number];

export const DEFAULT_JOBS_NAV_JOB: JobsNavJob = "evaluar";
export const JOBS_NAV_STORAGE_KEY = "trefolio_jobs_nav_job";

export type JobsNavChipKind = "href" | "add" | "warren";

export type JobsNavChip = {
  id: string;
  labelKey: TranslationKey;
  kind: JobsNavChipKind;
  href?: string;
  matches?: (pathname: string) => boolean;
};

function exactOrChild(base: string) {
  return (pathname: string) => pathname === base || pathname.startsWith(`${base}/`);
}

function exact(path: string) {
  return (pathname: string) => pathname === path;
}

export const JOBS_NAV_JOB_LABEL_KEYS: Record<JobsNavJob, TranslationKey> = {
  alta: "jobsNavAlta",
  evaluar: "jobsNavEvaluar",
  descubrir: "jobsNavDescubrir",
};

const ALTA_CHIPS: JobsNavChip[] = [
  { id: "import", labelKey: "importNav", kind: "href", href: "/import", matches: exactOrChild("/import") },
  { id: "add", labelKey: "addAsset", kind: "add" },
  { id: "warren", labelKey: "warrenName", kind: "warren" },
];

const EVALUAR_CHIPS: JobsNavChip[] = [
  { id: "home", labelKey: "homeNav", kind: "href", href: "/", matches: exact("/") },
  {
    id: "alerts",
    labelKey: "jobsNavAlerts",
    kind: "href",
    href: "/tools/alerts",
    matches: exactOrChild("/tools/alerts"),
  },
  {
    id: "portfolio",
    labelKey: "jobsNavPortfolio",
    kind: "href",
    href: "/portfolio",
    matches: exactOrChild("/portfolio"),
  },
  {
    id: "allocation",
    labelKey: "jobsNavAllocation",
    kind: "href",
    href: "/tools/taxonomy",
    matches: exactOrChild("/tools/taxonomy"),
  },
  { id: "tools", labelKey: "toolsNav", kind: "href", href: "/tools", matches: exact("/tools") },
];

const DESCUBRIR_CHIPS: JobsNavChip[] = [
  {
    id: "screener",
    labelKey: "screenerNav",
    kind: "href",
    href: "/tools/screener",
    matches: exactOrChild("/tools/screener"),
  },
  {
    id: "moat",
    labelKey: "jobsNavMoat",
    kind: "href",
    href: "/tools/evaluation",
    matches: exactOrChild("/tools/evaluation"),
  },
  {
    id: "analysis",
    labelKey: "companyAnalysisNav",
    kind: "href",
    href: "/analisis",
    matches: exactOrChild("/analisis"),
  },
  {
    id: "explore",
    labelKey: "exploreNav",
    kind: "href",
    href: "/explore",
    matches: exactOrChild("/explore"),
  },
];

const CHIPS_BY_JOB: Record<JobsNavJob, JobsNavChip[]> = {
  alta: ALTA_CHIPS,
  evaluar: EVALUAR_CHIPS,
  descubrir: DESCUBRIR_CHIPS,
};

export function isJobsNavJob(value: unknown): value is JobsNavJob {
  return typeof value === "string" && (JOBS_NAV_JOBS as readonly string[]).includes(value);
}

export function parseJobsNavJob(value: unknown): JobsNavJob {
  return isJobsNavJob(value) ? value : DEFAULT_JOBS_NAV_JOB;
}

/** Chip catalog for a job. `flags` reserved for later gated chips (e.g. screening). */
export function getChipsForJob(job: JobsNavJob, _flags: Record<string, boolean> = {}): JobsNavChip[] {
  void _flags;
  return CHIPS_BY_JOB[job];
}

export function isJobsNavChipActive(chip: JobsNavChip, pathname: string): boolean {
  if (chip.kind !== "href" || !chip.matches) return false;
  return chip.matches(pathname);
}
