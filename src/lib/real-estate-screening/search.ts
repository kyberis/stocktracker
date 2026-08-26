/**
 * Accent-tolerant, typo-tolerant search over INE zone names.
 * "Setubal" matches "Setúbal"; small Levenshtein distance still ranks.
 */

export function foldPt(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length];
}

export function zoneSearchScore(query: string, nombre: string, distrito: string): number {
  const q = foldPt(query);
  if (!q) return 0;
  const name = foldPt(nombre);
  const dist = foldPt(distrito);
  if (name === q) return 100;
  if (name.startsWith(q)) return 90;
  if (name.includes(q)) return 80;
  if (dist.includes(q)) return 55;
  const d = levenshtein(q, name.slice(0, Math.max(q.length, name.length)));
  if (d <= 1) return 70;
  if (d <= 2) return 50;
  if (d <= 3 && q.length >= 5) return 30;
  return 0;
}

export function disabledReason(opts: {
  tieneDatosVenta: boolean;
  tieneDatosRenta: boolean;
}): "sin_datos_venta" | "sin_datos_renta" | "sin_datos" | null {
  if (opts.tieneDatosVenta && opts.tieneDatosRenta) return null;
  if (!opts.tieneDatosVenta && !opts.tieneDatosRenta) return "sin_datos";
  if (!opts.tieneDatosVenta) return "sin_datos_venta";
  return "sin_datos_renta";
}

export function zoneSelectable(opts: {
  tieneDatosVenta: boolean;
  tieneDatosRenta: boolean;
}): boolean {
  return opts.tieneDatosVenta && opts.tieneDatosRenta;
}
