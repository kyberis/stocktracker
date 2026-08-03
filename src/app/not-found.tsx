import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center bg-[color:var(--page-background,#eef2f7)] text-[color:var(--foreground,#132033)]">
      <p className="text-6xl font-bold tabular-nums text-[color:var(--muted,#5b6c86)]">404</p>
      <h1 className="mt-4 text-xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-[color:var(--muted,#5b6c86)]">
        The page you requested does not exist or has moved.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Back to home
        </Link>
        <Link
          href="/tools"
          className="rounded-xl border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] hover:bg-[color:var(--surface-soft)]"
        >
          Tools
        </Link>
      </div>
    </main>
  );
}
