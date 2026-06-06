# GATRA AI — Data Flow & State Management

> Status: Design v0.1
> Companion to: `ARCHITECTURE-OVERVIEW.md`

---

## 1. The Two Flow Modes

GATRA AI has exactly two operational flows. Every request you can issue belongs to one of them.

| Flow | Trigger | Lifetime | Persisted? |
|------|---------|----------|------------|
| **Conversational turn** | Operator chat / API call | seconds–minutes | session + audit only |
| **Goal-driven run** | Goal deployment | minutes–weeks | full audit + checkpoints + memory |

Confusing the two is the most common design error. Goals are first-class durable objects with their own state machine. Conversations are stateless apart from their session.

---

## 2. End-to-End Flow Diagram

```
   ┌──────────────┐
   │  Operator    │
   └──────┬───────┘
          │  (1) POST /api/v1/goals  { goal: "...", budget: {...} }
          ▼
   ┌──────────────────────┐
   │  Dashboard SSR       │  -- adds operator identity, RBAC check
   └──────┬───────────────┘
          │  (2) WS rpc("goal.create", payload, audit_ctx)
          ▼
   ┌──────────────────────┐
   │  Gateway RPC bus     │  -- AuthN/AuthZ, schema validation
   └──────┬───────────────┘
          │  (3) policy.gate(goal) ──── reject ──▶ audit + 403
          ▼  pass
   ┌──────────────────────┐
   │  Goal Executor       │  -- creates `goals` row, status=planning
   └──────┬───────────────┘
          │  (4) planner.plan(goal) ─── calls LLM
          ▼
   ┌──────────────────────┐
   │  Step Queue          │  -- writes `steps` rows, status=pending
   └──────┬───────────────┘
          │  (5) supervisor.schedule(run_id)
          ▼
   ┌──────────────────────┐
   │  LLAR Supervisor     │  -- claims run, emits heartbeat
   └──────┬───────────────┘
          │  (6) loop: pop step → execute → checkpoint
          ▼
   ┌──────────────────────┐
   │  Step Executor       │
   │  ┌──────────────┐    │  (6a) tool.invoke(step) → result
   │  │ Tool sandbox │    │  (6b) memory.write(observation)
   │  └──────────────┘    │  (6c) checkpoint.save(state_hash, blob)
   │  ┌──────────────┐    │  (6d) critic.evaluate(step, result)
   │  │ Critic       │    │  (6e) planner.replan(...) if needed
   │  └──────────────┘    │
   └──────┬───────────────┘
          │  (7) audit_event → audit sink → MinIO
          │  (8) WS event "goal.step.completed" → dashboard
          ▼
   ┌──────────────────────┐
   │  Goal complete       │  -- status=succeeded|failed|paused
   └──────────────────────┘
```

---

## 3. Data Stores — Which Store Owns What?

GATRA AI uses **four** stores. Each piece of data lives in exactly one of them. No data lives in two stores by design.

| Store | What it holds | Why this store |
|-------|---------------|----------------|
| **State DB** (SQLite single-host / Postgres HA) | Goals, steps, checkpoints (metadata), sessions, agent runs, cron jobs, audit metadata, RBAC bindings | Transactional, queryable, small rows |
| **Vector Store** (sqlite-vss or pgvector) | Semantic memory embeddings, skill embeddings, document chunks for RAG | Fast cosine search at write-once scale |
| **Object Store** (MinIO, S3-compatible) | Checkpoint blobs, LLM call recordings, screenshots, large tool outputs, audit log segments | Large opaque blobs, immutable, optional WORM |
| **In-process cache** (LRU) | Active sessions, active goal handles, planner working context | Hot path; tolerates loss on restart |

### Rationale: no Redis
A single-host Gateway with SQLite plus an in-process LRU covers what an external cache would solve for. Adding Redis adds an operational dependency BUMN SREs do not want. For HA, Postgres + advisory locks plays the role Redis would otherwise play.

---

## 4. State Machines

### 4.1. Goal State Machine

```
                                  ┌─────────────┐
   create ───────────────────────▶│   pending   │
                                  └──────┬──────┘
                                         │ planner accepts
                                         ▼
                                  ┌─────────────┐
                                  │  planning   │── planner fails ──▶ failed
                                  └──────┬──────┘
                                         │ plan ready
                                         ▼
                                  ┌─────────────┐  pause()   ┌──────────┐
                                  │  executing  │───────────▶│  paused  │
                                  └──┬──────┬───┘            └────┬─────┘
                       all steps ok  │      │ step.failed         │ resume()
                                     ▼      └──▶ replan loop      ▼
                              ┌─────────────┐                  back to executing
                              │  succeeded  │
                              └─────────────┘
                                         ▲
                                         │ failed permanently
                                  ┌─────────────┐
                                  │   failed    │
                                  └─────────────┘
```

