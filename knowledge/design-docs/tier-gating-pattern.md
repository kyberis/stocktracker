# tier-gating-pattern

> How we gate a feature behind a tier / flag / trial.

## Canonical server-side gate

```ts
import { requireFeatureFlag } from '@/lib/feature-flags';
import { requireSubscriptionFeature } from '@/lib/subscription-features';

export async function POST(req: Request) {
  const user = await requireUser(req);
  await requireFeatureFlag(user, 'FEATURE_FLAG_NAME');
  await requireSubscriptionFeature(user, 'feature-name');
  // ...
}
```

## Resolution order
1. Feature flag (kill switch, beta opt-in).
2. Active trial.
3. Subscription tier.

## UI pattern
- Use `useFeatureFlag()` + `useSubscription()` to drive render-time gating.
- Show the paywall component at the place the feature would have rendered, with a direct upgrade CTA.
- Never silently hide Pro surfaces from Free users who clicked into them.

## What never works
- UI-only gating (inspect-element bypass).
- Feature flag without server-side tier check.

## Related
- [feature-flags](../product-specs/feature-flags.md)
- [subscription-tiers](../product-specs/subscription-tiers.md)
- [paywall](../product-specs/paywall.md)
