import { Suspense } from "react";
import ExploreAssetSearch from "@/components/ExploreAssetSearch";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ExplorePage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const initialQuery = q ?? "";

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <Suspense
        fallback={
          <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700" />
        }
      >
        <ExploreAssetSearch initialQuery={initialQuery} />
      </Suspense>
    </main>
  );
}
