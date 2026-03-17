# Canonical Conversion Events

This document defines the canonical conversion events used for internal analytics and ad-platform dispatch.

## Event Names

- `signup_completed`
- `checkout_started`
- `checkout_completed`

Use these exact snake_case names. Do not create aliases.

## Payload Schema

All payload fields are optional strings unless noted.

- `plan`: `"starter"` | `"pro"`
- `interval`: `"monthly"` | `"annual"`
- `method`: `"credentials"` | `"google"` | `"apple"`
- `source`: UTM source (example: `google`, `meta`)
- `medium`: UTM medium (example: `cpc`, `paid_social`)
- `campaign`: UTM campaign name

## Consent Rules

- Consent state is read from `trefolio_cookie_consent`.
- If consent is not `all`, ad tracking events are **not** dispatched.
- Internal analytics events can still be stored for product telemetry.

## Internal vs Ad Dispatch Parity

Admin Analytics shows parity by comparing:

- Internal canonical events (`signup_completed`, `checkout_started`, `checkout_completed`)
- Ad dispatch log events (`ad_conversion_dispatched` with metadata.event)

Target threshold: overall match rate >= 85%.

## Implementation Locations

- Event constants: `src/lib/conversion-events.ts`
- Client dispatch helper: `src/lib/ad-tracking.ts`
- Dispatch logging endpoint: `src/app/api/analytics/conversions/route.ts`
- Admin parity UI: `src/app/(app)/admin/tabs/AnalyticsTab.tsx`

## Optional Meta Integration (can stay disabled)

Meta tracking is disabled unless you configure env vars.

- Browser pixel: `NEXT_PUBLIC_META_PIXEL_ID`
- Server CAPI pixel id: `META_CAPI_PIXEL_ID` (falls back to `NEXT_PUBLIC_META_PIXEL_ID`)
- Server CAPI token: `META_CAPI_ACCESS_TOKEN`

If these values are missing, no Meta events are sent and the app continues to work normally.

