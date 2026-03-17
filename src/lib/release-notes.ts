export type ChangeType = "feature" | "improvement" | "fix";

export interface ReleaseChange {
  type: ChangeType;
  text: string;
  translations?: Partial<Record<string, string>>;
}

export interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  titleTranslations?: Partial<Record<string, string>>;
  changes: ReleaseChange[];
}

export const CURRENT_VERSION = "1.39.3";

export const releaseNotes: ReleaseEntry[] = [
  {
    version: "1.39.3",
    date: "2026-03-17",
    title: "Full Email Localization",
    titleTranslations: { es: "Localización Completa de Emails" },
    changes: [
      {
        type: "feature",
        text: "All transactional emails — verification, price alerts, welcome, upgrade, and 11 feature emails — are now fully localized in 35 European languages. Users receive emails in their preferred language automatically.",
        translations: {
          es: "Todos los emails transaccionales — verificación, alertas de precio, bienvenida, upgrade y 11 emails de características — están ahora completamente localizados en 35 idiomas europeos. Los usuarios reciben emails en su idioma preferido automáticamente.",
        },
      },
    ],
  },
];
