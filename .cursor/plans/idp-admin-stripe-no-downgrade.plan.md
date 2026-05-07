---
name: IdP admin Stripe no-downgrade
overview: El admin de user.trefolio.com no puede hacer downgrade a Free si el usuario está en Pro y ese Pro está gestionado por Stripe (activado/actualizado vía webhooks con origen Stripe).
todos:
  - id: guard-setPlanAction
    content: getEntitlement + bloqueo pro→free si Pro activado por Stripe; al guardar Pro, preservar source "stripe"
    status: completed
  - id: admin-ui
    content: UI en Plan & entitlements (opción Free deshabilitada o mensaje + enlace opcional a customer en Stripe)
    status: completed
  - id: import-api
    content: POST /api/v1/admin/users/import — 409 si el body implicaría downgrade con Pro+Stripe
    status: completed
  - id: spec-doc
    content: Actualizar knowledge/product-specs/unified-accounts-admin.md
    status: completed
isProject: false
---

# Admin IdP — sin downgrade si Pro fue activado por Stripe

## Regla de producto (definitiva)

**No permitir downgrade** (pasar a **Free**) cuando el usuario está en **Pro** y ese estado fue **activado o mantenido por Stripe**.

En la implementación actual del IdP, eso se corresponde con:

- `entitlements.plan === "pro"` **y**
- `entitlements.source === "stripe"` (lo escriben los webhooks en `[external/accounts/src/lib/apply-stripe-event.ts](external/accounts/src/lib/apply-stripe-event.ts)`).

No se llama a la API de Stripe en esta fase; la BD refleja “activado por Stripe” vía `source`.

**Casos permitidos:** upgrade manual Free→Pro, cambiar `pro_until` manteniendo Pro, y cualquier cambio cuando el Pro **no** viene de Stripe (`source` distinto o sin fila de entitlements coherente).

**Tras** un webhook que deje al usuario en Free con `source` aún `stripe`, el admin **sí** puede volver a otorgar Pro manual (no es downgrade desde Pro Stripe).

## Cambios técnicos

1. `**[external/accounts/src/app/admin/users/[sub]/page.tsx](external/accounts/src/app/admin/users/[sub]/page.tsx)`** — `setPlanAction`: antes de `setPlan(..., "free", ...)`, leer `getEntitlement(sub)`; si `plan === "pro"` y `source === "stripe"`, abortar y comunicar error (p. ej. searchParam). Al guardar **Pro**, si `source === "stripe"`, llamar `setPlan(sub, "pro", iso, "stripe")` para no pisar el origen con `"dev-toggle"`.
2. **UI**: si la regla aplica, deshabilitar u ocultar la opción Free y texto breve para operadores (gestionar cancelación en Stripe / dashboard).
3. `**[external/accounts/src/app/api/v1/admin/users/import/route.ts](external/accounts/src/app/api/v1/admin/users/import/route.ts)`**: misma condición; si el merge resolvería **downgrade** con Pro+Stripe, responder **409** con código estable (`stripe_managed_pro`).
4. `**[knowledge/product-specs/unified-accounts-admin.md](knowledge/product-specs/unified-accounts-admin.md)`**: documentar la regla en la tabla de acciones.

## Diagrama

```mermaid
flowchart TD
  A[Admin guarda plan] --> B{objetivo Free?}
  B -->|no| C[Persistir Pro]
  B -->|sí| D{Pro y source stripe?}
  D -->|sí| E[Rechazar: Pro activado por Stripe]
  D -->|no| F[Permitir Free]
  C --> G{mantener source stripe?}
  G -->|sí| H[setPlan con source stripe]
  G -->|no| I[setPlan dev-toggle o admin]
```



## Fuera de alcance

- Warren/trefolio billing principal; solo IdP admin + import API.

