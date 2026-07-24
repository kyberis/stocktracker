import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";
import PublicNav from "@/components/PublicNav";
import AgentCard from "@/components/agents/AgentCard";
import { STUDIO_AGENTS, STUDIO_PLATFORM_POINTS } from "./agents";

export default function StudioPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-slate-600">
      <PublicNav />

      <main id="main-content">
        <section className="pt-20 pb-12 sm:pt-24 sm:pb-16">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <span className="mb-4 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-600">
              AI Studio
            </span>
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Five AI agents.{" "}
              <span className="text-emerald-500">One shared platform.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-500">
              trefolio is the umbrella for a studio of AI agents built on shared
              infrastructure. Warren — the European portfolio tracker — is the
              flagship. Clara, Will, Renata, and Roxana extend the same patterns
              into personal finance, notes, CVs, and B2B sales.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="studio-agents-heading"
          className="border-t border-slate-100 bg-gradient-to-b from-white to-slate-50/60 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2
                id="studio-agents-heading"
                className="mb-3 text-2xl font-bold text-slate-900 sm:text-3xl"
              >
                The agents
              </h2>
              <p className="mx-auto max-w-2xl text-slate-500">
                Four products you can try today, plus one production case study
                running live for a real customer.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {STUDIO_AGENTS.map((agent) => (
                <AgentCard
                  key={agent.name}
                  name={agent.name}
                  role={agent.role}
                  description={agent.description}
                  accent={agent.accent}
                  iconSrc={agent.iconSrc}
                  href={agent.href}
                  cta={agent.cta}
                  external={agent.external}
                  caseStudy={agent.caseStudy}
                />
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="studio-platform-heading"
          className="border-t border-slate-100 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2
                id="studio-platform-heading"
                className="mb-3 text-2xl font-bold text-slate-900 sm:text-3xl"
              >
                Shared platform underneath
              </h2>
              <p className="mx-auto max-w-2xl text-slate-500">
                For investors, press, and partners — the same building blocks
                across every agent, explained in plain language.
              </p>
            </div>

            <ul className="grid gap-5 sm:grid-cols-2">
              {STUDIO_PLATFORM_POINTS.map((point) => (
                <li
                  key={point.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="mb-2 text-lg font-bold text-slate-900">
                    {point.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {point.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-slate-950 py-16 text-center">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <h2 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
              Start with Warren
            </h2>
            <p className="mb-8 text-slate-400">
              Create a free trefolio account to use the portfolio tracker — then
              explore Clara, Will, and Renata from the same studio.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-colors hover:bg-emerald-600"
              >
                Sign Up Free
              </Link>
              <Link
                href="/landing"
                className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500"
              >
                Back to homepage
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
