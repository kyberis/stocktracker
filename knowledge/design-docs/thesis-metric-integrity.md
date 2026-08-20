# Spec: capa de integridad y narrativa del motor de tesis

*Trefolio · v1 · redactado a partir del caso NRG (nota 47/100, 20-ago-2026)*

**Code:** `src/lib/screening/thesis/metrics/`. Golden fixture: `nrg-fy2025.fixture.ts`.

**Shipped in this slice (spec §8 steps 1–3):** metric envelope, unit formatter, hard rules H1–H5, adjective bands, no litotes, NRG regression. Profile copy truncates at the last sentence (§5.2). Discard routing (§4) exists as `matchRejectFilters` but does **not** yet replace the published note. Own valuation and dated catalysts (§5.3–5.4) are not built.

Este documento es implementable tal cual. Cinco capas, en el orden en que deben ejecutarse:

```
fetch → [1] envoltorio de métrica → [2] validador → [3] enrutado → [4] secciones → [5] guards de redacción → publicar
```

La regla que gobierna todo: **ninguna métrica llega a la capa narrativa sin unidad, periodo y validación.** El fallo de NRG (una cobertura de intereses de -15,33x descrita como "justa") no fue un error de cálculo aislado; fue que el redactor recibió un número desnudo y le puso un adjetivo.

---

## 1. Envoltorio de métrica

Hoy el motor pasa números sueltos. Debe pasar objetos. Ninguna excepción.

```ts
type Metric = {
  id: string;              // "interestCoverage"
  value: number | null;    // null es un valor legítimo y se renderiza como "n/d"
  unit: "x" | "pct" | "pp" | "usd" | "count" | "years";
  period: {
    kind: "FY" | "TTM" | "Q" | "SPOT" | "CAGR";
    label: string;         // "FY2025" | "TTM 30-jun-2026" | "CAGR FY2022→FY2025"
    asOf: string;          // ISO. Fecha del dato, no de la ejecución
  };
  source: {
    provider: "fmp" | "yahoo" | "derived";
    endpoint: string;      // "income-statement" | "quote"
    filingDate?: string;   // "2026-02-24" — clave para saber si el dato es viejo
  };
  formula: string;         // "EBIT / |interestExpense|" — se muestra en el tooltip
  status: "ok" | "warn" | "error";
  flags: string[];         // ["stale_target", "mixed_period"]
};
```

Tres consecuencias inmediatas:

- **`period.label` se renderiza siempre**, junto al número. "Deuda neta / EBITDA 5,51x" es irreconciliable; "Deuda neta / EBITDA 5,51x *(TTM 30-jun-2026)*" es auditable. En el caso de NRG el 5,51x probablemente sea correcto post-LS Power, pero como no llevaba sello el lector asume que está mal.
- **`null` no es 0 ni se omite.** Se imprime "n/d" y la sección lo dice.
- **`status: "error"` bloquea la publicación de esa métrica**, no de la nota entera.

---

## 2. Catálogo de métricas canónicas

Una fórmula por métrica, escrita una sola vez y compartida por todo el sistema. Rango duro = fuera de él, `status: "error"`.

| id | Fórmula canónica | Unidad | Rango duro | `null` si |
|---|---|---|---|---|
| `roic` | NOPAT / (deuda total + patrimonio − caja y equiv.)<br>NOPAT = EBIT × (1 − tasa impositiva efectiva) | pct | −100 % a 100 % | capital invertido ≤ 0 |
| `interestCoverage` | EBIT / \|gasto por intereses\| | x | −50 a 200 | intereses = 0 |
| `netDebtToEbitda` | (deuda total − caja y equiv. − inv. c/p) / EBITDA | x | −5 a 20 | EBITDA ≤ 0 |
| `fcfToNetIncome` | **mediana** de FCF/BN en 3 ejercicios | x | −10 a 10 | BN ≤ 0 en el periodo base |
| `fcfYield` | FCF / (precio × acciones diluidas) | pct | −50 % a 50 % | capitalización ≤ 0 |
| `revenueCagr` | (Rev_n / Rev_0)^(1/n) − 1, n ≥ 3 | pct | −50 % a 100 % | falta algún periodo o Rev_0 ≤ 0 |
| `shareCountCagr` | (Acc_n / Acc_0)^(1/n) − 1, diluidas | pct | −30 % a 50 % | — |
| `grossMarginVol` | desv. típica del margen bruto, n ≥ 4 | pp | 0 a 50 | n < 4 |
| `peCurrent` | **precio / BPA diluido TTM** — *nueva, obligatoria* | x | −500 a 500 | BPA ≤ 0 |
| `peHistoric` | mediana del PER anual, excluyendo años con BPA ≤ 0 | x | 0 a 200 | < 3 años válidos |
| `drawdown52w` | precio / máx. 52 sem. − 1 — *nueva* | pct | −100 % a 0 % | — |
| `targetUpside` | objetivo consenso / precio − 1 | pct | −90 % a 300 % | sin consenso |

