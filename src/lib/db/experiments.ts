import { createHash, randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";
import { trackEvent } from "./analytics";

export type ExperimentStatus = "draft" | "running" | "paused" | "archived";

export interface ExperimentVariant {
  key: string;
  weight: number;
}

export interface Experiment {
  id: string;
  key: string;
  name: string;
  description: string;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  metrics: string[];
  resetGeneration: number;
  createdAt: string;
  updatedAt: string;
  launchedAt: string;
  resetAt: string;
  assignedCount?: number;
}

export interface ExperimentAssignment {
  experimentId: string;
  userId: string;
  variant: string;
  assignedAt: string;
}

export interface ExperimentVariantStats {
  variant: string;
  assigned: number;
  exposed: number;
  metrics: Record<string, { users: number; rate: number; last24h: number }>;
}

export interface ExperimentStats {
  experimentId: string;
  key: string;
  status: ExperimentStatus;
  variants: ExperimentVariantStats[];
  metrics: string[];
}

const STATUSES = new Set<ExperimentStatus>(["draft", "running", "paused", "archived"]);

function parseVariants(raw: string): ExperimentVariant[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => ({
        key: String((v as ExperimentVariant).key || "").trim(),
        weight: Math.max(0, Math.floor(Number((v as ExperimentVariant).weight) || 0)),
      }))
      .filter((v) => v.key.length > 0);
  } catch {
    return [];
  }
}

function parseMetrics(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m) => String(m).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function mapExperiment(row: import("@libsql/client").Row): Experiment {
  return {
    id: str(row.id),
    key: str(row.key),
    name: str(row.name),
    description: str(row.description),
    status: (STATUSES.has(str(row.status) as ExperimentStatus)
      ? str(row.status)
      : "draft") as ExperimentStatus,
    variants: parseVariants(str(row.variants_json)),
    metrics: parseMetrics(str(row.metrics_json)),
    resetGeneration: Number(row.reset_generation) || 0,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    launchedAt: str(row.launched_at),
    resetAt: str(row.reset_at),
    assignedCount:
      row.assigned_count != null ? Number(row.assigned_count) || 0 : undefined,
  };
}

export function controlVariantKey(variants: ExperimentVariant[]): string {
  const control = variants.find((v) => v.key === "control");
  return control?.key ?? variants[0]?.key ?? "control";
}

/** Deterministic bucket 0–99 from assignment seed. */
export function hashToBucket(seed: string): number {
  const digest = createHash("sha256").update(seed).digest();
  return digest.readUInt32BE(0) % 100;
}

export function pickVariant(
  variants: ExperimentVariant[],
  bucket: number,
): string {
  if (variants.length === 0) return "control";
  const total = variants.reduce((sum, v) => sum + v.weight, 0);
  if (total <= 0) return controlVariantKey(variants);
  // Normalize to 100-scale using cumulative weights
  let acc = 0;
  const scaled = bucket % total;
  for (const v of variants) {
    acc += v.weight;
    if (scaled < acc) return v.key;
  }
  return variants[variants.length - 1]!.key;
}

export function assignmentSeed(
  userId: string,
  experimentKey: string,
  resetGeneration: number,
): string {
  return `${userId}:${experimentKey}:${resetGeneration}`;
}

export function validateVariants(variants: ExperimentVariant[]): string | null {
  if (variants.length < 2) return "At least 2 variants required";
  const keys = new Set<string>();
  for (const v of variants) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(v.key)) {
      return `Invalid variant key: ${v.key}`;
    }
    if (keys.has(v.key)) return `Duplicate variant key: ${v.key}`;
    keys.add(v.key);
    if (v.weight < 0 || !Number.isFinite(v.weight)) {
      return `Invalid weight for ${v.key}`;
    }
  }
  const sum = variants.reduce((s, v) => s + v.weight, 0);
  if (sum !== 100) return `Variant weights must sum to 100 (got ${sum})`;
  if (!keys.has("control") && variants[0]!.key !== "control") {
    // Prefer an explicit control; allow missing only if first is named control — require control key
    return "One variant must be named control";
  }
  if (!keys.has("control")) return "One variant must be named control";
  return null;
}

