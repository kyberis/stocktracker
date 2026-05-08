/**
 * Structured, production-safe breadcrumbs for debugging OIDC / session flows.
 * Never log tokens, secrets, cookies, or password material.
 */

/** Safe request correlation (Vercel / CDN); no cookie or auth headers. */
export type HeaderBag = Pick<Headers, "get">;

export function probeInboundHeaders(h: HeaderBag): Record<string, unknown> {
  return {
    fwdHost: h.get("x-forwarded-host") ?? undefined,
    fwdProto: h.get("x-forwarded-proto") ?? undefined,
    cfRay: h.get("cf-ray") ?? undefined,
    vercelId: h.get("x-vercel-id") ?? undefined,
    requestId: h.get("x-request-id") ?? h.get("cf-request-id") ?? undefined,
  };
}

export function probeDeployFields(): Record<string, unknown> {
  return {
    vercelEnv: process.env.VERCEL_ENV,
    region: process.env.VERCEL_REGION,
    deployCommit:
      typeof process.env.VERCEL_GIT_COMMIT_SHA === "string"
        ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12)
        : undefined,
    nodeEnv: process.env.NODE_ENV,
  };
}

export function authProbeLog(
  phase: string,
  data: Record<string, unknown>,
  inboundHeaders?: HeaderBag,
): void {
  console.info(
    "[trefolio.auth.probe]",
    JSON.stringify({
      phase,
      ts: new Date().toISOString(),
      ...probeDeployFields(),
      ...(inboundHeaders ? probeInboundHeaders(inboundHeaders) : {}),
      ...data,
    }),
  );
}

export function authProbeWarn(
  phase: string,
  data: Record<string, unknown>,
  inboundHeaders?: HeaderBag,
): void {
  console.warn(
    "[trefolio.auth.probe]",
    JSON.stringify({
      phase,
      ts: new Date().toISOString(),
      ...probeDeployFields(),
      ...(inboundHeaders ? probeInboundHeaders(inboundHeaders) : {}),
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
