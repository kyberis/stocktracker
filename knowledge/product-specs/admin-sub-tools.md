# admin-sub-tools

> Catalog of remaining admin sub-tools (thin spec per tool).

> Each of these is reachable from `/admin` and shares the same auth, telemetry, and audit patterns. Deep specs kept short because UI is similar.

## admin-ad-config
- API: `/api/admin/ad-config`
- Purpose: toggle paid ad placements on Free tier.
- Owning skill: [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## admin-api-key
- API: `/api/admin/api-key`
- Purpose: manage API keys / rotate.

## admin-backfill-snapshots
- API: `/api/admin/backfill-snapshots`
- Purpose: re-run snapshot backfill for a specific user.

## admin-broker-integration-requests
- API: `/api/admin/broker-integration-requests`
- Purpose: triage user-submitted broker requests.

## admin-chats
- API: `/api/admin/chats`
- Purpose: view & moderate private chat.

## admin-digest-senders
- API: `/api/admin/digest-senders`
- Purpose: control digest dispatch state.

## admin-docs
- API: `/api/admin/docs`
- Purpose: manage internal doc flags and announcements.

## admin-email-sends
- API: `/api/admin/email-sends`
- Purpose: view send logs; resend.

## admin-email-flows
- API: `/api/admin/email-flows` — see [admin-email-flows](admin-email-flows.md).
- Purpose: read-only flowchart of existing email automations.

## admin-email-templates
- API: `/api/admin/email-templates` (if present)
- Purpose: template previews.

## admin-feedback
- API: `/api/admin/feedback`
- Purpose: triage user feedback tickets.

## admin-ga-config
- API: `/api/admin/ga-config`
- Purpose: GA/analytics IDs per environment.

## admin-grafana-url
- API: `/api/admin/grafana-url`
- Purpose: point users to Grafana dashboards.

## admin-market-digests
- API: `/api/admin/market-digests`
- Purpose: QA daily market digest content.

## admin-materialize-portfolio-snapshots
- API: `/api/admin/materialize-portfolio-snapshots`
- Purpose: trigger materialization manually.

## admin-moat-auto-tickers
- API: `/api/admin/moat-auto-tickers`
- Purpose: manage moat eval queue.

## admin-notifications
- API: `/api/admin/notifications`
- Purpose: broadcast in-app notification.

## admin-openai-key / resend-key / x-keys
- API: `/api/admin/openai-key`, `/api/admin/resend-key`, `/api/admin/x-keys`
- Purpose: rotate provider credentials.

## admin-promo-banner
- API: `/api/admin/promo-banner`
- Purpose: set the site-wide promotional banner.

## admin-rate-limits
- API: `/api/admin/rate-limits`
- Purpose: inspect / reset per-user rate limits.

## admin-refund-requests
- API: `/api/admin/refund-requests` — see [refund-requests](refund-requests.md).

## admin-satisfaction
- API: `/api/admin/satisfaction`
- Purpose: user satisfaction aggregation.

## admin-engagement-report
- Page: `/admin/engagement-report`
- API: `/api/admin/engagement-report`, `/api/admin/survey-campaigns`, `/api/survey/[token]`
- Purpose: HTML engagement report + confirm-to-send survey campaigns.
- Spec: [admin-engagement-report](admin-engagement-report.md)

## admin-seed-notifications
- API: `/api/admin/seed-notifications`
- Purpose: test-data notifications.

## admin-settings
- API: `/api/admin/settings`
- Purpose: platform settings.

## admin-snaptrade-logs
- API: `/api/admin/snaptrade-logs`
- Purpose: observe SnapTrade calls.

## admin-stripe-prices
- API: `/api/admin/stripe-prices`
- Purpose: manage price IDs per interval.

## admin-support-chat / support-chat-config
- API: `/api/admin/support-chat`, `/api/admin/support-chat-config` — see [support-chat](support-chat.md).

## admin-unsubscribes
- API: `/api/admin/unsubscribes`
- Purpose: view marketing unsubscribes.

## admin-utm-taxonomy
- API: `/api/admin/utm-taxonomy`
- Purpose: managed UTM registry.

## admin-weekly-digest
- API: `/api/admin/weekly-digest` — see [weekly-digest](weekly-digest.md).

## admin-x-posts
- API: `/api/admin/x-posts`
- Purpose: schedule/retrieve X (Twitter) posts.

## Shared notes
- All routes gated by `requireAdmin()`.
- All admin mutations audit-logged.
- English only UI.
