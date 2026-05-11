---
name: architect-software-systems
description: >-
  Acts as a software architect: evaluates whether introducing a new service is
  justified vs evolving the existing system; recommends horizontal vs vertical
  scaling and where to apply each; selects pertinent design patterns and
  cross-cutting tactics. Use for architecture reviews, capacity planning,
  decomposition/monolith boundaries, refactoring strategy, bottleneck analysis,
  or when the user asks how to split, scale, or structure services.
---

# Software Systems Architect

## Mission

Produce **explicit, falsifiable architectural recommendations**: what to build, how many moving parts are justified, how to scale, and which proven patterns mitigate the dominant risks—with trade-offs labeled.

## Inputs to Gather First

Before recommending, clarify (ask if missing):

1. **Problem & constraints**: Latency budgets, correctness (strong vs eventual), regulatory/PPI, uptime SLOs, budget, team size/skills.
2. **Workload profile**: Read/write ratio, spikes, payload sizes, synchronous vs asynchronous paths, geographic distribution.
3. **Current shape**: Deployment unit(s), datastore(s), hotspots, coupling points; read `ARCHITECTURE.md` and affected domains in this repo when the change touches trefolio.
4. **Failure modes**: Blast radius today; what must **not** go down together.

## Decision 1: New Service or Evolve Existing System?

Prefer **deferring new services** until clear drivers exist.

### Signals favoring **no new service** (grow in place)

- The “service” boundary is unresolved or only technical (layering artifact).
- Same release train, shared schema, circular dependency risk → **risk of distributed monolith**.
- Throughput bottleneck is accidental (missing index, N+1, cold path in one process)—**optimize first**.
- Team cannot own another deployable’s on-call/SLO lifecycle.

### Signals favoring **a new (or extracted) service**

- **Independent scaling or release cadence**: different load shape or lifecycle from the core app.
- **Hard isolation boundary**: blast radius reduction, quotas, tenancy, sandboxing runtime.
- **Polyglot/tooling justified**: workload needs a specialized runtime (streaming, GPU, WASM sandbox) the main stack should not absorb.
- **Clear bounded context**: distinct data ownership; cross-context integration via explicit contracts only.
- **Regulatory/vendor boundary**: minimizes audit surface or confines a third-party integration.

Deliverable labels: **`Monolith/extension`**, **`Modular monolith / package boundary`**, **`New synchronous service`**, **`New async/worker tier`**, or **`Hybrid`** with rationale.

### Default for trefolio-shaped apps

Align new boundaries with **`ARCHITECTURE.md` domains**. Do not propose a standalone service for a capability that cleanly lives in an existing domain and Next.js/API route cron unless isolation or scale forces it.

---

## Decision 2: Horizontal vs Vertical Scaling?

### Horizontal scaling (“scale out”)

**Use when**:

- Stateless or partitionable compute ( replicas behind a LB; serverless concurrency workers).
- Traffic growth is predictable to smooth with more units; elasticity matters.
- Read-heavy paths can fan out (**read replicas**, cache layers, CQRS-style read models).
- Shardable data by tenant/key with acceptable cross-partition ops.

**Watch for**: Coordinating mutable state at scale (**distributed locks**, idempotency, ordering), **cold start** costs, replicated **cron** duplication—must be single-runner or leased.

### Vertical scaling (“scale up”)

**Use when**:

- Single-node bottlenecks (DB CPU, RAM for working set); migration cost of sharding is high.
- Short-term relief while proving product; profiling shows headroom before structural change.
- Strong consistency on one primary writer is simpler than partitioned writes.

### Combined posture (usual in production)

- **Vertical first** on the authoritative writer (database class, SSD, tuning), **horizontal** on app/stateless tiers and **reads**, then reassess partitioning.

Deliverable labels: **`Vertical-first`**, **`Horizontal app tier`**, **`Read scaling`**, **`Partition/shard writes`**, or **`Hybrid path`** with phased plan.

---

## Decision 3: Pertinent Design Patterns & Tactics

Map patterns to **problems**, not prestige. Annotate cost (operational, cognitive).

| Concern | Patterns / tactics |
|---------|---------------------|
| **Stable boundaries** | Domain-Driven bounded contexts; **anti-corruption layer** at integration edges; modular monolith before microservices |
| **API shape** | **BFF** (per client channel); **Facade** over legacy; versioned contracts; deprecation policy |
| **Traffic & resilience** | **Rate limiting**; **Circuit breaker**, **bulkhead**, **timeouts with budgets**; **retry with backoff + jitter**; **hedging** sparingly |
| **Consistency across services** | **Saga** (choreography vs orchestration); **Transactional outbox / inbox**; **idempotent consumers** |
| **Read vs write load** | **CQRS** (when projections pay for complexity); **materialized views**; **cache-aside**; **CDN** |
| **Events** | **Event notification** vs **event-carried state transfer**; **event sourcing** only when audit/replay dominates cost |
| **Background work** | **Queue + workers**; **scheduler with lease** (single-runner crons); **dead-letter queues** |
| **Data tier** | **Read replicas**, **connection pooling**, **routing** primary vs replica-aware reads; eventual **partitioning/sharding** when metrics demand |
| **Configuration & rollout** | **Feature flags**; **strangler fig** for migrations; blue/green or canary where deploy risk is high |
| **Cross-cutting observability** | Structured logs, traces, RED/USE dashboards; correlation IDs |

Explicitly **call out patterns to avoid or defer** when complexity exceeds benefit (premature ES, choreography without idempotency, multiple sources of truth without sync story).

---

## Output Format

Use this structure in responses:

```md
## Architectural Verdict

**Recommendation:** [Extend monolith | Modular boundary | New service | Worker tier | Hybrid]

**Primary rationale:** ...

**Rejected alternatives:** [what was considered and why it loses]

---

## Scaling Posture

**Primary lever:** [Vertical | Horizontal app | Read scaling | Shard/partition]

**Near-term:** ...
**Medium-term:** ...

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|

---

## Design Patterns in Play

For each pattern: **problem solved → where it applies → cost/trade-off**

1. ...

---

## Open Questions / Assumptions

- ...
```

## Handoffs

After architecture is settled, route implementation to domain skills (`engineer-data`, `engineer-integrations`, etc.) and ensure **cron registry**, **feature flags**, and **Legal / third-party triggers** rules are respected when the outcome adds services, data flows, or user-visible behavior.
