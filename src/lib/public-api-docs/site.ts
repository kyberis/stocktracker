export function getPublicDocsSiteUrl(): string {
  return process.env.APP_BASE_URL?.trim().replace(/\/+$/g, "") || "https://trefolio.com";
}
