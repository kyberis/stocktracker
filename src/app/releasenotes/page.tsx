import type { Metadata } from "next";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import { publicReleaseNotes, type ChangeType } from "@/lib/release-notes-public";

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
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  improvement: {
    label: "Improved",
    pill: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
  },
  fix: {
    label: "Fixed",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
};

export default function ReleaseNotesPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-slate-600">
      <PublicNav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-14">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Release Notes</h1>
          <p className="text-slate-500 text-lg">
            Everything new, improved, and fixed in trefolio.
          </p>
        </header>

        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-0 w-px bg-slate-200" aria-hidden="true" />

          <div className="space-y-12">
            {publicReleaseNotes.map((release, idx) => (
              <article key={release.version} className="relative pl-8">
                <div
                  className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 ${
                    idx === 0
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-300 bg-white"
                  }`}
                  aria-hidden="true"
                />

                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white text-slate-700 ring-1 ring-slate-200 shadow-sm">
                    v{release.version}
                  </span>
                  <time
                    dateTime={release.date}
                    className="text-xs text-slate-400"
                  >
                    {new Date(release.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  {idx === 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                      Latest
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-semibold text-slate-900 mb-4">
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
                          <span className="text-sm text-slate-600 leading-relaxed">
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