**Nota sobre `roic`:** el 5,37 % publicado no reconcilia con ninguna variante estándar. Con la fórmula de arriba y las cuentas FY2025 de NRG sale ~10,8 %; sin restar la caja, ~8,0 %. Elige una, escríbela en `formula` y no la cambies: un ROIC no reproducible es peor que no darlo.

**Nota sobre `fcfToNetIncome`:** el cambio a mediana de 3 años es deliberado. NRG en un solo ejercicio da 0,89x (FY2025), 1,63x (FY2024) y **FCF negativo** en FY2023. Un dato puntual en un negocio cíclico no dice nada sobre la calidad del beneficio.

---

## 3. Validador

### 3.1 Reglas duras (bloquean la métrica)

| # | Regla | Motivo |
|---|---|---|
| H1 | `sign(interestCoverage) === sign(EBIT)` | El bug de NRG. Cobertura negativa con EBIT positivo es imposible |
| H2 | Todo valor debe caer dentro del rango duro de su fila | Atrapa errores de escala (×100, ×1000) y divisiones por casi-cero |
| H3 | Todo ratio con denominador ≤ 0 devuelve `null`, nunca un número | Los ratios sobre bases negativas no significan nada |
| H4 | Todo `Metric` debe traer `unit` y `period.label` no vacíos | Sin sello no se publica |
| H5 | Un CAGR exige n periodos consecutivos completos, sin huecos | El "0,15" de ingresos sale de una ventana mal formada: el CAGR real FY2022→FY2025 es **−0,9 %** |

### 3.2 Reglas blandas (`warn` + flag, se publica con aviso)

| # | Regla | Flag | Texto obligado en la nota |
|---|---|---|---|
| S1 | Métricas de la misma sección con distinto `period.kind` | `mixed_period` | "Mezcla datos TTM y de cierre anual" |
| S2 | `targetUpside` > 40 % **o** consenso con más de 45 días | `stale_target` | "El objetivo de consenso puede no recoger la caída reciente" |
| S3 | `drawdown52w` < −25 % | `major_drawdown` | **Obliga la sección "Qué ha pasado"** |
| S4 | deuda total del periodo > 1,3× la del anterior | `debt_event` | Obliga mencionar la operación que lo explica (M&A, refinanciación) |
| S5 | `filingDate` con más de 120 días | `stale_filing` | "Últimas cuentas auditadas: {fecha}" |
| S6 | `netDebtToEbitda` > 4 **y** sector cíclico | `leveraged_cyclical` | Dispara el enrutado de descarte (§4) |

### 3.3 Pseudocódigo

```ts
function validate(m: Metric, ctx: Context): Metric {
  const rule = CATALOG[m.id];
  if (m.value === null) return { ...m, status: "ok" };            // n/d es válido
  if (!m.unit || !m.period?.label) return fail(m, "missing_envelope");
  if (m.value < rule.min || m.value > rule.max) return fail(m, "out_of_range");
  for (const inv of rule.invariants ?? []) {                       // H1 vive aquí
    if (!inv(m.value, ctx)) return fail(m, inv.name);
  }
  return { ...m, status: "ok", flags: softChecks(m, ctx) };
}
// fail() → status:"error". La métrica se rinde como "n/d — dato no fiable"
// y se emite un evento a telemetría con ticker, id y valor crudo.
```

Un `error` no se traga en silencio: se registra. Si `interestCoverage` falla en el 3 % del universo, hay un problema de datos que quieres ver en un panel.

---

## 4. Enrutado: descarte rápido vs. tesis completa

Ahora mismo toda empresa recibe el mismo tratamiento y sale un 47/100 que no decide nada. Divide la salida en dos productos:

