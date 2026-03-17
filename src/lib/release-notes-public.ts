import type { ChangeType, ReleaseEntry } from "@/lib/release-notes";
import { CURRENT_VERSION } from "@/lib/release-version";

export type { ChangeType };

export const PUBLIC_RELEASE_NOTES_VERSION = CURRENT_VERSION;

export const publicReleaseNotes: ReleaseEntry[] = [
  {
    version: "1.39.3",
    date: "2026-03-17",
    title: "Full Email Localization",
    titleTranslations: { es: "Localizacion Completa de Emails" },
    changes: [
      {
        type: "feature",
        text: "All transactional emails are now fully localized in 35 European languages, so users receive verification, alerts, and product updates in their preferred language automatically.",
        translations: {
          es: "Todos los emails transaccionales estan ahora completamente localizados en 35 idiomas europeos, para que los usuarios reciban verificacion, alertas y novedades del producto automaticamente en su idioma preferido.",
        },
      },
    ],
  },
  {
    version: "1.39.2",
    date: "2026-03-17",
    title: "Ticker Rename Detection",
    titleTranslations: { es: "Deteccion de Cambio de Ticker" },
    changes: [
      {
        type: "improvement",
        text: "Broker-synced holdings now survive ticker renames automatically, preserving your transaction history and preventing duplicate positions.",
        translations: {
          es: "Las posiciones sincronizadas con broker ahora sobreviven automaticamente a cambios de ticker, preservando tu historial de transacciones y evitando posiciones duplicadas.",
        },
      },
      {
        type: "improvement",
        text: "Automatic stale ticker recovery via OpenFIGI now self-heals outdated symbols on refresh when FIGI data is available.",
        translations: {
          es: "La recuperacion automatica de tickers obsoletos via OpenFIGI ahora corrige simbolos desactualizados al refrescar cuando hay datos FIGI disponibles.",
        },
      },
    ],
  },
  {
    version: "1.39.1",
    date: "2026-03-17",
    title: "Broker Sync Fix",
    titleTranslations: { es: "Correccion de Sincronizacion de Broker" },
    changes: [
      {
        type: "fix",
        text: "Fixed a critical issue where broker-synced holdings could be removed during re-authentication problems.",
        translations: {
          es: "Corregido un problema critico donde las posiciones sincronizadas con broker podian eliminarse durante problemas de re-autenticacion.",
        },
      },
    ],
  },
  {
    version: "1.39.0",
    date: "2026-03-16",
    title: "Experience Personalization & Notifications",
    titleTranslations: { es: "Personalizacion por Experiencia y Notificaciones" },
    changes: [
      {
        type: "feature",
        text: "Users can now set their investment experience level to personalize recommendations and product guidance.",
        translations: {
          es: "Los usuarios ahora pueden definir su nivel de experiencia en inversion para personalizar recomendaciones y guias del producto.",
        },
      },
      {
        type: "feature",
        text: "Email notification preferences now let users opt out of marketing and template emails directly from profile settings.",
        translations: {
          es: "Las preferencias de notificacion por email ahora permiten a los usuarios desactivar emails de marketing y plantillas directamente desde su perfil.",
        },
      },
    ],
  },
  {
    version: "1.38.0",
    date: "2026-03-15",
    title: "Dividend Depth & Broker Sync Expansion",
    titleTranslations: { es: "Profundidad de Dividendos y Expansion de Sincronizacion de Broker" },
    changes: [
      {
        type: "feature",
        text: "Added Yield-on-Cost metrics and an interactive DRIP simulation to project dividend growth over time.",
        translations: {
          es: "Anadidas metricas de rendimiento sobre coste y una simulacion DRIP interactiva para proyectar el crecimiento de dividendos en el tiempo.",
        },
      },
      {
        type: "feature",
        text: "Broker sync now scales across linked portfolios, improving automatic updates for holdings, cash, and transactions.",
        translations: {
          es: "La sincronizacion de broker ahora escala entre carteras vinculadas, mejorando las actualizaciones automaticas de posiciones, efectivo y transacciones.",
        },
      },
    ],
  },
];