export function validateMetrics(metrics: string[]): string | null {
  if (metrics.length === 0) return "At least one metric event is required";
  for (const m of metrics) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(m)) return `Invalid metric: ${m}`;
  }
  return null;
}

export async function listExperiments(): Promise<Experiment[]> {
  const client = await ensureInitialized();
  const result = await client.execute(`
    SELECT e.*,
           (SELECT COUNT(*) FROM experiment_assignments a WHERE a.experiment_id = e.id) AS assigned_count
    FROM experiments e
    ORDER BY e.updated_at DESC
  `);
  return result.rows.map(mapExperiment);
}

export async function getExperimentById(id: string): Promise<Experiment | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `
      SELECT e.*,
             (SELECT COUNT(*) FROM experiment_assignments a WHERE a.experiment_id = e.id) AS assigned_count
      FROM experiments e
      WHERE e.id = ?
    `,
    args: [id],
  });
  const row = result.rows[0];
  return row ? mapExperiment(row) : null;
}

export async function getExperimentByKey(key: string): Promise<Experiment | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `
      SELECT e.*,
             (SELECT COUNT(*) FROM experiment_assignments a WHERE a.experiment_id = e.id) AS assigned_count
      FROM experiments e
      WHERE e.key = ?
    `,
    args: [key],
  });
  const row = result.rows[0];
  return row ? mapExperiment(row) : null;
}

export async function createExperiment(input: {
  key: string;
  name: string;
  description?: string;
  variants: ExperimentVariant[];
  metrics: string[];
}): Promise<Experiment> {
  const keyErr = !/^[a-z][a-z0-9_]{0,63}$/.test(input.key)
    ? "Invalid experiment key"
    : null;
  if (keyErr) throw new Error(keyErr);
  const vErr = validateVariants(input.variants);
  if (vErr) throw new Error(vErr);
  const mErr = validateMetrics(input.metrics);
  if (mErr) throw new Error(mErr);

  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO experiments (
            id, key, name, description, status, variants_json, metrics_json
          ) VALUES (?, ?, ?, ?, 'draft', ?, ?)`,
    args: [
      id,
      input.key,
      input.name.trim(),
      (input.description || "").trim(),
      JSON.stringify(input.variants),
      JSON.stringify(input.metrics),
    ],
  });
  const created = await getExperimentById(id);
  if (!created) throw new Error("Failed to create experiment");
  return created;
}

export async function updateExperiment(
  id: string,
  patch: {
    name?: string;
    description?: string;
    variants?: ExperimentVariant[];
    metrics?: string[];
  },
): Promise<Experiment> {
  const existing = await getExperimentById(id);
  if (!existing) throw new Error("Experiment not found");
  if (existing.status !== "draft" && (patch.variants || patch.metrics)) {
    throw new Error("Variants and metrics can only be edited in draft");
  }

  const name = patch.name?.trim() ?? existing.name;
  const description =
    patch.description !== undefined
      ? patch.description.trim()
      : existing.description;
  const variants = patch.variants ?? existing.variants;
  const metrics = patch.metrics ?? existing.metrics;

  if (patch.variants) {
    const vErr = validateVariants(variants);
    if (vErr) throw new Error(vErr);
  }
  if (patch.metrics) {
    const mErr = validateMetrics(metrics);
    if (mErr) throw new Error(mErr);
  }

  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE experiments
          SET name = ?, description = ?, variants_json = ?, metrics_json = ?,
              updated_at = datetime('now')
          WHERE id = ?`,
    args: [name, description, JSON.stringify(variants), JSON.stringify(metrics), id],
  });
  const updated = await getExperimentById(id);
  if (!updated) throw new Error("Experiment not found");
  return updated;
}

