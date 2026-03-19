#!/usr/bin/env bash
# One-off production run: write current portfolio snapshots for all users with holdings.
# Same as the hourly cron. See docs/PORTFOLIO_SNAPSHOT_MATERIALIZE.md
set -euo pipefail

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "ERROR: Set CRON_SECRET to the same value as Vercel / production env." >&2
  exit 1
fi

if [[ -z "${BASE_URL:-}" ]]; then
  echo "ERROR: Set BASE_URL (e.g. https://your-domain.com)" >&2
  exit 1
fi

curl -fsS -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${BASE_URL%/}/api/cron/portfolio-snapshots"

echo ""
