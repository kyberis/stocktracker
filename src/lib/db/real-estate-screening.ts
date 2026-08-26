import { createHash, randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { num, str } from "./helpers";
import type {
  ReScreeningPhase,
  ReScreeningStatus,
  ReStepStatus,
  RealEstateScreeningParams,
  ReZonaTipo,
} from "@/lib/real-estate-screening/schemas";
import { disabledReason } from "@/lib/real-estate-screening/search";

export interface ReZonaRow {
  geocod: string;
  nombre: string;
  tipo: ReZonaTipo;
  parentGeocod: string | null;
  distrito: string;
  amMetropolitana: boolean;
  tieneDatosVenta: boolean;
  tieneDatosRenta: boolean;
  syncedAt: string;
}

function readZona(row: Record<string, unknown>): ReZonaRow {
  const parent = str(row.parent_geocod);
  return {
    geocod: str(row.geocod),
    nombre: str(row.nombre),
    tipo: str(row.tipo) as ReZonaTipo,
    parentGeocod: parent || null,
    distrito: str(row.distrito),
    amMetropolitana: num(row.am_metropolitana) === 1,
    tieneDatosVenta: num(row.tiene_datos_venta) === 1,
    tieneDatosRenta: num(row.tiene_datos_renta) === 1,
    syncedAt: str(row.synced_at),
  };
}

export function zonaToApi(row: ReZonaRow) {
  return {
    ...row,
    disabledReason: disabledReason(row),
  };
}

export async function upsertZonaCatalogo(rows: Omit<ReZonaRow, "syncedAt">[]): Promise<number> {
  if (rows.length === 0) return 0;
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  let n = 0;
  for (const r of rows) {
    await client.execute({
      sql: `INSERT INTO re_zona_catalogo
              (geocod, nombre, tipo, parent_geocod, distrito, am_metropolitana,
               tiene_datos_venta, tiene_datos_renta, synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(geocod) DO UPDATE SET
              nombre = excluded.nombre,
              tipo = excluded.tipo,
              parent_geocod = excluded.parent_geocod,
              distrito = excluded.distrito,
              am_metropolitana = excluded.am_metropolitana,
              tiene_datos_venta = excluded.tiene_datos_venta,
              tiene_datos_renta = excluded.tiene_datos_renta,
              synced_at = excluded.synced_at`,
      args: [
        r.geocod,
        r.nombre,
        r.tipo,
        r.parentGeocod ?? "",
        r.distrito,
        r.amMetropolitana ? 1 : 0,
        r.tieneDatosVenta ? 1 : 0,
        r.tieneDatosRenta ? 1 : 0,
        now,
      ],
    });
    n += 1;
  }
  return n;
}

export async function countZonaCatalogo(): Promise<number> {
  const client = await ensureInitialized();
  const res = await client.execute("SELECT COUNT(*) AS c FROM re_zona_catalogo");
  return num(res.rows[0]?.c);
}

export async function getZonasByGeocods(geocods: string[]): Promise<ReZonaRow[]> {
  if (geocods.length === 0) return [];
  const client = await ensureInitialized();
  const placeholders = geocods.map(() => "?").join(",");
  const res = await client.execute({
    sql: `SELECT * FROM re_zona_catalogo WHERE geocod IN (${placeholders})`,
    args: geocods,
  });
  return res.rows.map((r) => readZona(r as Record<string, unknown>));
}

export async function listZonaCatalogo(limit = 4000): Promise<ReZonaRow[]> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: `SELECT * FROM re_zona_catalogo ORDER BY distrito, tipo, nombre LIMIT ?`,
    args: [limit],
  });
  return res.rows.map((r) => readZona(r as Record<string, unknown>));
}