export async function setExperimentStatus(
  id: string,
  status: ExperimentStatus,
): Promise<Experiment> {
  if (!STATUSES.has(status)) throw new Error("Invalid status");
  const existing = await getExperimentById(id);
  if (!existing) throw new Error("Experiment not found");

  const client = await ensureInitialized();
  if (status === "running") {
    await client.execute({
      sql: `UPDATE experiments
            SET status = 'running',
                launched_at = CASE WHEN launched_at = '' THEN datetime('now') ELSE launched_at END,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [id],
    });
  } else {
    await client.execute({
      sql: `UPDATE experiments SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [status, id],
    });
  }
  const updated = await getExperimentById(id);
  if (!updated) throw new Error("Experiment not found");
  return updated;
}

/** Delete all assignments and bump reset_generation so next resolve re-buckets. */
export async function resetExperimentAssignments(id: string): Promise<Experiment> {
  const existing = await getExperimentById(id);
  if (!existing) throw new Error("Experiment not found");

  const client = await ensureInitialized();
  await client.execute({
    sql: "DELETE FROM experiment_assignments WHERE experiment_id = ?",
    args: [id],
  });
  await client.execute({
    sql: `UPDATE experiments
          SET reset_generation = reset_generation + 1,
              reset_at = datetime('now'),
              updated_at = datetime('now')
          WHERE id = ?`,
    args: [id],
  });
  const updated = await getExperimentById(id);
  if (!updated) throw new Error("Experiment not found");
  return updated;
}

