# streaming-ai-pattern

> Shape of an AI streaming route.

## Route shape (Vercel Functions, Node runtime)

```ts
import { aiStream } from '@/lib/ai-stream';

export async function POST(req: Request) {
  const user = await requireUser(req);
  await requireSubscriptionFeature(user, 'ai');
  await consumeAiQuota(user); // writes pending ai_logs row

  const { prompt } = await req.json();

  return aiStream({
    model: await pickModel('ai-analysis'),
    prompt,
    user,
    onFinish: async (log) => {
      await finalizeAiLog(log); // tokens, latency
    },
  });
}
```

## Rules
- Always call `consumeAiQuota` before producing tokens (so failures are logged).
- Always sanitize model output before rendering as markdown.
- Always pass an AbortSignal to the upstream client so disconnected clients don't keep burning tokens.
- Never log prompt text that may contain PII.

## Error handling
- On provider 5xx: retry once with backoff, then 503 w/ `retry-after`.
- On timeout: close the stream cleanly with a final `{ error: "timeout" }` chunk.

## Prefer AI Gateway
Default to `"provider/model"` strings routed through Vercel AI Gateway. Avoid provider-specific packages unless there's a strong reason.

## Related
- [ai-stream](../product-specs/ai-stream.md)
- [ai-models-registry](../product-specs/ai-models-registry.md)
- [ai-analysis](../product-specs/ai-analysis.md)