export async function upsertIneCache(row: {
  varcd: string;
  geocod: string;
  periodo: string;
  valor: number | null;
}): Promise<void> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO re_ine_cache (varcd, geocod, periodo, valor, fetched_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(varcd, geocod, periodo) DO UPDATE SET
            valor = excluded.valor,
            fetched_at = excluded.fetched_at`,
    args: [row.varcd, row.geocod, row.periodo, row.valor, now],
  });
}

export async function getIneCache(
  varcd: string,
  geocod: string,
): Promise<Array<{ periodo: string; valor: number | null; fetchedAt: string }>> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: `SELECT periodo, valor, fetched_at FROM re_ine_cache
          WHERE varcd = ? AND geocod = ? ORDER BY periodo ASC`,
    args: [varcd, geocod],
  });
  return res.rows.map((r) => ({
    periodo: str(r.periodo),
    valor: r.valor == null ? null : num(r.valor),
    fetchedAt: str(r.fetched_at),
  }));
}

export async function upsertListingCache(row: {
  portal: string;
  listingId: string;
  payloadJson: string;
}): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `INSERT INTO re_listing_cache (portal, listing_id, payload_json, fetched_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(portal, listing_id) DO UPDATE SET
            payload_json = excluded.payload_json,
            fetched_at = excluded.fetched_at`,
    args: [row.portal, row.listingId, row.payloadJson, new Date().toISOString()],
  });
}

export interface ReScreeningRunRow {
  id: string;
  userId: string;
  zonasJson: string;
  paramsJson: string;
  status: ReScreeningStatus;
  phase: ReScreeningPhase | "";
  progressJson: string;
  idempotencyKey: string;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
}

function readRun(row: Record<string, unknown>): ReScreeningRunRow {
  const err = str(row.error);
  const finished = str(row.finished_at);
  return {
    id: str(row.id),
    userId: str(row.user_id),
    zonasJson: str(row.zonas_json),
    paramsJson: str(row.params_json),
    status: str(row.status) as ReScreeningStatus,
    phase: str(row.phase) as ReScreeningPhase | "",
    progressJson: str(row.progress_json) || "[]",
    idempotencyKey: str(row.idempotency_key),
    error: err || null,
    createdAt: str(row.created_at),
    finishedAt: finished || null,
  };
}

export function buildIdempotencyKey(
  userId: string,
  geocods: string[],
  params: RealEstateScreeningParams,
  dayUtc: string,
): string {
  const payload = JSON.stringify({
    userId,
    geocods: [...geocods].sort(),
    params,
    day: dayUtc,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export async function findRunByIdempotencyKey(
  userId: string,
  key: string,
): Promise<ReScreeningRunRow | null> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: `SELECT * FROM re_screening_runs WHERE user_id = ? AND idempotency_key = ? LIMIT 1`,
    args: [userId, key],
  });
  if (res.rows.length === 0) return null;
  return readRun(res.rows[0] as Record<string, unknown>);
}

export async function createReScreeningRun(params: {
  userId: string;
  zonasJson: string;
  paramsJson: string;
  idempotencyKey: string;
  id?: string;
}): Promise<ReScreeningRunRow> {
  const client = await ensureInitialized();
  const id = params.id ?? randomUUID();
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO re_screening_runs
            (id, user_id, zonas_json, params_json, status, phase, progress_json,
             idempotency_key, error, created_at, finished_at)
          VALUES (?, ?, ?, ?, 'pending', '', '[]', ?, '', ?, '')`,
    args: [
      id,
      params.userId,
      params.zonasJson,
      params.paramsJson,
      params.idempotencyKey,
      now,
    ],
  });
  return {
    id,
    userId: params.userId,
    zonasJson: params.zonasJson,
    paramsJson: params.paramsJson,
    status: "pending",
    phase: "",
    progressJson: "[]",
    idempotencyKey: params.idempotencyKey,
    error: null,
    createdAt: now,
    finishedAt: null,
  };
}

export async function getReScreeningRun(
  id: string,
  userId: string,
): Promise<ReScreeningRunRow | null> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: `SELECT * FROM re_screening_runs WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  if (res.rows.length === 0) return null;
  return readRun(res.rows[0] as Record<string, unknown>);
}

export async function getReScreeningRunUnscoped(id: string): Promise<ReScreeningRunRow | null> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: `SELECT * FROM re_screening_runs WHERE id = ?`,
    args: [id],
  });
  if (res.rows.length === 0) return null;
  return readRun(res.rows[0] as Record<string, unknown>);
}

export async function listReScreeningRunsByUser(
  userId: string,
  limit = 20,
): Promise<ReScreeningRunRow[]> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: `SELECT * FROM re_screening_runs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    args: [userId, limit],
  });
  return res.rows.map((r) => readRun(r as Record<string, unknown>));
}

