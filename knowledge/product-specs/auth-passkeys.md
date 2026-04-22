# auth-passkeys

> WebAuthn passkey registration and sign-in.

## 1. Summary

Users can register a platform passkey (Touch ID, Face ID, Windows Hello, Android biometrics) for passwordless sign-in. Uses `@simplewebauthn/server` on the backend and `@simplewebauthn/browser` on the client. Also used to pair a trefolio Leaf device (see [trefolio-leaf-device](trefolio-leaf-device.md)).

## 2. Status

- **Tier:** Free (consumer passkeys); device passkey uses the same infrastructure.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-user-auth`](../../.cursor/skills/engineer-user-auth/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/auth/passkey/`](../../src/app/api/auth/passkey) | Registration / auth challenges. |
| API | [`src/app/api/device-passkey/`](../../src/app/api/device-passkey) | Device-specific passkey. |
| Library | [`src/lib/auth/webauthn.ts`](../../src/lib/auth/webauthn.ts) | Server helpers. |
| DB | [`src/lib/db/passkeys.ts`](../../src/lib/db/passkeys.ts) | Credential storage. |

## 4. Data model

- `passkeys` table: `id`, `user_id`, `credential_id`, `public_key`, `counter`, `device_type`, `backed_up`, `transports`, `created_at`, `last_used_at`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/auth/passkey/register/start` | user | Free | Issue registration options. |
| POST | `/api/auth/passkey/register/finish` | user | Free | Verify attestation, store credential. |
| POST | `/api/auth/passkey/authenticate/start` | none | Free | Issue auth challenge. |
| POST | `/api/auth/passkey/authenticate/finish` | none | Free | Verify assertion, issue session. |

## 6. UI surface

- Settings page lists registered passkeys with last-used timestamps.
- Passkey button on sign-in page next to OAuth.

## 7. Business logic

- Challenge state stored server-side, short TTL.
- Counter verification mitigates cloned authenticators.
- RP ID must match the deployment origin.

## 8. External dependencies

- `@simplewebauthn/server` + `@simplewebauthn/browser`.
- Env: `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, origin list.

## 9. Currency / FX / tax implications

None.

## 10. i18n

All locales.

## 11. Permissions / tier gating / rate limits

- Registration: 10/hour/user.
- Authentication challenges: 20/min/IP.

## 12. Telemetry

- `analytics_events`: `auth.passkey.register.success`, `auth.passkey.signin.success`.

## 13. Edge cases & gotchas

- Cross-platform vs platform authenticators — we allow both.
- iOS requires an https origin; not registrable from http-localhost.
- Multiple passkeys per user supported.

## 14. Tests

- [`src/lib/auth/webauthn.test.ts`](../../src/lib/auth/webauthn.test.ts)

## 15. Related skills and rules

- [`.cursor/skills/engineer-user-auth/SKILL.md`](../../.cursor/skills/engineer-user-auth/SKILL.md)
- Related spec: [trefolio-leaf-device](trefolio-leaf-device.md)

## 16. Open questions / planned work

- Per-passkey labels (user-given names).
- Silent upgrade from password to passkey.
