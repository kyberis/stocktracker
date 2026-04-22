# idempotent-crons

> Cron jobs must be safe to retry.

## Rules
- Every cron is registered in `src/lib/cron-registry.ts` with cadence + SLA.
- Every cron handler wraps its work in `withCronLock(name)` to avoid overlap.
- Every cron writes a `cron_run_logs` row on both success and failure.
- Writes use idempotency keys where the domain model allows (e.g., `transaction_id`, `snapshot_date`).

## Canonical shape

```ts
export async function POST(req: Request) {
  await requireCronSecret(req);
  return withCronLock('quotes-sync', async () => {
    const result = await syncQuotes();
    return Response.json(result);
  });
}
```

## Chunk long work
Cron functions must finish within Vercel function limits. Jobs that need more time must chunk via a `?cursor=` parameter and self-invoke; or run via Workflow DevKit if sufficiently long-running.

## Failure detection
- Alert when last successful run is past `maxSinceSuccessMs` (per cron in registry).
- Admin banner surfaces stale jobs.

## Related
- [platform-cron-system](../product-specs/platform-cron-system.md)
- [admin-cron-stats](../product-specs/admin-cron-stats.md)