Transitions are SQL-enforced via `CHECK` constraints. Status changes write to `goal_transitions` with reason + actor — that table is the audit truth for goal lifecycle.

### 4.2. Step State Machine

```
   pending ──▶ running ──▶ completed
                  │
                  ├──▶ failed ──▶ retry (count++) ──▶ running
                  │                       │
                  │                       └─ max retries ─▶ blocked
                  └──▶ timeout ──▶ retry
```

### 4.3. Agent Run State Machine (LLAR-managed)

```
   ready ──▶ leased ──▶ active ──▶ idle (no work) ──▶ active
                  │           │
                  │           ├─ stop signal ─▶ draining ─▶ stopped
                  │           └─ crash       ─▶ orphaned ─▶ resumed (by another supervisor)
                  └─ lease expired ─▶ ready (another supervisor may claim)
```

---

## 5. The Critical Path: One Step in Detail

A single goal step is the atomic unit of progress. Walking through it shows where every piece of state ends up.

```
        ┌──────────────────────────────────────────────────────────────────┐
        │  STEP EXECUTION (one iteration of the executor loop)             │
        └──────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐    1. SELECT FOR UPDATE
  │  step row       │◀───── claim with row lock, transition pending→running
  └────────┬────────┘
           │ 2. load context
           ▼
  ┌─────────────────────────────────────────────────┐
  │ memory.workingContextFor(goal_id, step_id)      │
  │   - tail of episodic memory (last N events)     │
  │   - top-K semantic recall (vector search)       │
  │   - relevant durable facts (key-value)          │
  └────────┬────────────────────────────────────────┘
           │ 3. policy gate
           ▼
  ┌─────────────────────────────────────────────────┐
  │ policy.check(step, role, scopes, budget)        │
  │   - within token budget?                        │
  │   - tool in allowed scope?                      │
  │   - target domain allowlisted?                  │
  └────────┬────────────────────────────────────────┘
           │ 4. tool invoke
           ▼
  ┌─────────────────────────────────────────────────┐
  │ tools.invoke(step.tool, step.args, sandboxCtx)  │
  │   - runs in Docker sandbox (non-main session)   │
  │   - stdout/stderr streamed to ws events         │
  └────────┬────────────────────────────────────────┘
           │ 5. record observation
           ▼
  ┌─────────────────────────────────────────────────┐
  │ memory.write(episodic, observation)             │
  │ memory.write(semantic, observation.embedding)   │  (async)
  └────────┬────────────────────────────────────────┘
           │ 6. checkpoint
           ▼
  ┌─────────────────────────────────────────────────┐
  │ checkpoint.save(run_id, step_id, state_hash)    │
  │   - row in `e_checkpoint` (metadata)            │
  │   - blob in MinIO `checkpoints/<run>/<step>`   │
  │   - parent_state_hash links chain               │
  └────────┬────────────────────────────────────────┘
           │ 7. critic
           ▼
  ┌─────────────────────────────────────────────────┐
  │ critic.evaluate(step, result, goal)             │
  │   - returns: { verdict, confidence, replan? }   │
  │   - verdict: "ok" | "retry" | "replan" | "stop" │
  └────────┬────────────────────────────────────────┘
           │ 8. transition step + maybe replan
           ▼
  ┌─────────────────────────────────────────────────┐
  │ UPDATE step status; emit ws event                │
  │ audit.append(event)                              │
  └─────────────────────────────────────────────────┘
```

Every numbered transition is a single SQL row update or a single object PUT. There are no fan-out writes that can leave inconsistent state — the checkpoint blob is written before the step row transitions to `completed`, and the step row transition is the durable commit point.

---

## 6. Working Memory vs. Episodic vs. Semantic

| Memory kind | Storage | Lifetime | Retrieval |
|-------------|---------|----------|-----------|
| **Working** | In-process map keyed by `run_id` | Per-step, rebuilt each loop | Direct lookup |
| **Episodic** | `e_memory_event` table; one row per observation | Goal lifetime | Tail-window scan + LLM-summarised compaction |
| **Semantic** | Vector store; one row per chunk | Goal lifetime, optionally promoted to global memory | Top-K cosine over embedding |
| **Durable facts** | `e_memory_fact` key-value table | Cross-goal, global | Key lookup or pattern scan |

The planner sees a curated bundle: working memory + last-N episodic + top-K semantic + relevant facts. The bundle is built by `memory.workingContextFor(...)` and is the *only* call site that touches all four — keeps retrieval logic in one place.

Compaction: once episodic memory for a goal exceeds a configurable byte threshold, a summariser collapses the oldest decile into a single summary event. Compaction is itself a step and is checkpointed.

---

## 7. Checkpoints — What They Capture

A checkpoint is the **smallest unit of state from which a goal can be resumed**. It captures:

