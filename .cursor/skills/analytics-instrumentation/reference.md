# Analytics and Grafana Reference

## Goal

Provide a practical path from product events to operational and business dashboards.

## Existing Instrumentation

- Product events are captured in `analytics_events` via `trackEvent(...)`.
- Client-generated events flow through `/api/analytics/events`.
- Admin analytics endpoint summarizes usage for internal monitoring.

## Recommended Metrics Layers

1. Product analytics (event-based)
   - DAU/WAU
   - Feature adoption by event type
   - Conversion signals (for example Free -> Pro related interactions)

2. Operational metrics (service health)
   - API route latency (p50/p95/p99)
   - API error rate by route
   - External provider failure rate (Yahoo/Alpha Vantage/OpenAI)
   - Background/import processing duration

## Grafana Integration Approaches

### Option A: SQL-first dashboards (fastest for now)

- Use Grafana with a SQL data source pointing to your analytics store.
- Build panels directly from event tables and aggregate queries.
- Best for product metrics without introducing Prometheus immediately.

### Option B: Prometheus + Grafana (for deeper ops observability)

1. Expose `/metrics` endpoint (Prometheus text format) in the app.
2. Add route-level counters/histograms:
   - request_count by route/status
   - request_duration_seconds histogram
   - provider_failures_total by provider
3. Configure Prometheus scrape job for the app.
4. Connect Grafana to Prometheus.

## Suggested Dashboard Sections

- Product Usage
  - Daily active users
  - Events by type over time
  - Top used product capabilities
- Conversion Signals
  - High-intent actions by tier
  - Trial/pro feature engagement deltas
- API Health
  - Request volume
  - Error rate
  - p95 latency by route
- Provider Reliability
  - Error rate by external provider
  - Timeout trends

## Event Naming and Metadata Standards

- Use stable snake_case event names.
- Prefer low-cardinality metadata keys.
- Avoid personal/sensitive values in metadata.
- Keep metadata schema documented per feature.

## Verification Pattern

For every newly added event:
- Trigger event locally via UI/API flow
- Confirm ingestion route accepts it
- Confirm record appears in analytics storage
- Confirm panel/query can surface it in Grafana/admin analytics
