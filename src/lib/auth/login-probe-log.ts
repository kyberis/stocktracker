/**
 * Structured, production-safe breadcrumbs for debugging OIDC / session flows.
 * Never log tokens, secrets, cookies, or password material.
 */
export function authProbeLog(phase: string, data: Record<string, unknown>): void {
  console.info(
    "[trefolio.auth.probe]",
    JSON.stringify({
      phase,
      ts: new Date().toISOString(),
      ...data,
    }),
  );
}

export function authProbeWarn(phase: string, data: Record<string, unknown>): void {
  console.warn(
    "[trefolio.auth.probe]",
    JSON.stringify({
      phase,
      ts: new Date().toISOString(),
      ...data,
    }),
  );
}

/** Email local-part redacted; keeps domain for support correlation. */
export function emailProbeHint(email: string | undefined | null): string | undefined {
  if (!email) return undefined;
  const at = email.indexOf("@");
  if (at <= 0) return "(no-domain)";
  const domain = email.slice(at + 1).toLowerCase();
  return `*@${domain}`;
}

export function subTail(sub: string): string {
  if (sub.length <= 10) return "***";
  return `…${sub.slice(-8)}`;
}
