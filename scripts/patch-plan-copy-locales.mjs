/**
 * One-shot: align plan/pricing copy keys across locale files with EN.
 * Other locales keep English for these keys until they are translated.
 */
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("src/locales");
const skip = new Set(["en.ts", "es.ts", "types.ts", "index.ts"]);

const SET = {
  planFree: "Free plan",
  planBasic: "Basic plan",
  planPro: "Pro plan",
  planWealth: "Wealth · Ultra plan",
  freeBadge: "Free",
  proBadge: "Pro",
  upgradeToPro: "View plans",
  upgradeMonthly: "Paid plans from €4.99/month",
  upgradeAnnual: "Annual billing saves up to 34%",
  quotaTableFree: "Free",
  quotaTableBasic: "Basic",
  quotaTablePro: "Pro",
  quotaTableWealth: "Wealth",
  upsellFreeTitle: "Free",
  upsellProTitle: "Pro",
  upsellCompareTitle: "Choose your plan",
  brokerSyncGateCta: "View plans — from €4.99/mo",
  officePaywallTitle: "Agent Office — Pro",
  officePaywallCta: "View plans",
  landingFeatureOfficeTag: "Pro · beta",
  onboardingStepTrialTitle: "Try Pro free for 7 days",
  trialActivateCta: "Activate Pro trial",
  trialWelcomeHeading: "Welcome to your Pro trial",
  trialBannerExpiredCta: "View plans",
  claraModalFreeNote: "Free: 30 messages/day. Pro: 200/day. Wealth: 500/day.",
  onboardingClaraFreeNote: "Free: 30 messages/day. Pro: 200/day. Wealth: 500/day.",
  billingUpgradeProrationNote:
    "Switching from a paid plan updates your existing subscription. You are charged the new price for the rest of this period; unused time on the previous plan is credited on the same invoice — not a separate cash refund.",
};

function setKey(src, key, value) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const re = new RegExp(`^(\\s*)${key}:\\s*(?:\`[\\s\\S]*?\`|"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'),?`, "m");
  if (re.test(src)) {
    return src.replace(re, `$1${key}: "${escaped}",`);
  }
  return null;
}

function insertAfter(src, afterKey, key, value) {
  if (src.includes(`${key}:`)) return src;
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const re = new RegExp(`(^\\s*${afterKey}:\\s*.*,\\n)`, "m");
  if (!re.test(src)) return src;
  return src.replace(re, `$1  ${key}: "${escaped}",\n`);
}

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".ts") && !skip.has(f))) {
  const full = path.join(dir, file);
  let src = fs.readFileSync(full, "utf8");
  const orig = src;

  src = insertAfter(src, "planFree", "planBasic", SET.planBasic);
  src = insertAfter(src, "planPro", "planWealth", SET.planWealth);
  src = insertAfter(src, "quotaTableFree", "quotaTableBasic", SET.quotaTableBasic);
  src = insertAfter(src, "quotaTablePro", "quotaTableWealth", SET.quotaTableWealth);
  if (!src.includes("billingUpgradeProrationNote:")) {
    src = insertAfter(src, "billingPageSubtitle", "billingUpgradeProrationNote", SET.billingUpgradeProrationNote);
    if (!src.includes("billingUpgradeProrationNote:")) {
      src = insertAfter(src, "billingPageHeading", "billingUpgradeProrationNote", SET.billingUpgradeProrationNote);
    }
  }

  for (const [key, value] of Object.entries(SET)) {
    const next = setKey(src, key, value);
    if (next) src = next;
  }

  if (src !== orig) {
    fs.writeFileSync(full, src);
    console.log("updated", file);
  }
}
