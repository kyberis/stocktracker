---
name: engineer-experiments
description: Creates and wires first-party A/B/C experiments (sticky variants, draft→launch, admin live metrics). Use when a feature needs multi-variant UI testing, empty-state experiments, or when the user asks for A/B or A/B/C testing.
---

# First-party Experiments Engineer

## When to use

- Feature needs **2+ UI variants** measured by conversion events
- Multi-arm tests (A/B/C) — **not** boolean feature flags
- Empty / onboarding / welcome surfaces

Use [engineer-feature-flags](../engineer-feature-flags/SKILL.md) for on/off gates only.

## Architecture (read first)

| Piece | Path |
|-------|------|
| DAL | `src/lib/db/experiments.ts` |
| User resolve | `GET /api/experiments/[key]` → `resolveExperimentVariant` |
| Client hook | `src/lib/use-experiment.ts` (`useExperiment`, `trackExperimentEvent`) |
| Admin UI | `/admin/experiments` |
| Admin APIs | `/api/admin/experiments` (+ `[id]`, `status`, `reset`, `stats`) |
| Spec | `knowledge/product-specs/experiments.md` |

**Sticky assignment:** hash(`userId:key:resetGeneration`) → bucket → weighted variant. Stored in `experiment_assignments`. **Reset** deletes rows and bumps `reset_generation`.

**Lifecycle:** create as `draft` → human **Launch** in admin → `running`. Agents must **not** auto-launch.

## Checklist (mandatory)

```md
Experiments Checklist
- [ ] Experiment key stable snake_case (e.g. empty_activation)
- [ ] ≥2 variants, one named `control`, weights sum to 100
- [ ] metrics_json lists conversion event names
- [ ] Created as **draft** (admin UI, POST /api/admin/experiments, or scripts/create-experiment.ts)
- [ ] UI uses useExperiment(key) or getExperimentVariant(userId, key)
- [ ] CTAs call trackExperimentEvent with experiment + variant metadata
- [ ] New client events added to ALLOWED_EVENTS in /api/analytics/track
- [ ] Product spec + index entry if this is a lasting experiment surface
- [ ] Leave status=draft — do not Launch from code
```

## Create a draft (API)

```bash
# As admin session cookie:
curl -X POST http://localhost:3010/api/admin/experiments \
  -H 'Content-Type: application/json' \
  -d '{
    "key": "my_feature_test",
    "name": "My feature test",
    "description": "Control vs treatment for …",
    "variants": [
      {"key": "control", "weight": 50},
      {"key": "treatment", "weight": 50}
    ],
    "metrics": ["my_feature_cta", "holding_add"]
  }'
```

Or: `npx tsx scripts/create-experiment.ts --key my_feature_test --name "…" --variants control:50,treatment:50 --metrics my_feature_cta,holding_add`

## Wire the UI

```tsx
import { useExperiment, trackExperimentEvent } from "@/lib/use-experiment";

function Feature() {
  const { variant, loading } = useExperiment("my_feature_test");
  if (loading) return null; // or skeleton

  const onCta = () => {
    void trackExperimentEvent("my_feature_cta", {
      experiment: "my_feature_test",
      variant,
      cta: "primary",
    });
    // …
  };

  if (variant === "treatment") return <Treatment onCta={onCta} />;
  return <Control onCta={onCta} />;
}
```

Demo / unauthenticated: pass `forceVariant: "control"` or `enabled: false`.

## Events

- `experiment_exposure` — written **server-side** on first assignment (do not double-fire from client).
- Conversion events — client via `trackExperimentEvent` or existing server `trackEvent` (e.g. `holding_add`).
- Stats join assignments × events after `assigned_at`. Metric names on the experiment must match `analytics_events.event`.

## Admin ops

| Action | Effect |
|--------|--------|
| Launch | `draft`/`paused` → `running`; assign on next resolve |
| Pause | Keep sticky variants; no new assignments (unassigned users see control) |
| Reset | Delete assignments + bump generation → re-bucket on next visit |
| Archive | Freeze |
| Preview | Opens `/admin/experiments/preview?key=&variant=` — client sessionStorage override; no assignment/metrics. Register new surfaces on the preview page when adding consumers. |
| Metrics catalog | `/admin/experiments/metrics` — curated list of `analytics_events` usable as conversion metrics (see `src/lib/experiment-metrics-catalog.ts`). GA-only `useTrack` events are excluded. |

> When `draft`/`archived`, resolve returns **control**. When `paused`, sticky is kept but new users are not assigned. Launch when ready to measure.
## Reference consumer

`empty_activation` — `src/components/EmptyPortfolio.tsx` variants `control` | `portfolio_first` | `job_chooser`, metrics `empty_activation_cta`, `holding_add`.
