---
name: engineer-feature-flags
description: Implements and manages the per-user feature flag system — gating new features behind flags, adding flags to the registry, configuring per-user overrides, and consuming flags on both server and client. Use when a feature should be behind a feature flag, when adding a new flag, when checking flag state in API routes or components, or when working on the admin feature flags UI.
---

# Feature Flag Engineer

## Architecture Overview

Feature flags use a two-layer resolution: **global state** (platform-wide on/off) with optional **per-user overrides** (exceptions). A flag globally disabled can be enabled for specific users, and vice versa.

- **Storage**: Global flags live in `platform_settings` (key-value). Per-user overrides live in `feature_flag_overrides` table.
- **Server**: `isFeatureEnabledForUser(flag, userId)` or `resolveAllFlagsForUser(userId)` in `src/lib/db/settings.ts`.
- **Client**: `useFeatureFlag(flag)` hook — O(1) synchronous lookup from `FeatureFlagProvider` context.
- **Admin**: Dedicated page at `/admin/feature-flags` with global toggles and per-user override management.

## Adding a New Feature Flag

When a feature should be gated behind a flag, follow these steps:

### 1. Register the flag name

Add the flag to the `PlatformFeature` union type in `src/lib/db/settings.ts`:

```ts
export type PlatformFeature =
  | "alerts_enabled" | "csv_export_enabled" | ...
  | "your_new_feature_enabled";  // add here
```

### 2. Set the default state

If the flag should be **enabled by default**, add it to `DEFAULT_ENABLED_FLAGS` in the same file:

```ts
const DEFAULT_ENABLED_FLAGS: Set<PlatformFeature> = new Set([
  ...
  "your_new_feature_enabled",  // add here if on by default
]);
```

If the flag should start **disabled**, skip this — flags not in the set default to `false`.

### 3. Add to ALL_PLATFORM_FEATURES

Add the flag to the `ALL_PLATFORM_FEATURES` array in `src/lib/db/settings.ts`.
Admin GET `/api/admin/feature-flags` and `/api/admin/settings` read this list — do **not** maintain a separate `ALLOWED_FLAGS` copy (that drift left toggles looking off after save).

### 4. Add to remaining API lists

Update these files with the new flag:

- `src/lib/schemas.ts` — `PLATFORM_FEATURE_ENUM` z.enum array
- `src/app/api/feature-flags/route.ts` — anonymous fallback path only (logged-in users already get `ALL_PLATFORM_FEATURES` via `resolveAllFlagsForUser`)

### 5. Add to admin UI metadata

Add the flag to `FLAG_META` in `src/app/(app)/admin/feature-flags/page.tsx`:

```ts
const FLAG_META: Record<string, { label: string; description: string; group: string }> = {
  ...
  your_new_feature_enabled: {
    label: "Your Feature Name",
    description: "Short description of what this flag controls",
    group: "Features",  // or "Tools"
  },
};
```

## Server-Side Flag Checks

### When user context is available (most API routes)

```ts
import { isFeatureEnabledForUser } from "@/lib/db";

// Single flag check — hits DB directly, no cache
const enabled = await isFeatureEnabledForUser("your_flag", session.userId);
if (!enabled) return NextResponse.json({ error: "Feature not available" }, { status: 404 });
```

### When multiple flags are needed in one request

```ts
import { resolveAllFlagsForUser } from "@/lib/db";

// Two parallel queries, returns Record<PlatformFeature, boolean>
const flags = await resolveAllFlagsForUser(session.userId);
if (!flags.your_flag) { ... }
```

### When no user context exists (public routes, OAuth callbacks)

```ts
import { isFeatureEnabled } from "@/lib/db";

// Global check only — no per-user overrides
const enabled = await isFeatureEnabled("your_flag");
```

## Client-Side Flag Checks