export async function updateReScreeningRun(id: string, patch: {
  status?: ReScreeningStatus;
  phase?: ReScreeningPhase | "";
  progressJson?: string;
  error?: string | null;
  finished?: boolean;
}): Promise<void> {
  const client = await ensureInitialized();
  const current = await getReScreeningRunUnscoped(id);
  if (!current) return;
  const status = patch.status ?? current.status;
  const phase = patch.phase ?? current.phase;
  const progressJson = patch.progressJson ?? current.progressJson;
  const error = patch.error === undefined ? current.error : patch.error;
  const finishedAt = patch.finished ? new Date().toISOString() : (current.finishedAt ?? "");
  await client.execute({
    sql: `UPDATE re_screening_runs
          SET status = ?, phase = ?, progress_json = ?, error = ?, finished_at = ?
          WHERE id = ?`,
    args: [status, phase, progressJson, error ?? "", finishedAt, id],
  });
}

export interface ReStepRow {
  id: string;
  runId: string;
  phase: ReScreeningPhase;
  status: ReStepStatus;
  attempts: number;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  dependsOn: string[];
  errorMessage: string | null;
  payloadJson: string;
  createdAt: string;
  updatedAt: string;
}

function readStep(row: Record<string, unknown>): ReStepRow {
  let dependsOn: string[] = [];
  try {
    const parsed = JSON.parse(str(row.depends_on) || "[]");
    if (Array.isArray(parsed)) dependsOn = parsed.filter((x) => typeof x === "string");
  } catch {
    dependsOn = [];
  }
  return {
    id: str(row.id),
    runId: str(row.run_id),
    phase: str(row.phase) as ReScreeningPhase,
    status: str(row.status) as ReStepStatus,
    attempts: num(row.attempts),
    leaseOwner: str(row.lease_owner) || null,
    leaseExpiresAt: str(row.lease_expires_at) || null,
    dependsOn,
    errorMessage: str(row.error_message) || null,
    payloadJson: str(row.payload_json) || "{}",
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export async function insertReSteps(
  runId: string,
  phases: ReScreeningPhase[],
): Promise<ReStepRow[]> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  const created: ReStepRow[] = [];
  let prevId: string | null = null;
  for (const phase of phases) {
    const id = randomUUID();
    const depends = prevId ? [prevId] : [];
    await client.execute({
      sql: `INSERT INTO re_screening_steps
              (id, run_id, phase, status, attempts, lease_owner, lease_expires_at,
               depends_on, error_message, payload_json, created_at, updated_at)
            VALUES (?, ?, ?, 'pending', 0, '', '', ?, '', '{}', ?, ?)`,
      args: [id, runId, phase, JSON.stringify(depends), now, now],
    });
    created.push({
      id,
      runId,
      phase,
      status: "pending",
      attempts: 0,
      leaseOwner: null,
      leaseExpiresAt: null,
      dependsOn: depends,
      errorMessage: null,
      payloadJson: "{}",
      createdAt: now,
      updatedAt: now,
    });
    prevId = id;
  }
  return created;
}

export async function listReStepsForRun(runId: string): Promise<ReStepRow[]> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: `SELECT * FROM re_screening_steps WHERE run_id = ? ORDER BY created_at ASC`,
    args: [runId],
  });
  return res.rows.map((r) => readStep(r as Record<string, unknown>));
}

const LEASE_MS = 5 * 60_000;
const MAX_ATTEMPTS = 3;

