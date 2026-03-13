import { NextRequest, NextResponse } from "next/server";
import { withCronLogging } from "@/lib/cron-logging";
import { ensureInitialized } from "@/lib/db/client";
import { str } from "@/lib/db/helpers";
import { createNotification } from "@/lib/db/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * Tax rules that must be reviewed annually.
 * Each entry identifies the file, constant, and when it typically updates.
 */
interface TaxRuleCheck {
  country: string;
  rule: string;
  file: string;
  constant: string;
  lastVerifiedYear: number;
  urgency: "high" | "medium" | "low";
  note: string;
}

function getTaxRuleChecks(currentYear: number): TaxRuleCheck[] {
  return [
    // Netherlands — changes every year
    {
      country: "NL",
      rule: "Box 3 deemed return rates",
      file: "src/lib/tax/countries/nl.ts",
      constant: "DEEMED_RATES",
      lastVerifiedYear: 2024,
      urgency: "high",
      note: "Published every December by Belastingdienst. Rates for bank/investments/debts change annually.",
    },
    {
      country: "NL",
      rule: "Box 3 tax-free threshold (heffingsvrij vermogen)",
      file: "src/lib/tax/countries/nl.ts",
      constant: "THRESHOLDS",
      lastVerifiedYear: 2025,
      urgency: "high",
      note: "Adjusted annually for inflation. Published alongside deemed rates.",
    },
    {
      country: "NL",
      rule: "Box 3 tax rate",
      file: "src/lib/tax/countries/nl.ts",
      constant: "BOX3_TAX_RATE",
      lastVerifiedYear: 2024,
      urgency: "medium",
      note: "Raised from 31% to 36% in 2024. Check each Belastingplan.",
    },

    // Germany — Basiszins changes every year
    {
      country: "DE",
      rule: "Basiszins (Vorabpauschale base rate)",
      file: "src/lib/tax/countries/de.ts",
      constant: "BASISZINS",
      lastVerifiedYear: 2024,
      urgency: "high",
      note: "Published every January by Deutsche Bundesbank. Critical for Vorabpauschale calculation.",
    },
    {
      country: "DE",
      rule: "Abgeltungssteuer rate (incl. Soli)",
      file: "src/lib/tax/countries/de.ts",
      constant: "ABGELTUNGSSTEUER_RATE",
      lastVerifiedYear: 2024,
      urgency: "low",
      note: "25% + 5.5% Soli = 26.375%. Stable since 2009 but periodically discussed for abolition.",
    },
    {
      country: "DE",
      rule: "Teilfreistellung equity rate",
      file: "src/lib/tax/countries/de.ts",
      constant: "TEILFREISTELLUNG_EQUITY",
      lastVerifiedYear: 2024,
      urgency: "low",
      note: "30% for equity funds. Stable since InvStG 2018 reform.",
    },
    {
      country: "DE",
      rule: "Sparerpauschbetrag (allowance)",
      file: "src/lib/tax/countries/de.ts",
      constant: "sparerLimit (inline)",
      lastVerifiedYear: 2023,
      urgency: "medium",
      note: "€1,000 single / €2,000 joint. Changed from €801/€1,602 in 2023.",
    },

    // Spain
    {
      country: "ES",
      rule: "IRPF savings base brackets",
      file: "src/lib/tax/countries/es.ts",
      constant: "SAVINGS_BRACKETS",
      lastVerifiedYear: 2024,
      urgency: "medium",
      note: "Progressive 19-28%. New brackets (26%, 28%) added in 2023. Check Ley de Presupuestos Generales.",
    },
    {
      country: "ES",
      rule: "Modelo 720 foreign asset threshold",
      file: "src/lib/tax/countries/es.ts",
      constant: "MODELO_720_THRESHOLD",
      lastVerifiedYear: 2024,
      urgency: "low",
      note: "€50,000 threshold. Stable since 2012 but penalties struck down by CJEU in 2022.",
    },

    // France
    {
      country: "FR",
      rule: "PFU income tax rate",
      file: "src/lib/tax/countries/fr.ts",
      constant: "PFU_IR_RATE",
      lastVerifiedYear: 2024,
      urgency: "medium",
      note: "12.8% IR portion. Stable since 2018 Loi de Finances.",
    },
    {
      country: "FR",
      rule: "PFU social contributions rate",
      file: "src/lib/tax/countries/fr.ts",
      constant: "PFU_SOCIAL_RATE",
      lastVerifiedYear: 2024,
      urgency: "medium",
      note: "17.2% (CSG + CRDS + PS). Check Loi de Financement de la Sécurité Sociale.",
    },

    // Italy
    {
      country: "IT",
      rule: "Imposta sostitutiva rate",
      file: "src/lib/tax/countries/it.ts",
      constant: "IMPOSTA_SOSTITUTIVA_RATE",
      lastVerifiedYear: 2024,
      urgency: "low",
      note: "26% flat tax on capital gains. Stable since 2014. Check Legge di Bilancio.",
    },
    {
      country: "IT",
      rule: "IVAFE rate",
      file: "src/lib/tax/countries/it.ts",
      constant: "IVAFE_RATE",
      lastVerifiedYear: 2024,
      urgency: "low",
      note: "0.2% on foreign financial assets. Stable since introduction in DL 201/2011.",
    },
  ];
}

