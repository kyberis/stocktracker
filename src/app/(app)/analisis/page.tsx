import CompanyAnalysisSearch from "@/components/company-analysis/CompanyAnalysisSearch";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function CompanyAnalysisPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <CompanyAnalysisSearch initialQuery={q?.trim() || ""} />
    </main>
  );
}