export async function leaseNextReStep(runId?: string): Promise<ReStepRow | null> {
  const client = await ensureInitialized();
  const now = new Date();
  const nowIso = now.toISOString();
  const sql = runId
    ? `SELECT * FROM re_screening_steps WHERE run_id = ? AND status = 'pending' ORDER BY created_at ASC`
    : `SELECT * FROM re_screening_steps WHERE status = 'pending' ORDER BY created_at ASC`;
  const res = await client.execute({
    sql,
    args: runId ? [runId] : [],
  });
  for (const raw of res.rows) {
    const step = readStep(raw as Record<string, unknown>);
    if (step.dependsOn.length > 0) {
      const deps = await client.execute({
        sql: `SELECT id, status FROM re_screening_steps WHERE id IN (${step.dependsOn.map(() => "?").join(",")})`,
        args: step.dependsOn,
      });
      const allDone = deps.rows.every((r) => str(r.status) === "done" || str(r.status) === "failed" || str(r.status) === "skipped");
      if (!allDone) continue;
    }
    const owner = randomUUID();
    const expires = new Date(now.getTime() + LEASE_MS).toISOString();
    const upd = await client.execute({
      sql: `UPDATE re_screening_steps
            SET status = 'running', lease_owner = ?, lease_expires_at = ?,
                attempts = attempts + 1, updated_at = ?
            WHERE id = ? AND status = 'pending'`,
      args: [owner, expires, nowIso, step.id],
    });
    if (num(upd.rowsAffected) === 1) {
      return { ...step, status: "running", leaseOwner: owner, leaseExpiresAt: expires, attempts: step.attempts + 1 };
    }
  }
  return null;
}

export async function completeReStep(id: string, payloadJson: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE re_screening_steps
          SET status = 'done', payload_json = ?, error_message = '',
              lease_owner = '', lease_expires_at = '', updated_at = ?
          WHERE id = ?`,
    args: [payloadJson, new Date().toISOString(), id],
  });
}

export async function failReStep(id: string, errorMessage: string, attempts: number): Promise<void> {
  const client = await ensureInitialized();
  const terminal = attempts >= MAX_ATTEMPTS ? "failed" : "pending";
  await client.execute({
    sql: `UPDATE re_screening_steps
          SET status = ?, error_message = ?, lease_owner = '', lease_expires_at = '', updated_at = ?
          WHERE id = ?`,
    args: [terminal, errorMessage.slice(0, 2000), new Date().toISOString(), id],
  });
}

export async function recoverExpiredReLeases(now = new Date()): Promise<{ requeued: number; failed: number }> {
  const client = await ensureInitialized();
  const iso = now.toISOString();
  const stuck = await client.execute({
    sql: `SELECT * FROM re_screening_steps
          WHERE status = 'running' AND lease_expires_at != '' AND lease_expires_at < ?`,
    args: [iso],
  });
  let requeued = 0;
  let failed = 0;
  for (const raw of stuck.rows) {
    const step = readStep(raw as Record<string, unknown>);
    if (step.attempts >= MAX_ATTEMPTS) {
      await failReStep(step.id, step.errorMessage ?? "lease expired", step.attempts);
      failed += 1;
    } else {
      await client.execute({
        sql: `UPDATE re_screening_steps
              SET status = 'pending', lease_owner = '', lease_expires_at = '', updated_at = ?
              WHERE id = ?`,
        args: [iso, step.id],
      });
      requeued += 1;
    }
  }
  return { requeued, failed };
}

export async function countPendingReSteps(): Promise<number> {
  const client = await ensureInitialized();
  const res = await client.execute(
    `SELECT COUNT(*) AS c FROM re_screening_steps WHERE status IN ('pending', 'running')`,
  );
  return num(res.rows[0]?.c);
}

export async function upsertReResult(runId: string, payloadJson: string, coberturaJson: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `INSERT INTO re_screening_results (run_id, payload_json, cobertura_json, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(run_id) DO UPDATE SET
            payload_json = excluded.payload_json,
            cobertura_json = excluded.cobertura_json,
            updated_at = excluded.updated_at`,
    args: [runId, payloadJson, coberturaJson, new Date().toISOString()],
  });
}

export async function getReResult(runId: string): Promise<{
  payloadJson: string;
  coberturaJson: string;
} | null> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: `SELECT payload_json, cobertura_json FROM re_screening_results WHERE run_id = ?`,
    args: [runId],
  });
  if (res.rows.length === 0) return null;
  return {
    payloadJson: str(res.rows[0].payload_json),
    coberturaJson: str(res.rows[0].cobertura_json),
  };
}
