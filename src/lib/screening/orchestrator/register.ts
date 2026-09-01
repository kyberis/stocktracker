/**
 * Ergonomic single-import registration point for the screening worker.
 * Every handler module registers itself here — importing this file guarantees
 * the dispatch map is populated before the worker leases a step.
 *
 * Keep this module import-only side-effects. Any `runXStep` symbol added here
 * is available through `getHandler(agent_kind)`.
 */

import "@/lib/screening/agents/hard-data";
import "@/lib/screening/agents/ir-business";
import "@/lib/screening/agents/aggregate-ir";
import "@/lib/screening/agents/web-sentiment";
import "@/lib/screening/agents/aggregate-web";
import "@/lib/screening/agents/technicals";
import "@/lib/screening/agents/aggregate-technicals";
import "@/lib/screening/agents/portfolio-context";
import "@/lib/screening/agents/risk";
import "@/lib/screening/agents/compiler";
import "@/lib/screening/agents/shortlist-research";
import "@/lib/screening/agents/compiler-evaluate";
import "@/lib/screening/agents/qa";
import "@/lib/screening/thesis/hard-data";
import "@/lib/screening/thesis/research";
/** Legacy kinds still registered so in-flight / old runs can finish. */
import "@/lib/screening/thesis/ir";
import "@/lib/screening/thesis/web";
import "@/lib/screening/thesis/technicals";
import "@/lib/screening/thesis/aggregates";
import "@/lib/screening/thesis/portfolio";
import "@/lib/screening/thesis/risk";
import "@/lib/screening/thesis/compiler";
import "@/lib/screening/thesis/evaluate";
import "@/lib/screening/thesis/qa";
