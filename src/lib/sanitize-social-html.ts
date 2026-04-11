import sanitizeHtml from "sanitize-html";

const SOCIAL_POST_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "a",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "blockquote",
    "code",
    "pre",
    "span",
    "div",
    "hr",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    "*": ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {},
  allowProtocolRelative: false,
};

/**
 * Strips scripts, event handlers, and dangerous URLs from rich-text social post bodies
 * before persistence (stored XSS mitigation).
 */
export function sanitizeSocialPostHtml(html: string): string {
  return sanitizeHtml(html, SOCIAL_POST_HTML_OPTIONS);
}