async function getAdminUserIds(): Promise<string[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT id FROM users WHERE role = 'admin'",
    args: [],
  });
  return result.rows.map((r) => str(r.id));
}

const runCheck = withCronLogging("tax-rules-review", async () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based

  const checks = getTaxRuleChecks(currentYear);

  // Flag rules that haven't been verified for the current tax year
  const stale = checks.filter((c) => c.lastVerifiedYear < currentYear);
  const highUrgency = stale.filter((c) => c.urgency === "high");
  const mediumUrgency = stale.filter((c) => c.urgency === "medium");
  const lowUrgency = stale.filter((c) => c.urgency === "low");

  if (stale.length === 0) {
    return {
      status: "all_current",
      checkedRules: checks.length,
      staleRules: 0,
      message: `All ${checks.length} tax rules verified for ${currentYear}.`,
    };
  }

  // Build the notification message
  const lines: string[] = [];
  lines.push(`${stale.length} tax rule(s) need review for ${currentYear}:`);
  lines.push("");

  if (highUrgency.length > 0) {
    lines.push(`[HIGH] ${highUrgency.length} rule(s):`);
    for (const r of highUrgency) {
      lines.push(`  • ${r.country}: ${r.rule} — ${r.note}`);
    }
    lines.push("");
  }
  if (mediumUrgency.length > 0) {
    lines.push(`[MEDIUM] ${mediumUrgency.length} rule(s):`);
    for (const r of mediumUrgency) {
      lines.push(`  • ${r.country}: ${r.rule} — ${r.note}`);
    }
    lines.push("");
  }
  if (lowUrgency.length > 0) {
    lines.push(`[LOW] ${lowUrgency.length} rule(s):`);
    for (const r of lowUrgency) {
      lines.push(`  • ${r.country}: ${r.rule}`);
    }
  }

  const message = lines.join("\n");

  // Send notification to all admin users
  const adminIds = await getAdminUserIds();
  let notified = 0;

  for (const adminId of adminIds) {
    await createNotification(adminId, {
      type: "info",
      title: `Tax Rules Review: ${stale.length} rule(s) need updating for ${currentYear}`,
      titleEs: `Revisión fiscal: ${stale.length} regla(s) necesitan actualización para ${currentYear}`,
      message,
      messageEs: `${stale.length} regla(s) fiscales necesitan revisión para ${currentYear}. Revise las tasas y umbrales de los módulos de impuestos europeos.`,
      link: "/admin",
      linkLabel: "Open Admin Dashboard",
      linkLabelEs: "Abrir Panel de Admin",
    });
    notified++;
  }

  return {
    status: "review_needed",
    checkedRules: checks.length,
    staleRules: stale.length,
    highUrgency: highUrgency.length,
    mediumUrgency: mediumUrgency.length,
    lowUrgency: lowUrgency.length,
    adminsNotified: notified,
    staleDetails: stale.map((s) => ({
      country: s.country,
      rule: s.rule,
      file: s.file,
      constant: s.constant,
      lastVerified: s.lastVerifiedYear,
      urgency: s.urgency,
    })),
  };
});

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runCheck();
}
