# Email draft: existing Pro subscribers — v2.0 quota-model launch

> Send once to all currently active Trefolio (Pro) subscribers when v2.0.0
> rolls out. Voice: friendly, factual, reassuring. Voice rules per
> `.cursor/skills/ux-writer/SKILL.md`. Compliance per
> `.cursor/skills/legal-advisor/SKILL.md` and
> `.cursor/skills/automated-user-comms/SKILL.md`.

## Subject (en)

> Your Trefolio plan: nothing changes for you (just the model around it)

## Subject (es)

> Tu plan Trefolio: para ti no cambia nada (solo el modelo)

## Body (en)

Hi {{firstName}},

We just shipped trefolio 2.0 with a simpler subscription model: every feature
is now included on the Free Folio plan, and Trefolio Pro multiplies the monthly
quotas for AI consultations and premium-data lookups instead of unlocking new
screens.

**For you, nothing changes.** Your Trefolio plan, billing date, price, and
benefits stay exactly the same. Pro quotas are sized so normal use never hits
a wall — typically around 20× the Free-tier limits.

What's new on your account:

- A small "X / Y this period" badge on every quota-bearing screen so you can
  see at a glance how much headroom you have left.
- Unified pricing page with a single quota-comparison table.

You don't need to do anything. If you have questions, reply to this email or
open the in-app support chat.

Thanks for being a Trefolio subscriber.

— The trefolio team

## Body (es)

Hola {{firstName}},

Acabamos de lanzar trefolio 2.0 con un modelo de suscripción más simple: ahora
todas las funciones están incluidas en el plan Folio gratuito, y Trefolio Pro
multiplica las cuotas mensuales de consultas de IA y datos premium en lugar de
desbloquear pantallas nuevas.

**Para ti no cambia nada.** Tu plan Trefolio, la fecha y el precio de
facturación y los beneficios se mantienen exactamente igual. Las cuotas Pro
están dimensionadas para que el uso normal no se tope con ningún límite —
suelen ser unas 20× las del plan gratuito.

Lo nuevo que verás en tu cuenta:

- Una pequeña insignia "X / Y este período" en cada pantalla con cuota para que
  veas de un vistazo cuánto margen te queda.
- Página de precios unificada con una única tabla de comparación de cuotas.

No tienes que hacer nada. Si tienes alguna pregunta, responde a este correo o
abre el chat de soporte dentro de la app.

Gracias por ser suscriptor de Trefolio.

— El equipo de trefolio

## Operational notes

- Audience: `users.plan = 'pro' AND (plan_expires_at IS NULL OR plan_expires_at > now())`.
- Send via Resend through the existing transactional sender (no new template
  category yet — copy can be pasted into a one-off campaign).
- Honor unsubscribe preferences for `transactional_announcements` if present.
- Localize at minimum `en` and `es`; for other locales use English fallback.
