import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { releaseNotes, type ChangeType } from "@/lib/release-notes";
import { verifySessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

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

export default async function AdminReleaseNotesPage() {
  const token = cookies().get("trefolio_session")?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session || session.role !== "admin") {
    redirect("/");
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Release Notes</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Full internal changelog including operational and admin-only updates.
        </p>
      </header>

      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-0 w-px bg-gray-200 dark:bg-slate-700" aria-hidden="true" />

        <div className="space-y-10">
          {releaseNotes.map((release, idx) => (
            <article key={release.version} className="relative pl-8">
              <div
                className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 ${
                  idx === 0
                    ? "border-emerald-400 bg-emerald-400/20"
                    : "border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                }`}
                aria-hidden="true"
              />

              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 ring-1 ring-gray-200 dark:ring-slate-700">
                  v{release.version}
                </span>
                <time dateTime={release.date} className="text-xs text-gray-500 dark:text-slate-500">
                  {new Date(release.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                {idx === 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                    Latest
                  </span>
                )}
              </div>

              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
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
                        <span className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
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
  );
}
