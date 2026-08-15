# admin-email-flows

> Read-only admin map of how user emails are triggered, gated, and sent.

## 1. Summary

Staff-only observability and control for outbound email automations. Admins see each journey as a flowchart, can turn every email on or off from this page, and can preview the live body (DB template or code-owned HTML) plus why the email exists.

## 2. Status

- **Tier:** Admin
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`automated-user-comms`](../../.cursor/skills/automated-user-comms/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/admin/email-flows/page.tsx`](../../src/app/(app)/admin/email-flows/page.tsx) | Admin Messaging nav. |
| Component | [`src/app/(app)/admin/tabs/EmailFlowsTab.tsx`](../../src/app/(app)/admin/tabs/EmailFlowsTab.tsx) | Flowchart + node detail. |
| API | [`src/app/api/admin/email-flows/route.ts`](../../src/app/api/admin/email-flows/route.ts) | GET enrichment. |
| Library | [`src/lib/email-flows/registry.ts`](../../src/lib/email-flows/registry.ts) | Typed flow catalog (source of truth for the diagram). |
| Library | [`src/lib/email-flows/enrich.ts`](../../src/lib/email-flows/enrich.ts) | Flags, crons, template preview, send aggregates. |

## 4. Data model

No new tables. Reads:

- `email_templates` / `email_sends` via [`src/lib/db/email-templates.ts`](../../src/lib/db/email-templates.ts) (`listEmailTemplatesBySlugs`, `getTemplateSendAggregatesBySlugs`)
- Platform feature flags via `isFeatureEnabled`
- Cron metadata from [`src/lib/cron-registry.ts`](../../src/lib/cron-registry.ts)

Types: `EmailFlow`, `FlowNode`, `FlowStatus` in the registry.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/admin/email-flows` | admin | Admin | Registry + flags, crons, template/code previews, per-email on/off, 7d/30d stats. |
| PUT | `/api/admin/email-flows` | admin | Admin | `{ nodeId, enabled }` toggles one email. Flag-gated nodes write the existing platform flag; others write `email_node_toggles`. |

Input/output: GET JSON `{ flows, flags, crons, templates, nodeEnabled, codePreviews }`.

## 6. UI surface

- Page: `/admin/email-flows`
- Nav: Admin → Messaging → Email Flows
- Components: `EmailFlowsTab` (flow picker, flowchart, per-email toggles, all-emails catalog, EN/ES body preview)
- Context consumers: none (admin session only)

## 7. Business logic

- Diagrams are documented in `EMAIL_FLOWS`, not inferred from cron SQL at runtime.
- Every `kind: email` node is toggleable on this page. `sendEmail({ automationKey })` suppresses sends when the node is off.
- Nodes with `featureFlag` write that flag (so Feature Flags stays in sync). Others persist in `platform_settings.email_node_toggles`.
- Hardcoded senders show a sample body via `getCodeOwnedEmailPreview`. Template nodes use DB HTML.
- Catalog: onboarding, winback, weekly digest, trial, alerts, event-triggered, and the seeded template library.

## 8. External dependencies

- Resend only indirectly (existing send logs). No new provider calls.
- Env vars: none new.

## 9. Currency / FX / tax implications

- N/A.

## 10. i18n

- Admin UI is English-only (same as other `/admin` tools).
- Template preview toggles EN/ES from stored `email_templates` fields.

## 11. Permissions / tier gating / rate limits

- `requireAdmin()` on the API; `/admin/*` is role-gated.
- No `SubscriptionFeature` keys. No new rate-limit table entries.

## 12. Telemetry

- API wrapped with `withMetrics("/api/admin/email-flows")`.
- No new `analytics_events`. Send volume is read from `email_sends`.

## 13. Edge cases & gotchas

- Some transactional helpers do not log `email_sends` with a `template_id` — stats stay empty and the UI says so.
- Weekly digest logs sends without a template slug.
- Seeded templates such as `welcome-free-with-stocks` / `trial-invitation` may exist while the live body is still a hardcoded helper.
- Demo mode: N/A (admin only).
- Mobile: flowchart scrolls horizontally; detail stacks below.

## 14. Tests

- Unit: [`src/lib/email-flows/registry.test.ts`](../../src/lib/email-flows/registry.test.ts) — unique ids, child edges, template slugs vs seeds/migrations, hardcoded senders exist, cron ids registered, status helper.
- E2E: none (admin-only; no public surface).
- Manual: open `/admin/email-flows`, walk onboarding + digest, confirm flag badges and template preview.

## 15. Related skills and rules

- Skills: [`automated-user-comms`](../../.cursor/skills/automated-user-comms/SKILL.md), [`ux-writer`](../../.cursor/skills/ux-writer/SKILL.md), [`accessibility-reviewer`](../../.cursor/skills/accessibility-reviewer/SKILL.md)
- Rules: [`.cursor/rules/release-notes.mdc`](../../.cursor/rules/release-notes.mdc), [`.cursor/rules/knowledge-base.mdc`](../../.cursor/rules/knowledge-base.mdc)
- Related specs: [email-system](email-system.md), [weekly-digest](weekly-digest.md), [trial-invitations](trial-invitations.md), [admin-sub-tools](admin-sub-tools.md)

## 16. Open questions / planned work

- v2: edit delays/conditions from the UI (not a full builder).
- Per-category marketing preferences still a single `email_notifications_enabled` switch.
- Deliverability dashboards beyond 7d/30d template aggregates.
