import type { Metadata } from "next";
import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";
import { releaseNotes, type ChangeType } from "@/lib/release-notes";

export const metadata: Metadata = {
  title: "Release Notes — trefolio",
  description:
    "See what's new in trefolio — the latest features, improvements, and fixes for your portfolio tracker.",
  alternates: { canonical: "https://trefolio.com/releasenotes" },
  openGraph: {
    title: "Release Notes — trefolio",
    description:
      "See what's new in trefolio — the latest features, improvements, and fixes for your portfolio tracker.",
    url: "https://trefolio.com/releasenotes",
    siteName: "trefolio",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Release Notes — trefolio",
    description:
      "See what's new in trefolio — the latest features, improvements, and fixes for your portfolio tracker.",
  },
};

const TYPE_STYLES: Record<ChangeType, { label: string; pill: string; dot: string }> = {
  feature: {
    label: "New",
    pill: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    dot: "bg-emerald-400",
  },
  improvement: {
    label: "Improved",
    pill: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
    dot: "bg-blue-400",
  },
  fix: {
    label: "Fixed",
    pill: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    dot: "bg-amber-400",
  },
};

export default function ReleaseNotesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <nav className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/landing"
            className="text-lg font-bold text-white hover:text-emerald-400 transition-colors"
          >
            trefolio
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-14">
          <h1 className="text-4xl font-bold text-white mb-3">Release Notes</h1>
          <p className="text-slate-400 text-lg">
            Everything new, improved, and fixed in trefolio.
          </p>
        </header>

        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-0 w-px bg-slate-800" aria-hidden="true" />

          <div className="space-y-12">
            {releaseNotes.map((release, idx) => (
              <article key={release.version} className="relative pl-8">
                <div
                  className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 ${
                    idx === 0
                      ? "border-emerald-400 bg-emerald-400/20"
                      : "border-slate-700 bg-slate-900"
                  }`}
                  aria-hidden="true"
                />

                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 ring-1 ring-slate-700">
                    v{release.version}
                  </span>
                  <time
                    dateTime={release.date}
                    className="text-xs text-slate-500"
                  >
                    {new Date(release.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  {idx === 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                      Latest
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-semibold text-white mb-4">
                  {release.title}
                </h2>

                <ul className="space-y-2.5">
                  {release.changes.map((change, ci) => {
                    const style = TYPE_STYLES[change.type];
                    return (
                      <li key={ci} className="flex items-start gap-3">
                        <span
                          className={`mt-[7px] flex-shrink-0 w-2 h-2 rounded-full ${style.dot}`}
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0">
                          <span
                            className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mr-2 ring-1 ${style.pill}`}
                          >
                            {style.label}
                          </span>
                          <span className="text-sm text-slate-300 leading-relaxed">
                            {change.text}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