The `FeatureFlagProvider` in `src/lib/feature-flag-context.tsx` wraps the app layout and fetches all flags once on mount. It refreshes on a 60s interval, on tab visibility change, and exposes `refreshFlags()` for manual invalidation.

### Check a single flag (most common)

```tsx
import { useFeatureFlag } from "@/lib/feature-flag-context";

function MyComponent() {
  const enabled = useFeatureFlag("your_flag");
  if (!enabled) return null;
  return <div>Feature content</div>;
}
```

### Check multiple flags

```tsx
import { useFeatureFlags } from "@/lib/feature-flag-context";

const flags = useFeatureFlags();
// flags.your_flag, flags.another_flag — all O(1)
```

### Trigger a refresh (admin UI after mutations)

```tsx
import { useFeatureFlagContext } from "@/lib/feature-flag-context";

const { refreshFlags } = useFeatureFlagContext();
await fetch("/api/admin/feature-flags", { method: "PUT", ... });
refreshFlags();
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/db/settings.ts` | `PlatformFeature` type, `DEFAULT_ENABLED_FLAGS`, `ALL_PLATFORM_FEATURES`, core functions (`isFeatureEnabled`, `isFeatureEnabledForUser`, `resolveAllFlagsForUser`, override CRUD) |
| `src/lib/db/index.ts` | Barrel exports for all feature flag functions |
| `src/lib/feature-flag-context.tsx` | Client-side `FeatureFlagProvider`, `useFeatureFlag`, `useFeatureFlags`, `useFeatureFlagContext` |
| `src/lib/schemas.ts` | `PLATFORM_FEATURE_ENUM`, `featureFlagSchema`, `featureFlagOverrideSchema` |
| `src/app/api/feature-flags/route.ts` | Public GET — user-aware when session exists, global fallback for anonymous |
| `src/app/api/admin/feature-flags/route.ts` | Admin GET/PUT — global flag management with override counts |
| `src/app/api/admin/feature-flags/overrides/route.ts` | Admin GET/POST/DELETE — per-user override CRUD |
| `src/app/(app)/admin/feature-flags/page.tsx` | Admin UI — flag list, global toggles, per-user override management |
| `src/app/(app)/app-layout-client.tsx` | Where `FeatureFlagProvider` wraps the app |
| `src/lib/db/migrations.ts` | Migration v71 — `feature_flag_overrides` table |

## Database Schema

### platform_settings (global flags)

Flags stored as rows: `key = "flag_name"`, `value = "true" | "false"`. Missing key falls back to `DEFAULT_ENABLED_FLAGS`.

### feature_flag_overrides (per-user)

```sql
CREATE TABLE feature_flag_overrides (
  id TEXT PRIMARY KEY,
  flag TEXT NOT NULL,
  user_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(flag, user_id)
);
```

Indexed on `flag` and `user_id`.

## Resolution Logic

```
isFeatureEnabledForUser(flag, userId):
  1. Check feature_flag_overrides for (flag, userId) → if found, return override.enabled
  2. Check platform_settings for flag → if found, return value === "true"
  3. Return DEFAULT_ENABLED_FLAGS.has(flag)
```

## Checklist for New Feature Behind a Flag

- [ ] Add to `PlatformFeature` type in `settings.ts`
- [ ] Add to `ALL_PLATFORM_FEATURES` array in `settings.ts` (admin GET uses this list)
- [ ] Optionally add to `DEFAULT_ENABLED_FLAGS` if on by default
- [ ] Add to `PLATFORM_FEATURE_ENUM` in `schemas.ts`
- [ ] Add to anonymous path in public feature-flags route
- [ ] Add to `FLAG_META` in admin feature-flags page
- [ ] Gate server-side with `isFeatureEnabledForUser` in API routes
- [ ] Gate client-side with `useFeatureFlag` in components

**Multi-variant A/B/C?** Do not encode arms as boolean flags. Use [engineer-experiments](../engineer-experiments/SKILL.md).