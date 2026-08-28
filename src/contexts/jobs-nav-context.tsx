"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_JOBS_NAV_JOB,
  JOBS_NAV_STORAGE_KEY,
  parseJobsNavJob,
  type JobsNavJob,
} from "@/lib/jobs-nav";

type JobsNavContextValue = {
  job: JobsNavJob;
  setJob: (job: JobsNavJob) => void;
};

const JobsNavContext = createContext<JobsNavContextValue | null>(null);

function readStoredJob(): JobsNavJob {
  if (typeof window === "undefined") return DEFAULT_JOBS_NAV_JOB;
  try {
    return parseJobsNavJob(window.localStorage.getItem(JOBS_NAV_STORAGE_KEY));
  } catch {
    return DEFAULT_JOBS_NAV_JOB;
  }
}

export function JobsNavProvider({ children }: { children: ReactNode }) {
  const [job, setJobState] = useState<JobsNavJob>(DEFAULT_JOBS_NAV_JOB);

  useEffect(() => {
    setJobState(readStoredJob());
  }, []);

  const setJob = useCallback((next: JobsNavJob) => {
    setJobState(next);
    try {
      window.localStorage.setItem(JOBS_NAV_STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const value = useMemo(() => ({ job, setJob }), [job, setJob]);

  return <JobsNavContext.Provider value={value}>{children}</JobsNavContext.Provider>;
}

export function useJobsNav(): JobsNavContextValue {
  const ctx = useContext(JobsNavContext);
  if (!ctx) {
    throw new Error("useJobsNav must be used within JobsNavProvider");
  }
  return ctx;
}
