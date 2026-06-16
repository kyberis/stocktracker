import type { Metadata } from "next";
import Link from "next/link";

import DocsSectionContent from "@/components/docs/DocsSectionContent";
import PublicFooter from "@/components/PublicFooter";
import PublicNav from "@/components/PublicNav";
import { buildPublicDocsIndex, getPublicDocsSiteUrl, listPublicDocSections } from "@/lib/public-api-docs";

export const metadata: Metadata = {
  title: "Developer documentation — trefolio API, MCP & Warren MOAT",
  description:
    "Integration guides for LLMs and agents: MCP personal access tokens, Warren MOAT, portfolio tools, OpenAPI, and Claude Desktop setup.",
  alternates: { canonical: "https://trefolio.com/docs" },
  openGraph: {
    title: "trefolio developer documentation",
    description:
      "Connect Cursor, Claude Desktop, and custom agents to your portfolio and Warren MOAT via MCP.",
    url: "https://trefolio.com/docs",
  },
};

export default function DocsIndexPage() {
  const index = buildPublicDocsIndex();
  const sections = listPublicDocSections();

  return (
    <div className="min-h-screen bg-[#faf9f7] text-slate-600">
      <PublicNav />

      <section className="pt-20 pb-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-4">
            Developers &amp; AI
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Integration documentation
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">{index.description}</p>
        </div>
      </section>

      <main className="py-12 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid sm:grid-cols-2 gap-4">
            {sections.map((section) => (
              <Link
                key={section.id}
                href={`/docs/${section.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <h2 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-700 mb-2">
                  {section.title}
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">{section.description}</p>
              </Link>
            ))}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Machine-readable discovery</h2>
            <DocsSectionContent
              content={{
                docs_json_index: `${getPublicDocsSiteUrl()}/api/docs`,
                openapi: index.openapi,
                mcp: index.mcp,
                ai_plugin: index.ai_plugin,
                llms_txt: index.llms_txt,
              }}
            />
            <p className="mt-4 text-xs text-slate-400">
              JSON section payloads remain at <code className="text-slate-600">/api/docs/&#123;section&#125;</code>{" "}
              for agents that prefer structured responses.
            </p>
          </section>

          <p className="text-sm text-slate-400 text-center">
            Not financial advice. MOAT scores and AI outputs are educational tools; do your own research.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
