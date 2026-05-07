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
3) Vercel (trefolio): USE_LEGACY_AUTH=false AND BILLING_REDIRECT_TO_IDP=true
     (set both in one deploy: local Stripe webhook no-ops only when
     USE_LEGACY_AUTH=false; upgrade/portal must hit user.trefolio.com)
   → deploy

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

  const legacy = process.env.USE_LEGACY_AUTH;
  if (legacy === "false") {
    console.log("USE_LEGACY_AUTH=false → login/signup use OIDC only; local billing webhook is a no-op.\n");
  } else {
    console.log(`USE_LEGACY_AUTH=${legacy ?? "(unset, defaults to legacy on)"} → local login still allowed if routes exist.\n`);
  }

  const billingIdp = process.env.BILLING_REDIRECT_TO_IDP;
  if (billingIdp === "true") {
    console.log("BILLING_REDIRECT_TO_IDP=true → checkout/portal links go to user.trefolio.com.\n");
  } else {
    console.log(
      `BILLING_REDIRECT_TO_IDP=${billingIdp ?? "(unset)"} → trefolio uses local /api/billing/checkout and /api/billing/portal unless true.\n`,
    );
  }
  if (legacy !== "false" && billingIdp === "true") {
    console.warn(
      "Warning: BILLING_REDIRECT_TO_IDP=true with USE_LEGACY_AUTH still on → Stripe may update entitlements on BOTH IdP and trefolio webhooks. Prefer flipping both together (see runbook Step 3).\n",
    );
  }

  if (process.env.FREEZE_LOCAL_USER_WRITES === "true") {
    console.log("FREEZE_LOCAL_USER_WRITES=true → legacy signup creates no new local users.\n");
  }
}

main();
