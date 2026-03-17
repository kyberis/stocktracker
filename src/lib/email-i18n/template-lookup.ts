/**
 * Main lookup for localized DB-seeded email template HTML bodies.
 * At send time: if locale is en/es -> use DB content; otherwise -> generate HTML from translations.
 *
 * Locale data is split into per-locale files under features/ and lifecycle/
 * and loaded on demand so only the needed locale is ever in memory.
 */

import {
  generateFeatureEmail,
  generateWelcomeNoStocks,
  generateWelcomeFreeStocks,
  generateBifolioUpgrade,
  generateTrefolioUpgrade,
} from "./template-html";
import type {
  FeatureTemplateStrings,
  TemplateFooterStrings,
} from "./template-types";

const FEATURE_META: Record<string, { emoji: string; ctaUrl: string }> = {
  "feature-real-time-quotes": {
    emoji: "&#x1F4C8;",
    ctaUrl: "{{base_url}}/?utm_source=email&utm_medium=feature&utm_campaign=real_time_quotes",
  },
  "feature-dividend-tracking": {
    emoji: "&#x1F4B0;",
    ctaUrl: "{{base_url}}/tools/dividends?utm_source=email&utm_medium=feature&utm_campaign=dividend_tracking",
  },
  "feature-ai-analysis": {
    emoji: "&#x1F916;",
    ctaUrl: "{{base_url}}/?utm_source=email&utm_medium=feature&utm_campaign=ai_analysis",
  },
  "feature-price-alerts": {
    emoji: "&#x1F514;",
    ctaUrl: "{{base_url}}/tools/alerts?utm_source=email&utm_medium=feature&utm_campaign=price_alerts",
  },
  "feature-broker-import": {
    emoji: "&#x1F4E5;",
    ctaUrl: "{{base_url}}/import?utm_source=email&utm_medium=feature&utm_campaign=broker_import",
  },
  "feature-fundamentals": {
    emoji: "&#x1F3E6;",
    ctaUrl: "{{base_url}}/?utm_source=email&utm_medium=feature&utm_campaign=fundamentals",
  },
  "feature-stock-screener": {
    emoji: "&#x1F50D;",
    ctaUrl: "{{base_url}}/tools/screener?utm_source=email&utm_medium=feature&utm_campaign=stock_screener",
  },
  "feature-tax-reports": {
    emoji: "&#x1F4CB;",
    ctaUrl: "{{base_url}}/tools/tax?utm_source=email&utm_medium=feature&utm_campaign=tax_reports",
  },
  "feature-portfolio-simulator": {
    emoji: "&#x1F3AE;",
    ctaUrl: "{{base_url}}/tools/simulator?utm_source=email&utm_medium=feature&utm_campaign=portfolio_simulator",
  },
  "feature-net-worth": {
    emoji: "&#x1F3E0;",
    ctaUrl: "{{base_url}}/tools/net-worth?utm_source=email&utm_medium=feature&utm_campaign=net_worth",
  },
  "feature-crypto": {
    emoji: "&#x1FA99;",
    ctaUrl: "{{base_url}}/crypto?utm_source=email&utm_medium=feature&utm_campaign=crypto",
  },
};

const VALID_LOCALES = new Set([
  "en","es","fr","de","it","pt","nl","pl","cs","sk","hu","ro","bg","hr",
  "sl","el","sv","da","fi","et","lv","lt","ga","mt","nb","uk","tr","sr",
  "is","sq","bs","mk","be","ca","cy",
]);

async function loadFeatureLocale(
  locale: string,
): Promise<{ footer: TemplateFooterStrings; features: Record<string, FeatureTemplateStrings> } | null> {
  if (!VALID_LOCALES.has(locale)) return null;
  try {
    const mod = await import(`./features/${locale}`);
    return { footer: mod.footer, features: mod.features };
  } catch {
    return null;
  }
}

async function loadLifecycleLocale(locale: string): Promise<Record<string, unknown> | null> {
  if (!VALID_LOCALES.has(locale)) return null;
  try {
    return await import(`./lifecycle/${locale}`);
  } catch {
    return null;
  }
}

/**
 * Returns fully-rendered localized HTML body for a DB-seeded email template,
 * or null if the slug/locale combination is not supported (caller should use DB body).
 *
 * For en/es this returns null intentionally — those bodies live in the DB
 * and may have been customized by admins.
 */
export async function getLocalizedTemplateHtml(
  slug: string,
  locale: string,
): Promise<string | null> {
  if (locale === "en" || locale === "es") return null;

  // Feature templates
  const featureMeta = FEATURE_META[slug];
  if (featureMeta) {
    const data = await loadFeatureLocale(locale);
    if (!data) return null;
    const strings = data.features[slug];
    if (!strings) return null;
    return generateFeatureEmail(featureMeta.emoji, strings, data.footer, featureMeta.ctaUrl);
  }

  // Lifecycle templates
  const lifecycleMod = await loadLifecycleLocale(locale);
  if (!lifecycleMod) return null;

  // Also load the footer from the features locale file
  const featureData = await loadFeatureLocale(locale);
  const footer: TemplateFooterStrings = featureData?.footer ?? { receivedText: "You received this email from trefolio.", unsubscribeLabel: "Unsubscribe" };

  switch (slug) {
    case "welcome-no-stocks": {
      const s = lifecycleMod.welcomeNoStocks as Parameters<typeof generateWelcomeNoStocks>[0] | undefined;
      if (!s) return null;
      return generateWelcomeNoStocks(s, footer);
    }
    case "welcome-free-with-stocks": {
      const s = lifecycleMod.welcomeFreeStocks as Parameters<typeof generateWelcomeFreeStocks>[0] | undefined;
      if (!s) return null;
      return generateWelcomeFreeStocks(s, footer);
    }
    case "upgrade-bifolio": {
      const s = lifecycleMod.bifolioUpgrade as Parameters<typeof generateBifolioUpgrade>[0] | undefined;
      if (!s) return null;
      return generateBifolioUpgrade(s, footer);
    }
    case "upgrade-trefolio": {
      const s = lifecycleMod.trefolioUpgrade as Parameters<typeof generateTrefolioUpgrade>[0] | undefined;
      if (!s) return null;
      return generateTrefolioUpgrade(s, footer);
    }
    default:
      return null;
  }
}
