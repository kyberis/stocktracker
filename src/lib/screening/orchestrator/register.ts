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
import "@/lib/screening/agents/compiler";
