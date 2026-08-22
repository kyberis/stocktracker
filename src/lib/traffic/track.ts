import { getRedisClient } from "@/lib/upstash";

export type TrafficEdgeType = "source_api" | "api_provider";

const TRAFFIC_COUNT_PREFIX = "traffic:count";
const TRAFFIC_INDEX_PREFIX = "traffic:index";
const EDGE_MEMBER_SEP = "\x1f";
const TTL_SECONDS = 48 * 60 * 60;

export interface TrafficEdge {
  source: string;
  target: string;
  count: number;
}

export interface TrafficGraphData {
  hours: number;
  edgeType: TrafficEdgeType;
  edges: TrafficEdge[];
  totalRequests: number;
  redisAvailable: boolean;
}

export function getHourBucket(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}`;
}

function listHourBuckets(hours: number): string[] {
  const buckets: string[] = [];
  const now = Date.now();
  for (let i = 0; i < hours; i++) {
    buckets.push(getHourBucket(new Date(now - i * 60 * 60 * 1000)));
  }
  return buckets;
}

function countKey(hour: string, edgeType: TrafficEdgeType, source: string, target: string): string {
  return `${TRAFFIC_COUNT_PREFIX}:${hour}:${edgeType}:${source}:${target}`;
}

function indexKey(hour: string, edgeType: TrafficEdgeType): string {
  return `${TRAFFIC_INDEX_PREFIX}:${hour}:${edgeType}`;
}

function edgeMember(source: string, target: string): string {
  return `${source}${EDGE_MEMBER_SEP}${target}`;
}

function parseEdgeMember(member: string): { source: string; target: string } | null {
  const idx = member.indexOf(EDGE_MEMBER_SEP);
  if (idx <= 0) return null;
  return {
    source: member.slice(0, idx),
    target: member.slice(idx + 1),
  };
}

/** Fire-and-forget counter increment in Redis. */
export function trackTrafficEdge(
  edgeType: TrafficEdgeType,
  source: string,
  target: string,
): void {
  const redis = getRedisClient();
  if (!redis) return;

  const hour = getHourBucket();
  const key = countKey(hour, edgeType, source, target);
  const idx = indexKey(hour, edgeType);
  const member = edgeMember(source, target);

  void (async () => {
    try {
      const pipe = redis.pipeline();
      pipe.incr(key);
      pipe.expire(key, TTL_SECONDS);
      pipe.sadd(idx, member);
      pipe.expire(idx, TTL_SECONDS);
      await pipe.exec();
    } catch {
      // Never block request handling for traffic metrics.
    }
  })();
}

export async function getTrafficGraph(
  hours: number,
  edgeType: TrafficEdgeType = "source_api",
  limit = 50,
): Promise<TrafficGraphData> {
  const redis = getRedisClient();
  if (!redis) {
    return {
      hours,
      edgeType,
      edges: [],
      totalRequests: 0,
      redisAvailable: false,
    };
  }

  const buckets = listHourBuckets(hours);
  const aggregated = new Map<string, TrafficEdge>();

  for (const hour of buckets) {
    const members = await redis.smembers<string[]>(indexKey(hour, edgeType));
    if (!members?.length) continue;

    const valid = members
      .map((member) => {
        const parsed = parseEdgeMember(member);
        if (!parsed) return null;
        return {
          key: countKey(hour, edgeType, parsed.source, parsed.target),
          source: parsed.source,
          target: parsed.target,
        };
      })
      .filter((k): k is NonNullable<typeof k> => k !== null);

    if (valid.length === 0) continue;

    const counts = await redis.mget<(number | null)[]>(...valid.map((v) => v.key));

    valid.forEach((entry, i) => {
      const count = Number(counts[i] ?? 0);
      if (!Number.isFinite(count) || count <= 0) return;
      const mapKey = `${entry.source}${EDGE_MEMBER_SEP}${entry.target}`;
      const existing = aggregated.get(mapKey);
      if (existing) {
        existing.count += count;
      } else {
        aggregated.set(mapKey, {
          source: entry.source,
          target: entry.target,
          count,
        });
      }
    });
  }

  const edges = [...aggregated.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  const totalRequests = edges.reduce((sum, e) => sum + e.count, 0);

  return {
    hours,
    edgeType,
    edges,
    totalRequests,
    redisAvailable: true,
  };
}

export interface FullTrafficGraphData {
  hours: number;
  redisAvailable: boolean;
  sourceApi: TrafficGraphData;
  apiProvider: TrafficGraphData;
  totalRequests: number;
  totalProviderCalls: number;
}

export async function getFullTrafficGraph(
  hours: number,
  limit = 50,
): Promise<FullTrafficGraphData> {
  const [sourceApi, apiProvider] = await Promise.all([
    getTrafficGraph(hours, "source_api", limit),
    getTrafficGraph(hours, "api_provider", limit),
  ]);

  return {
    hours,
    redisAvailable: sourceApi.redisAvailable && apiProvider.redisAvailable,
    sourceApi,
    apiProvider,
    totalRequests: sourceApi.totalRequests,
    totalProviderCalls: apiProvider.totalRequests,
  };
}