```
if (matchesRejectFilters(company)) → NOTA DE DESCARTE (1 párrafo)
else                               → TESIS COMPLETA (§5)
```

**Filtros de descarte** (calcados de los tres errores que Estebaranz dice que le costaron dinero — cíclicas, endeudadas, directivas mal alineadas):

```ts
const rejectFilters = [
  { id: "leveraged_cyclical",
    test: c => isCyclicalSector(c) && c.netDebtToEbitda > 4,
    say: "Cíclica y apalancada: dos de los tres perfiles que más pérdidas causan." },
  { id: "no_moat_no_returns",
    test: c => c.roic < c.wacc && c.moatScore < 50,
    say: "Retorno sobre el capital por debajo del coste del capital, sin foso que lo sostenga." },
  { id: "chronic_dilution",
    test: c => c.shareCountCagr > 0.03,
    say: "Dilución sostenida por encima del 3 % anual." },
];
```

La nota de descarte es **corta y decidida**: ticker, negocio en una línea, filtro que dispara, el número que lo dispara, y qué tendría que cambiar para volver a mirarla. Nada más. Un descarte bien argumentado es un producto; un 47/100 no lo es.

NRG dispara `leveraged_cyclical`. Si aun así quieres cubrirla, márcala como **situación especial** y usa una plantilla distinta: la tesis no es de calidad, es una apuesta apalancada a la demanda eléctrica en ERCOT con la recompra como suelo.

---

## 5. Secciones nuevas de la nota

Orden de arriba abajo. Las tres primeras van **antes** de los ratios.

### 5.1 Qué ha pasado — *obligatoria si `major_drawdown` o `debt_event`*

Tres líneas: movimiento del precio a 12 meses, y los 2-3 titulares que lo explican.

- Precio: `historical-price-eod/full` (máx./mín. 52 sem., drawdown)
- Noticias: `news/stock` con `symbols`, últimos 12 meses, filtradas por relevancia
- Hechos corporativos: `earnings-calendar`, `dividends`, `splits-calendar`

*En NRG esta sección es la nota entera: −39 % desde máximos, la compra de LS Power, los 5,4 GW con GE Vernova y Kiewit, el contrato de ~1,2 GW con un hiperescalador y la pausa de centros de datos en Texas.*

### 5.2 Cómo gana dinero

Segmentos con peso en ingresos, márgenes por segmento si están, y quién es el cliente.

- `revenue-product-segmentation`, `revenue-geographic-segmentation`
- `profile` para la descripción — **truncar en el último punto, nunca a media palabra**. La nota actual corta en *"residential, com"*.

### 5.3 Valoración propia

Un rango calculado por ti pesa más que un consenso copiado. Mínimo viable:

```
BPA normalizado 3a = mediana(BPA de 5 ejercicios) × (1 + crecimiento estimado)³
Valor = BPA normalizado × múltiplo justificado    // mediana histórica del sector
Escenarios: bajista (P25 múltiplo), base (mediana), alcista (P75)
```

- `analyst-estimates` para el crecimiento
- `stock-peers` + `ratios` para el múltiplo del sector
- `treasury-rates` si aplicas la fórmula de Graham con el bono a 10 años

El objetivo de consenso se mantiene, pero **como contraste, no como conclusión**, y siempre con su fecha.

### 5.4 Catalizadores

Cada uno con fecha o ventana. Sin fecha no es catalizador, es una esperanza.

- Vencimientos de deuda: `balance-sheet-statement`
- Recompra autorizada y ejecutada: `cash-flow-statement` (`commonStockRepurchased`)
- Próximos resultados: `earnings-calendar`
- Contratos y regulación: `news/stock` + `earning-call-transcript`
- Insiders: `insider-trading/search`

### 5.5 Qué invalidaría esto

**Regla dura: al menos 2 de cada 3 disparadores deben ser variables del negocio, no umbrales contables, y cada uno lleva fecha o ventana.**

El disparador actual de NRG — *"revisar si el FCF cae por debajo del 60 % del beneficio neto"* — ya está en el 89 % y fue negativo en 2023. En un cíclico se dispara solo. Sustitúyelo por: precio de la energía en ERCOT bajo X, el contrato con el hiperescalador sin firmar antes de Q2, vencimiento de deuda de Y refinanciado por encima de Z %.

---

## 6. Guards de redacción

### 6.1 Los adjetivos salen de bandas, no del modelo

