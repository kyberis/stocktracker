#!/usr/bin/env node
/**
 * Prints the Phase 6 unified-accounts cutover sequence and optionally validates
 * env vars already loaded (e.g. `node --env-file=.env.local scripts/idp-cutover-checklist.mjs`).
 *
 * Canonical doc: knowledge/runbooks/unified-accounts-cutover.md
 */

const RUNBOOK = "knowledge/runbooks/unified-accounts-cutover.md";

function main() {
  console.log(`
Unified accounts cutover (trefolio ↔ user.trefolio.com)
======================================================
Full steps: ${RUNBOOK}

1) Vercel (trefolio): FREEZE_LOCAL_USER_WRITES=true → deploy
2) From repo root (with IDP_BASE_URL + IDP_SERVICE_TOKEN):
     npm run idp:migrate-all-users
3) Vercel (trefolio): confirm IDP_BASE_URL / IDP_ISSUER / IDP_CLIENT_ID /
     IDP_CLIENT_SECRET / IDP_SERVICE_TOKEN are set → deploy
     (/login + /signup bridge into OIDC; legacy auth APIs return 410 when IdP
     is fully configured; local billing webhook keeps only device-grant Leaf flow)

IdP (user.trefolio.com) must register client_id trefolio with redirect_uri
matching this deployment (see external/accounts/src/lib/oidc.ts STATIC_CLIENTS).
`);

  const need = ["IDP_BASE_URL", "IDP_CLIENT_ID", "IDP_CLIENT_SECRET", "IDP_SERVICE_TOKEN"];
  const missing = need.filter((k) => !process.env[k]?.trim());
  if (missing.length === 0) {
    console.log("Env check: IDP_BASE_URL, IDP_CLIENT_ID, IDP_CLIENT_SECRET, IDP_SERVICE_TOKEN are set.\n");
  } else if (missing.length === need.length) {
    console.log(
      "Env check: (none loaded) Pass --env-file or run:\n  node --env-file=.env.local scripts/idp-cutover-checklist.mjs\n",
    );
  } else {
    console.warn(`Env check: missing — ${missing.join(", ")}\n`);
  }

  const idpCore = ["IDP_BASE_URL", "IDP_CLIENT_ID", "IDP_CLIENT_SECRET"].every(
    (k) => Boolean(process.env[k]?.trim()),
  );
  if (idpCore) {
    console.log(
      "IdP OAuth client configured → OIDC-only product login; trefolio billing webhook handles only device-grant (Leaf); Pro entitlements + checkout live on IdP.\n",
    );
  } else {
    console.log(
      "IdP client not fully configured (need IDP_BASE_URL, IDP_CLIENT_ID, IDP_CLIENT_SECRET) → product /login shows IdP-not-configured bridge; local E2E can omit secret for password signup.\n",
    );
  }

  const billingIdp = process.env.BILLING_REDIRECT_TO_IDP;
  if (billingIdp === "true" || billingIdp === "false") {
    console.log(
      `Note: BILLING_REDIRECT_TO_IDP is deprecated/unused in app code — IdP upgrade/portal URLs come from IDP_ISSUER/IDP_BASE_URL. Current value: ${billingIdp}.\n`,
    );
  }

  if (process.env.FREEZE_LOCAL_USER_WRITES === "true") {
    console.log("FREEZE_LOCAL_USER_WRITES=true → legacy signup creates no new local users.\n");
  }
}

main();