export async function getAssignment(
  experimentId: string,
  userId: string,
): Promise<ExperimentAssignment | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT experiment_id, user_id, variant, assigned_at
          FROM experiment_assignments
          WHERE experiment_id = ? AND user_id = ?`,
    args: [experimentId, userId],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    experimentId: str(row.experiment_id),
    userId: str(row.user_id),
    variant: str(row.variant),
    assignedAt: str(row.assigned_at),
  };
}

/**
 * Resolve variant for a user.
 * - draft / archived → control, no assignment
 * - paused → sticky if present, else control (no new assignment)
 * - running → sticky assignment; create + exposure on first touch
 */
export async function resolveExperimentVariant(
  userId: string,
  experimentKey: string,
): Promise<{
  key: string;
  status: ExperimentStatus;
  variant: string;
  metrics: string[];
  assigned: boolean;
}> {
  const experiment = await getExperimentByKey(experimentKey);
  if (!experiment) {
    return {
      key: experimentKey,
      status: "draft",
      variant: "control",
      metrics: [],
      assigned: false,
    };
  }

  const control = controlVariantKey(experiment.variants);

  if (experiment.status === "draft" || experiment.status === "archived") {
    return {
      key: experiment.key,
      status: experiment.status,
      variant: control,
      metrics: experiment.metrics,
      assigned: false,
    };
  }

  // paused or running: honor sticky assignment if present
  const existing = await getAssignment(experiment.id, userId);
  if (existing) {
    return {
      key: experiment.key,
      status: experiment.status,
      variant: existing.variant,
      metrics: experiment.metrics,
      assigned: true,
    };
  }

  // paused + no row → control, do not assign
  if (experiment.status !== "running") {
    return {
      key: experiment.key,
      status: experiment.status,
      variant: control,
      metrics: experiment.metrics,
      assigned: false,
    };
  }

  const bucket = hashToBucket(
    assignmentSeed(userId, experiment.key, experiment.resetGeneration),
  );
  const variant = pickVariant(experiment.variants, bucket);

  const client = await ensureInitialized();
  try {
    await client.execute({
      sql: `INSERT INTO experiment_assignments (experiment_id, user_id, variant)
            VALUES (?, ?, ?)`,
      args: [experiment.id, userId, variant],
    });
  } catch {
    // Race: another request assigned first — re-read
    const raced = await getAssignment(experiment.id, userId);
    if (raced) {
      return {
        key: experiment.key,
        status: experiment.status,
        variant: raced.variant,
        metrics: experiment.metrics,
        assigned: true,
      };
    }
    throw new Error("Failed to assign experiment variant");
  }

  trackEvent(userId, "experiment_exposure", {
    experiment: experiment.key,
    variant,
  }).catch(() => {});

  return {
    key: experiment.key,
    status: experiment.status,
    variant,
    metrics: experiment.metrics,
    assigned: true,
  };
}

/** Alias used by server callers / skill docs. */
export const getExperimentVariant = resolveExperimentVariant;

export async function getExperimentStats(id: string): Promise<ExperimentStats | null> {
  const experiment = await getExperimentById(id);
  if (!experiment) return null;

  const client = await ensureInitialized();
  const metrics = experiment.metrics;

  const assignedByVariant = await client.execute({
    sql: `SELECT variant, COUNT(*) AS cnt
          FROM experiment_assignments
          WHERE experiment_id = ?
          GROUP BY variant`,
    args: [id],
  });
  const assignedMap = new Map<string, number>();
  for (const row of assignedByVariant.rows) {
    assignedMap.set(str(row.variant), Number(row.cnt) || 0);
  }

  const exposedByVariant = await client.execute({
    sql: `SELECT a.variant AS variant, COUNT(DISTINCT ae.user_id) AS cnt
          FROM experiment_assignments a
          JOIN analytics_events ae
            ON ae.user_id = a.user_id
           AND ae.event = 'experiment_exposure'
           AND ae.created_at >= a.assigned_at
           AND json_extract(ae.metadata, '$.experiment') = ?
          WHERE a.experiment_id = ?
          GROUP BY a.variant`,
    args: [experiment.key, id],
  });
  const exposedMap = new Map<string, number>();
  for (const row of exposedByVariant.rows) {
    exposedMap.set(str(row.variant), Number(row.cnt) || 0);
  }

  const metricMaps = new Map<
    string,
    Map<string, { users: number; last24h: number }>
  >();

  for (const metric of metrics) {
    const result = await client.execute({
      sql: `SELECT a.variant AS variant,
                   COUNT(DISTINCT ae.user_id) AS users,
                   COUNT(DISTINCT CASE
                     WHEN ae.created_at >= datetime('now', '-1 day') THEN ae.user_id
                   END) AS last24h
            FROM experiment_assignments a
            JOIN analytics_events ae
              ON ae.user_id = a.user_id
             AND ae.event = ?
             AND ae.created_at >= a.assigned_at
            WHERE a.experiment_id = ?
            GROUP BY a.variant`,
      args: [metric, id],
    });
    const map = new Map<string, { users: number; last24h: number }>();
    for (const row of result.rows) {
      map.set(str(row.variant), {
        users: Number(row.users) || 0,
        last24h: Number(row.last24h) || 0,
      });
    }
    metricMaps.set(metric, map);
  }

  const variantKeys = [
    ...new Set([
      ...experiment.variants.map((v) => v.key),
      ...assignedMap.keys(),
    ]),
  ];

  const variants: ExperimentVariantStats[] = variantKeys.map((variant) => {
    const assigned = assignedMap.get(variant) || 0;
    const metricsOut: ExperimentVariantStats["metrics"] = {};
    for (const metric of metrics) {
      const cell = metricMaps.get(metric)?.get(variant) || {
        users: 0,
        last24h: 0,
      };
      metricsOut[metric] = {
        users: cell.users,
        last24h: cell.last24h,
        rate: assigned > 0 ? cell.users / assigned : 0,
      };
    }
    return {
      variant,
      assigned,
      exposed: exposedMap.get(variant) || 0,
      metrics: metricsOut,
    };
  });

  return {
    experimentId: experiment.id,
    key: experiment.key,
    status: experiment.status,
    variants,
    metrics,
  };
}
