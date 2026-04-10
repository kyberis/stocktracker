import type { EmailLocale, MembershipGrantStrings } from "./types";

const membershipGrantEn: MembershipGrantStrings = {
  subject: "You've been granted trefolio membership",
  heading: "Congratulations!",
  greetingLine: "Hi {{name}},",
  supportGrantLine:
    "The trefolio support team has granted you complimentary membership.",
  planDaysLine:
    "You have {{days}} days of {{planName}} access. Your paid period starts when you activate below &mdash; not before.",
  activateCta: "Activate membership",
  footer: "You received this email because the trefolio team added membership to your account.",
  managePreferences: "Manage email preferences",
  fallbackName: "there",
  planNameStarter: "Bifolio",
  planNamePro: "Trefolio",
};

const membershipGrantEs: MembershipGrantStrings = {
  subject: "Te han concedido membresía en trefolio",
  heading: "¡Felicidades!",
  greetingLine: "Hola, {{name}}:",
  supportGrantLine:
    "El equipo de soporte de trefolio te ha concedido una membresía de forma gratuita.",
  planDaysLine:
    "Tienes {{days}} días de acceso a {{planName}}. El periodo de pago empieza cuando pulses Activar abajo; no antes.",
  activateCta: "Activar membresía",
  footer: "Has recibido este correo porque el equipo de trefolio añadió membresía a tu cuenta.",
  managePreferences: "Gestionar preferencias de correo",
  fallbackName: "hola",
  planNameStarter: "Bifolio",
  planNamePro: "Trefolio",
};

const membershipGrantFr: MembershipGrantStrings = {
  ...membershipGrantEn,
  subject: "Vous avez reçu un accès trefolio",
  heading: "Félicitations !",
  greetingLine: "Bonjour {{name}},",
  supportGrantLine:
    "L’équipe support de trefolio vous a accordé un accès membre à titre gracieux.",
  planDaysLine:
    "Vous avez {{days}} jours d’accès {{planName}}. La période commence lorsque vous activez ci-dessous — pas avant.",
  activateCta: "Activer l’adhésion",
  footer: "Vous avez reçu cet e-mail car l’équipe trefolio a ajouté un accès à votre compte.",
  managePreferences: "Gérer les préférences e-mail",
  fallbackName: "Bonjour",
};

const membershipGrantDe: MembershipGrantStrings = {
  ...membershipGrantEn,
  subject: "Dir wurde trefolio-Mitgliedschaft gewährt",
  heading: "Glückwunsch!",
  greetingLine: "Hallo {{name}},",
  supportGrantLine:
    "Das trefolio-Support-Team hat dir eine kostenlose Mitgliedschaft gewährt.",
  planDaysLine:
    "Du hast {{days}} Tage {{planName}}-Zugang. Die Laufzeit beginnt, wenn du unten aktivierst — nicht früher.",
  activateCta: "Mitgliedschaft aktivieren",
  footer: "Du erhältst diese E-Mail, weil das trefolio-Team deinem Konto Zugang hinzugefügt hat.",
  managePreferences: "E-Mail-Einstellungen verwalten",
  fallbackName: "Hallo",
};

const membershipGrantIt: MembershipGrantStrings = {
  ...membershipGrantEn,
  subject: "Ti è stata concessa l’iscrizione a trefolio",
  heading: "Congratulazioni!",
  greetingLine: "Ciao {{name}},",
  supportGrantLine:
    "Il team di supporto trefolio ti ha concesso un’iscrizione omaggio.",
  planDaysLine:
    "Hai {{days}} giorni di accesso {{planName}}. Il periodo inizia quando attivi qui sotto — non prima.",
  activateCta: "Attiva iscrizione",
  footer: "Hai ricevuto questa email perché il team trefolio ha aggiunto l’accesso al tuo account.",
  managePreferences: "Gestisci preferenze email",
  fallbackName: "Ciao",
};

const membershipGrantPt: MembershipGrantStrings = {
  ...membershipGrantEn,
  subject: "Foi-lhe concedida adesão ao trefolio",
  heading: "Parabéns!",
  greetingLine: "Olá, {{name}},",
  supportGrantLine:
    "A equipa de suporte do trefolio concedeu-lhe uma adesão gratuita.",
  planDaysLine:
    "Tem {{days}} dias de acesso {{planName}}. O período pago começa quando ativar abaixo — não antes.",
  activateCta: "Ativar adesão",
  footer: "Recebeu este e-mail porque a equipa trefolio adicionou adesão à sua conta.",
  managePreferences: "Gerir preferências de e-mail",
  fallbackName: "Olá",
};

const membershipGrantNl: MembershipGrantStrings = {
  ...membershipGrantEn,
  subject: "Je hebt trefolio-lidmaatschap gekregen",
  heading: "Gefeliciteerd!",
  greetingLine: "Hoi {{name}},",
  supportGrantLine:
    "Het trefolio-supportteam heeft je gratis lidmaatschap verleend.",
  planDaysLine:
    "Je hebt {{days}} dagen {{planName}}-toegang. Je betaalde periode start wanneer je hieronder activeert — niet eerder.",
  activateCta: "Lidmaatschap activeren",
  footer: "Je ontvangt deze e-mail omdat het trefolio-team toegang aan je account heeft toegevoegd.",
  managePreferences: "E-mailvoorkeuren beheren",
  fallbackName: "Hoi",
};

const membershipGrantPl: MembershipGrantStrings = {
  ...membershipGrantEn,
  subject: "Przyznano Ci członkostwo trefolio",
  heading: "Gratulacje!",
  greetingLine: "Cześć, {{name}},",
  supportGrantLine:
    "Zespół wsparcia trefolio przyznał Ci bezpłatne członkostwo.",
  planDaysLine:
    "Masz {{days}} dni dostępu {{planName}}. Okres płatny zaczyna się po aktywacji poniżej — nie wcześniej.",
  activateCta: "Aktywuj członkostwo",
  footer: "Dostałeś ten e-mail, ponieważ zespół trefolio dodał dostęp do konta.",
  managePreferences: "Zarządzaj ustawieniami e-mail",
  fallbackName: "Cześć",
};

const overrides: Partial<Record<EmailLocale, MembershipGrantStrings>> = {
  en: membershipGrantEn,
  es: membershipGrantEs,
  fr: membershipGrantFr,
  de: membershipGrantDe,
  it: membershipGrantIt,
  pt: membershipGrantPt,
  nl: membershipGrantNl,
  pl: membershipGrantPl,
};

export function getMembershipGrantStrings(locale: EmailLocale): MembershipGrantStrings {
  return overrides[locale] ?? membershipGrantEn;
}
