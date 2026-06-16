import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import DocsSectionContent from "@/components/docs/DocsSectionContent";
import PublicFooter from "@/components/PublicFooter";
import PublicNav from "@/components/PublicNav";
import {
  getPublicDocSection,
  isPublicDocSectionId,
  listPublicDocSections,
} from "@/lib/public-api-docs";

interface PageProps {
  params: Promise<{ section: string }>;
}

export function generateStaticParams() {
  return listPublicDocSections().map((section) => ({ section: section.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { section: sectionId } = await params;
  if (!isPublicDocSectionId(sectionId)) {
    return { title: "Documentation — trefolio" };
  }
  const section = getPublicDocSection(sectionId);
  if (!section) return { title: "Documentation — trefolio" };
  return {
    title: `${section.title} — trefolio docs`,
    description: section.description,
    alternates: { canonical: `https://trefolio.com/docs/${section.id}` },
  };
}

export default async function DocsSectionPage({ params }: PageProps) {
  const { section: sectionId } = await params;
  if (!isPublicDocSectionId(sectionId)) notFound();
  const section = getPublicDocSection(sectionId);
  if (!section) notFound();

  return (
    <div className="min-h-screen bg-[#faf9f7] text-slate-600">
      <PublicNav />

      <section className="pt-20 pb-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 mb-4"
          >
            ← All documentation
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">{section.title}</h1>
          <p className="text-slate-500 text-lg max-w-2xl">{section.description}</p>
        </div>
      </section>

      <main className="py-12 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <DocsSectionContent content={section.content} />
          </section>
          <p className="text-sm text-slate-400">
            JSON API:{" "}
            <Link href={section.url} className="text-emerald-600 hover:text-emerald-700 underline break-all">
              {section.url}
            </Link>
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