Tabla explícita por métrica. El redactor **selecciona** el adjetivo, no lo inventa. Y solo si `status === "ok"`.

| `interestCoverage` | Adjetivo |
|---|---|
| < 1,5x | crítica |
| 1,5 – 3x | ajustada |
| 3 – 6x | razonable |
| > 6x | holgada |
| `null` / `error` | *(no se adjetiva: "no disponible")* |

Con la cobertura real de NRG (2,4x) el adjetivo correcto es **ajustada** — que casualmente es lo que la nota decía. Acertó por accidente sobre un número imposible. Ese es exactamente el fallo que esta tabla previene.

### 6.2 Prohibición de lítotes

Si una métrica es claramente positiva, la frase debe ser positiva. Prohibido describir un bien como ausencia de un mal.

| Condición | Prohibido | Obligado |
|---|---|---|
| `shareCountCagr < −2 %` | "no ha subido de forma material" | "recompra el {x} % anual; {y} % acumulado en {n} años" |
| `fcfToNetIncome > 1,2` | "cubre el beneficio" | "genera {x}x el beneficio contable" |
| `roic > wacc + 5pp` | "retornos aceptables" | "retorno sobre el capital {x} pp por encima de su coste" |

*NRG ha retirado el 17 % de sus acciones en tres años (236 M → 195 M) con 1.403 M$ de recompra solo en 2025. La nota lo llamó "no ha subido de forma material".*

### 6.3 Formato de unidades

Un formateador único, sin excepciones. Hoy conviven "0,15", "0,01", "-0,05", "6,28 pp", "5,37 pct" y "5,51 x" en la misma lista.

```
x    → "2,4x"        (1 decimal)
pct  → "5,4 %"       (1 decimal, espacio antes del signo)
pp   → "6,3 pp"
usd  → "202,36 $"
null → "n/d"
```

Prohibido emitir un número sin pasar por el formateador. Prohibido "pct" como texto.

---

## 7. Test dorado: NRG, cuentas FY2025

Congela este caso como test de regresión. Fuente: `income-statement`, `balance-sheet-statement`, `cash-flow-statement` (FY2025, presentadas 24-feb-2026); precio 115,36 $ a 20-ago-2026.

| Métrica | Esperado | Publicado (fallo) | Regla que lo atrapa |
|---|---|---|---|
| `interestCoverage` | **2,4x** (1.850 / 772) | −15,33x | H1 |
| `netDebtToEbitda` (FY) | **3,2x** (12.028 / 3.805) | 5,51x sin sello | H4 / S1 |
| `fcfToNetIncome` (FY2025) | **0,89x** (766 / 864) | 1,33x sin sello | H4 |
| `fcfYield` | **3,4 %** (766 / 22.495) | 0,01 | H2 |
| `revenueCagr` FY22→FY25 | **−0,9 %** | 0,15 sin unidad | H4 / H5 |
| `shareCountCagr` | **−6,2 %** anual | −0,05 descrito como neutro | 6.2 |
| `peCurrent` | **28,8x** (115,36 / 4,01) | ausente | métrica obligatoria |
| `drawdown52w` | **−39 %** | ausente | S3 → obliga §5.1 |
| `targetUpside` | +75,4 % | +75,4 % sin aviso | S2 → `stale_target` |
| Enrutado | **descarte** `leveraged_cyclical` | tesis completa, 47/100 | §4 |

La nota corregida de NRG no debería ser una tesis de 47/100. Debería ser un párrafo de descarte, o una tesis de situación especial escrita con otra plantilla.

---

## 8. Orden de implementación

1. **Envoltorio de métrica + formateador de unidades** (§1, §6.3). Es la base; sin esto ninguna otra capa funciona.
2. **Reglas duras H1-H5** (§3.1). Una tarde de trabajo y elimina la clase de error que más credibilidad cuesta.
3. **Bandas de adjetivos + prohibición de lítotes** (§6.1, §6.2). Barato, y arregla el segundo fallo de NRG.
4. **Sección "Qué ha pasado"** (§5.1). Es la que más valor añade por línea de código.
5. **Enrutado de descarte** (§4). Convierte el 47/100 en una decisión.
6. **Valoración propia y catalizadores** (§5.3, §5.4). Lo más caro; lo último.

---

*Cifras verificadas contra FMP el 20-ago-2026. Informativo, no es asesoramiento de inversión.*
