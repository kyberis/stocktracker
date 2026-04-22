# references/

This folder holds condensed, agent-legible references to external systems the
codebase depends on. Think "llms.txt": one file per external system, short
enough to drop into context, long enough to answer most questions without a
web search.

Populate on demand: when an agent finds itself re-learning the same external
API three times, write a reference file here.

Suggested seeds:

- `nextjs-app-router.llms.txt` — routing, caching, middleware rules we follow.
- `capacitor.llms.txt` — hosted-mode basics, bridge patterns, push setup.
- `stripe.llms.txt` — checkout + portal + webhook + idempotency.
- `snaptrade.llms.txt` — registration, connection portal URL, sync cursor.
- `recharts.llms.txt` — performance tricks we use in the portfolio chart.
- `drizzle.llms.txt` — conventions for our data-access functions.
- `lvgl.llms.txt` — LVGL patterns used in the Leaf firmware.
- `platformio.llms.txt` — build/flash commands for the Leaf target.

Keep each file under 2,000 lines. Cross-link back to the product specs that
use the system.
