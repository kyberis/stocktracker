import { NextRequest } from "next/server";
import { ensureInitialized } from "@/lib/db/client";
import { str } from "@/lib/db/helpers";
import { isFeatureEnabled } from "@/lib/db";
import { renewCommerceComplimentaryPro } from "@/lib/commerce-complimentary-pro";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BATCH_LIMIT = 100;

const runCommerceComplimentaryRenewal = withCronLogging("commerce-complimentary-renewal", async () => {
  if (await isFeatureEnabled("commerce_enabled")) {
    return { skipped: true, reason: "commerce_enabled flag is on" };
  }

  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id FROM users
          WHERE commerce_complimentary_at != ''
            AND stripe_subscription_id = ''
            AND plan_expires_at != ''
            AND plan_expires_at < datetime('now')
          LIMIT ?`,
    args: [BATCH_LIMIT],
  });

  let renewed = 0;
  let errors = 0;

  for (const row of result.rows) {
    const userId = str(row.id);
    try {
      const outcome = await renewCommerceComplimentaryPro(userId);
      if (outcome.renewed) renewed++;
    } catch (err) {
      console.error(`[cron:commerce-complimentary-renewal] user ${userId}:`, err);
      errors++;
    }
  }

  return { renewed, errors, scanned: result.rows.length };
});

function authorize(req: NextRequest) {
  return verifyCronAuth("commerce-complimentary-renewal", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runCommerceComplimentaryRenewal();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runCommerceComplimentaryRenewal();
}
