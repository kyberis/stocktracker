# Security Policy

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in trefolio, please disclose it responsibly by emailing **security@trefolio.com**. Include:

- A description of the vulnerability and its potential impact
- Step-by-step reproduction instructions
- Any proof-of-concept code or screenshots (if applicable)

We aim to acknowledge receipt within **48 hours** and provide a resolution timeline within **7 days** for critical issues.

## Supported versions

| Version | Supported |
|---------|-----------|
| `main` branch | ✅ |
| Older releases | ✗ (please upgrade) |

## Scope

In scope:
- Authentication and session management (`src/lib/auth/`, `src/middleware.ts`)
- API routes (`src/app/api/`)
- Data access layer (`src/lib/db/`)
- Stripe webhook verification
- CSRF and security headers

Out of scope:
- Denial-of-service via resource exhaustion
- Issues requiring physical access to a user's device
- Third-party services (report to those vendors directly)

## Disclosure policy

Once a fix is released, we will publish a GitHub Security Advisory crediting the reporter (unless you prefer to remain anonymous).