1. `goal_id`, `run_id`, `step_id` of the step just completed.
2. `state_hash` — sha256 of the canonical state JSON (used for dedupe + chain).
3. `parent_state_hash` — the previous checkpoint's hash; together these form a chain.
4. Pointer to the **state blob** in MinIO containing:
   - working memory snapshot
   - cursor positions for in-progress tool sessions (e.g., browser context cookies, open shell PIDs)
   - the planner's current strategy doc
   - last critic verdict

What a checkpoint deliberately does **not** capture:
- the full episodic memory (already in DB; re-read on resume)
- the full semantic store (re-queried on resume)
- transient tool sub-state (e.g., a half-written file) — tools must declare resumable state via the `Tool.snapshot()` hook or accept that resume reruns the tool

Resume protocol:
```
resume(goal_id):
  c = latest_checkpoint(goal_id)
  state = blob_store.get(c.blob_ref)
  verify state_hash matches
  rebuild working memory from state
  re-open tool sessions from state.toolCursors (best-effort)
  set step pointer to the step AFTER c.step_id
  start executor loop
```

If a checkpoint blob is missing or its hash doesn't verify, resume falls back to the previous checkpoint in the chain. If the chain is broken at the start, the goal is marked `failed` with `reason=checkpoint_chain_broken`.

---

## 8. The Audit Pipeline

```
   any state-changing call ──▶ audit.append(event)
                                       │
                                       ▼
                              ┌────────────────────┐
                              │  e_audit table     │
                              │  - id (ulid)       │
                              │  - prev_hash       │
                              │  - hash            │
                              │  - actor, action   │
                              │  - target, before, │
                              │    after (jsonb)   │
                              └────────┬───────────┘
                                       │ every 5s
                                       ▼
                              ┌────────────────────┐
                              │  audit sidecar     │
                              │  - reads new rows  │
                              │  - groups into     │
                              │    segments (1MB)  │
                              │  - PUTs to MinIO   │
                              │    audit/yyyy/mm/  │
                              └────────┬───────────┘
                                       ▼
                              optional WORM bucket
                              (regulator retention)
```

Verification command (`gatra audit verify`) rehydrates the chain from MinIO, checks each `prev_hash` matches, and fails on any gap. The DB is the **hot copy** for last 90 days; MinIO is the cold authoritative copy.

---

## 9. Backpressure & Concurrency

- **Per-run concurrency**: an agent run executes one step at a time. Parallelism is across runs, not within a run, by design — keeps the state machine and the critic loop sane.
- **Across runs**: supervisor maintains a pool size = `min(cfg.maxConcurrentRuns, cpu_cores * 2)`. Newly leased runs queue if the pool is full.
- **LLM call rate-limit**: token bucket per provider, with per-goal sub-limits enforced by the policy gate. When throttled, the executor *pauses the step* (no busy wait) and re-enqueues at the next bucket refill.
- **DB writes**: single writer pattern for SQLite mode; pg connection pool of 20 for HA mode. Step writes go through a per-run mutex so checkpoint and step status flip atomically.

---

## 10. Failure Modes & Recovery

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Gateway crash mid-step | Supervisor heartbeat stops; lease expires | Another supervisor (HA) or restarted same one resumes from latest checkpoint |
| Tool call hangs | Per-tool timeout (default 60s, configurable) | Step → `timeout` → retry policy |
| LLM provider down | Provider client probes; circuit breaker opens | Step pauses; supervisor sets goal `paused (reason=provider_down)`; dashboard surfaces it |
| Checkpoint blob missing | Hash verify fails on resume | Fall back to prior checkpoint in chain; mark blob as needing re-upload |
| Audit MinIO unreachable | Audit sidecar buffer fills | Block writes after buffer cap → return 503 to operators; do **not** silently drop |
| Policy denies mid-run | Gate returns deny | Step → `blocked`; goal stays paused; manual operator decision required |

The principle: when GATRA cannot guarantee an action is auditable or recoverable, it stops and waits for an operator — it never silently degrades.

---

## 11. Data Retention Defaults

| Data | Default retention | Configurable |
|------|-------------------|--------------|
| Goal records | 365 days | yes |
| Step records | 90 days (then summarised) | yes |
| Checkpoint blobs | 90 days for paused/succeeded, 30 for failed | yes |
| Episodic memory rows | per-goal lifetime + 90 days | yes |
| Audit events (hot/SQLite) | 90 days | minimum 30 |
| Audit segments (cold/MinIO) | 7 years (OJK default) | yes, minimum is config'd by compliance role |
| Tool output blobs | 30 days | yes |
| LLM call recordings | off by default; on with 30-day retention if enabled | yes |

All retention runs as a scheduled cron job inside the Gateway (uses the OpenClaw-native cron). Deletes are soft for 7 days before purge to allow rollback.
