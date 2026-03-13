"use client";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 dark:bg-slate-700 ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function HeroSkeleton() {
  return (
    <div className="card px-5 py-4">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-10 w-56 mb-3" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="flex gap-5 mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
        <div>
          <Skeleton className="h-2.5 w-10 mb-1.5" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div>
          <Skeleton className="h-2.5 w-14 mb-1.5" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div>
          <Skeleton className="h-2.5 w-16 mb-1.5" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div>
          <Skeleton className="h-2.5 w-12 mb-1.5" />
          <Skeleton className="h-4 w-8" />
        </div>
      </div>
      <Skeleton className="h-1.5 w-full rounded-full mt-3" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-slate-700">
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
        <Skeleton className="h-3 w-32" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
          <div className="flex-1 min-w-0 mr-4">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-16 hidden sm:block rounded" />
            <div className="text-right">
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card p-5">
      <Skeleton className="h-4 w-40 mb-4" />
      <div style={{ aspectRatio: "2.8/1", maxHeight: "min(320px, 45vh)" }} className="flex items-end gap-1 px-2 pb-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}
