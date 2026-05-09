#!/usr/bin/env node
/**
 * Calls the IdP admin endpoint POST /v1/admin/users/profile-import for one user.
 * Requires IDP_BASE_URL and IDP_SERVICE_TOKEN in the environment.
 *
 * Usage:
 *   node scripts/idp-profile-import-one.mjs --sub usr_abc \\
 *     [--mode fill_empty|overwrite] [--name "Jane"] [--avatar_url https://...] [--tax_residency ES]
 *
 * Does not read Turso/Postgres; pair with your own export queries for batch backfill.
 */

const base = process.env.IDP_BASE_URL?.trim().replace(/\/+$/, "");
const token = process.env.IDP_SERVICE_TOKEN?.trim();

function parseArgs(argv) {
  const out = { mode: "fill_empty" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sub" && argv[i + 1]) {
      out.sub = argv[++i];
    } else if (a === "--mode" && argv[i + 1]) {
      out.mode = argv[++i];
    } else if (a === "--name" && argv[i + 1]) {
      out.name = argv[++i];
    } else if (a === "--avatar_url" && argv[i + 1]) {
      out.avatar_url = argv[++i];
    } else if (a === "--tax_residency" && argv[i + 1]) {
      out.tax_residency = argv[++i];
    }
  }
  return out;
}

async function main() {
  if (!base || !token) {
    console.error("Set IDP_BASE_URL and IDP_SERVICE_TOKEN.");
    process.exit(1);
  }
  const args = parseArgs(process.argv);
  if (!args.sub) {
    console.error("Missing required --sub usr_…");
    process.exit(1);
  }

  const body = {
    sub: args.sub,
    mode: args.mode === "overwrite" ? "overwrite" : "fill_empty",
  };
  if (args.name !== undefined) body.name = args.name;
  if (args.avatar_url !== undefined) body.avatar_url = args.avatar_url;
  if (args.tax_residency !== undefined) body.tax_residency = args.tax_residency;

  const res = await fetch(`${base}/api/v1/admin/users/profile-import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(res.status, text);
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
