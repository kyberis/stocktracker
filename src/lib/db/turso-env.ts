/**
 * Resolves which Turso / libsql URL the process should use.
 * Local `next dev` and Vitest (`NODE_ENV` development | test) ignore remote Turso
 * unless explicitly opted in, so `.env.local` copied from Vercel production cannot
 * accidentally hit production data.
 */

function isTruthyEnv(v: string | undefined): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

/** Remote Turso / libSQL Platform URLs — not local `file:` SQLite. */
export function isRemoteTursoLibsqlUrl(url: string): boolean {
  return /^(libsql:|https:)/i.test(url.trim());
}

export function getRawTursoDatabaseUrl(): string | undefined {
  const v =
    process.env.TREFOLIO_TURSO_DATABASE_URL ||
    process.env.STOCKTRACKER_TURSO_DATABASE_URL ||
    process.env.stocktracker_TURSO_DATABASE_URL;
  const t = v?.trim();
  return t || undefined;
}

export function useRemoteDbInDevExplicitOptIn(): boolean {
  return (
    isTruthyEnv(process.env.TREFOLIO_USE_REMOTE_DB_IN_DEV) ||
    isTruthyEnv(process.env.STOCKTRACKER_USE_REMOTE_DB_IN_DEV)
  );
}

/** Pure resolver — exported for unit tests. */
export function resolveEffectiveTursoDatabaseUrl(input: {
  rawDatabaseUrl: string | undefined;
  isVercel: boolean;
  nodeEnv: string | undefined;
  useRemoteDbInDev: boolean;
}): string | undefined {
  const { rawDatabaseUrl, isVercel, nodeEnv, useRemoteDbInDev } = input;
  if (!rawDatabaseUrl?.trim()) return undefined;
  const url = rawDatabaseUrl.trim();
  // Explicit file-based SQLite (or non-remote schemes): always honor.
  if (!isRemoteTursoLibsqlUrl(url)) return url;
  if (isVercel) return url;
  if (useRemoteDbInDev) return url;
  if (nodeEnv === "development" || nodeEnv === "test") return undefined;
  return url;
}

let warnedIgnoredTursoInDev = false;

export function getEffectiveTursoDatabaseUrl(): string | undefined {
  const raw = getRawTursoDatabaseUrl();
  const effective = resolveEffectiveTursoDatabaseUrl({
    rawDatabaseUrl: raw,
    isVercel: Boolean(process.env.VERCEL),
    nodeEnv: process.env.NODE_ENV,
    useRemoteDbInDev: useRemoteDbInDevExplicitOptIn(),
  });

  const rawLooksRemote = raw ? isRemoteTursoLibsqlUrl(raw) : false;
  if (
    rawLooksRemote &&
    !effective &&
    (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") &&
    !warnedIgnoredTursoInDev
  ) {
    warnedIgnoredTursoInDev = true;
    console.warn(
      "[trefolio/db] Ignoring remote Turso URL while NODE_ENV=%s; using local file data/trefolio.db. " +
        "Set STOCKTRACKER_USE_REMOTE_DB_IN_DEV=true (or TREFOLIO_USE_REMOTE_DB_IN_DEV) to use Turso during dev/test.",
      process.env.NODE_ENV,
    );
  }

  return effective;
}
