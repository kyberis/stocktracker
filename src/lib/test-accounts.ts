/**
 * Synthetic / staff accounts that must not pollute product stats or outbound automation.
 *
 * Rule: any email whose domain is exactly `@trefolio.com` (plus legacy example.com
 * fixtures) is a test account.
 */

export const TREFOLIO_TEST_DOMAIN = "trefolio.com";

/** Domains whose accounts are treated as test/synthetic. */
export const TEST_ACCOUNT_EMAIL_DOMAINS = [
  TREFOLIO_TEST_DOMAIN,
  "example.com",
  "test.example.com",
] as const;

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email.slice(at + 1).toLowerCase();
}

/** True when the address is on `@trefolio.com` (staff, E2E, clone fixtures). */
export function isTreefolioTestEmail(email: string): boolean {
  return emailDomain(email) === TREFOLIO_TEST_DOMAIN;
}

/** True for any synthetic/test account (trefolio.com + example.com fixtures). */
export function isTestAccountEmail(email: string): boolean {
  const domain = emailDomain(email);
  return (TEST_ACCOUNT_EMAIL_DOMAINS as readonly string[]).includes(domain);
}

/**
 * SQL boolean: `emailExpr` belongs to a test/synthetic account.
 * Pass a column ref such as `u.email` or `email`.
 */
export function sqlIsTestAccountEmail(emailExpr: string): string {
  const domains = TEST_ACCOUNT_EMAIL_DOMAINS.map((d) => `'${d}'`).join(", ");
  return `(CASE WHEN instr(${emailExpr}, '@') > 0 THEN lower(substr(${emailExpr}, instr(${emailExpr}, '@') + 1)) ELSE '' END IN (${domains}))`;
}

/** SQL boolean: exclude test/synthetic accounts. */
export function sqlExcludeTestAccountEmail(emailExpr: string): string {
  return `NOT ${sqlIsTestAccountEmail(emailExpr)}`;
}
