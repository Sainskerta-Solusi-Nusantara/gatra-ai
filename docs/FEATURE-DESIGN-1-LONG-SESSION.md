# Feature Design #1 — Long-Lived Agent Runtime (LLAR)

> Status: Design v0.1
> Owner: enterprise/llar/
> Depends on: OpenClaw Gateway runtime, State DB, Audit sink.

---

## 1. Problem & Motivation

OpenClaw already runs a long-lived Gateway *process*. What it does **not** ship is a long-lived **agent session**: an autonomous loop that survives Gateway restarts, claims work, executes for hours or days, and resumes from where it stopped.

Today, an OpenClaw agent turn is request-scoped — the operator sends a message, the agent responds, the turn ends. Cron jobs schedule discrete agent turns. There is no first-class concept of "this agent has been alive and working continuously for two weeks."

GATRA AI customers (BUMN, konglomerasi) want exactly that: deploy an agent that continuously monitors a regulatory feed, ingests new circulars, drafts compliance memos, and ships them. The agent must not die when:
- the Gateway restarts after a patch,
- the host VM reboots,
- a tool call crashes,
- the operator closes their browser tab.

**The Long-Lived Agent Runtime (LLAR) is the supervisor that keeps these agents alive and durable.**

---

## 2. Goals & Non-Goals

### Goals
1. An agent run persists across Gateway restarts with no operator action.
2. Runs auto-resume from the latest checkpoint after crashes.
3. Multiple runs execute concurrently with bounded resource use.
4. HA deployments can run two Gateways; exactly one supervises each run at any moment.
5. Operators can pause / resume / stop a run via the dashboard.
6. The runtime is observable: heartbeat, lag, last-step age all visible.

### Non-Goals
- The runtime does not decide *what* an agent does — that is the Goal Executor (Feature #2).
- The runtime does not store memory contents — that is the Memory Layer (Feature #3).
- The runtime does not provide multi-tenant isolation beyond OpenClaw's sandbox model.

---

## 3. Conceptual Model

```
   Goal               (durable; what to achieve)
     │
     │ has many
     ▼
   AgentRun           (durable; one attempt to advance the goal)
     │
     │ supervised by exactly one
     ▼
   Lease              (short TTL; "this Gateway owns this run for now")
     │
     │ produces
     ▼
   ExecutionLoop      (in-memory; iterates step → checkpoint → step)
```

- **AgentRun**: durable. Belongs to a goal. Has a status, a current step pointer, a heartbeat timestamp, an owning lease.
- **Lease**: short-lived (default 30s). A Gateway holds a lease to indicate "I am currently running this." If the lease expires, another Gateway can claim the run.
- **ExecutionLoop**: in-memory. Iterates the step loop until the goal is done, paused, or the supervisor signals stop.

This split is what makes HA correct: state lives in the DB and is durable; ownership is a soft lease; the loop is just an event-loop ticker that can be born or killed without losing progress.

---

## 4. Data Model

```sql
CREATE TABLE e_agent_run (
  id              TEXT PRIMARY KEY,           -- ulid
  goal_id         TEXT NOT NULL REFERENCES e_goal(id),
  status          TEXT NOT NULL CHECK (status IN
                    ('ready','leased','active','idle','draining','stopped','orphaned')),
  current_step_id TEXT,                       -- nullable; null when not started
  last_checkpoint_id TEXT,
  attempt         INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE e_run_lease (
  run_id          TEXT PRIMARY KEY REFERENCES e_agent_run(id),
  holder_id       TEXT NOT NULL,              -- gateway instance id
  acquired_at     INTEGER NOT NULL,
  expires_at      INTEGER NOT NULL,           -- acquired_at + lease_ttl
  heartbeat_at    INTEGER NOT NULL
);

CREATE INDEX idx_lease_expiry ON e_run_lease (expires_at);

CREATE TABLE e_run_event (                   -- per-run journal, not the audit log
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id          TEXT NOT NULL,
  ts              INTEGER NOT NULL,
  kind            TEXT NOT NULL,             -- started|step_ok|step_err|paused|resumed|...
  meta            TEXT                       -- json
);
CREATE INDEX idx_run_event_run ON e_run_event (run_id, ts);
```

Notes:
- `ulid` is monotonic time-prefixed; useful for ordering and human-readable IDs.
- `e_run_lease` is a separate table so lease churn doesn't rewrite the big `e_agent_run` row.
- `e_run_event` is the runtime journal (operational) — distinct from `e_audit` (compliance).

---

## 5. The Supervisor

The Supervisor is a singleton inside each Gateway. It does four things on a fixed tick (default 1 second):

```
tick:
  1. heartbeatOwnedLeases()      -- extend my leases
  2. acquireAvailableRuns()      -- take work nobody owns
  3. driveActiveLoops()          -- kick the executor for each owned run
  4. relinquishStoppedRuns()     -- drop leases for done runs
```

### 5.1. Lease acquisition (SQL)

```sql
-- find runs that are ready or have an expired lease
WITH candidates AS (
  SELECT r.id FROM e_agent_run r
  LEFT JOIN e_run_lease l ON l.run_id = r.id
  WHERE r.status IN ('ready','orphaned')
     OR (l.expires_at IS NOT NULL AND l.expires_at < :now)
  ORDER BY r.updated_at
  LIMIT :slots_available
)
INSERT INTO e_run_lease (run_id, holder_id, acquired_at, expires_at, heartbeat_at)
SELECT id, :gateway_id, :now, :now + :ttl_ms, :now FROM candidates
ON CONFLICT (run_id) DO UPDATE SET
  holder_id    = excluded.holder_id,
  acquired_at  = excluded.acquired_at,
  expires_at   = excluded.expires_at,
  heartbeat_at = excluded.heartbeat_at
WHERE e_run_lease.expires_at < :now  -- ONLY steal if truly expired
RETURNING run_id;
```

The `WHERE e_run_lease.expires_at < :now` clause is the entire HA correctness story: two supervisors can race this query; only the one whose `:now` is after the lease's `expires_at` will steal it. Postgres `SELECT FOR UPDATE SKIP LOCKED` plays the same role for non-SQLite mode.

### 5.2. Heartbeat

```
heartbeatOwnedLeases:
  for each run_id in mine:
    UPDATE e_run_lease
       SET expires_at = :now + :ttl_ms,
           heartbeat_at = :now
     WHERE run_id = :run_id AND holder_id = :gateway_id
```

If the update affects 0 rows, the lease was stolen — the supervisor immediately stops the local loop for that run and emits a `lease_lost` event.

### 5.3. Tick budget

A single tick is bounded: total wall-clock for a tick is capped at 500ms. If the SQL or the executor coordination takes longer, the supervisor logs `tick_overrun` and emits a metric. This is the canary for "your DB is too slow" or "your event loop is blocked."

---

## 6. The Execution Loop

For each owned run, the supervisor keeps an in-memory `ExecutionLoop` running. Pseudocode:

```ts
async function runExecutionLoop(runId: string, signal: AbortSignal) {
  while (!signal.aborted) {
    const run = await db.getAgentRun(runId);
    if (run.status === 'draining' || run.status === 'stopped') break;

    const step = await executor.nextStep(run);   // Feature #2 produces this
    if (!step) {
      await sleep(idleSleepMs);                  // no work; brief nap
      await db.setRunStatus(runId, 'idle');
      continue;
    }

    await db.setRunStatus(runId, 'active');
    try {
      const result = await executor.executeStep(run, step);
      await memory.recordObservation(run, step, result);
      await checkpoint.save(run, step, result);
      events.emit('step_ok', { runId, stepId: step.id });
    } catch (err) {
      events.emit('step_err', { runId, stepId: step.id, err });
      await backoff.onError(run, step, err);     // may pause the run
    }
  }
  events.emit('loop_exit', { runId });
}
```

Key invariants:
- The loop is **single-stepping**: never two steps in flight for the same run.
- The loop checks `signal.aborted` between every step — stop signal honoured promptly.
- The loop checks `run.status` before each step — operator pauses propagate within one step.
- The loop never throws; every error path goes through `backoff.onError`, which decides retry / pause / fail.

---

## 7. Backoff & Failure Policy

Per-step failures advance an attempt counter. The policy is configurable per goal and defaults to:

| Failure class | First retry | Then | Cap |
|---------------|-------------|------|-----|
| Transient (network 5xx, sandbox crash) | 5s + jitter | exponential ×2 | 5 retries → step `failed`, goal `paused` |
| Tool unauthorized | none | — | step `blocked`, goal `paused` |
| LLM token budget exceeded | none | — | goal `paused (reason=budget)` |
| Critic verdict=stop | none | — | goal `paused (reason=critic)` |
| Hard crash (uncaught) | 30s | linear ×3 | 3 retries → goal `failed` |

Backoff timers live in the supervisor's in-memory map keyed by `runId`. If the supervisor dies, the backoff is reconstructed from the last step row's `attempt` count when a new supervisor claims the run.

---

## 8. Pause / Resume / Stop semantics

These are operator-driven RPCs from the dashboard.

| RPC | Effect | Mid-step behaviour |
|-----|--------|--------------------|
| `run.pause` | Sets goal status to `paused`. Supervisor finishes current step, then loop exits. | Current step runs to completion or timeout |
| `run.resume` | Sets goal back to `executing`. Supervisor picks up the run on its next tick. | n/a (no step in flight) |
| `run.stop` | Sets goal status to `stopped`. Supervisor signal-aborts the loop. | Current step's tool sees abort signal; sandbox kills child processes |
| `run.kill` | Hard stop. Lease forcibly cleared. | Tool processes SIGKILLed. Goal status `failed (reason=killed)` |

`run.pause` is the safe default. `run.kill` requires the `admin` role.

---

## 9. HA Behaviour

In an HA pair:
- Both Gateways run a Supervisor.
- Postgres advisory lock or the `e_run_lease` table arbitrates ownership.
- A goal's run can migrate between supervisors when one is restarted — the migration is invisible to the operator because state is on the durable side.

Failover sequence example:
```
t=0    Gateway-A holds lease for run R, expires_at = t+30s
t=15   Gateway-A heartbeats; expires_at = t+30s+15s
t=20   Gateway-A crashes
t=45   Lease expires
t=46   Gateway-B's supervisor tick stalls candidates query, picks R
t=46   Gateway-B starts ExecutionLoop for R, resumes from latest checkpoint
```

Worst-case downtime per run is `lease_ttl + tick_interval`, default 31 seconds.

---

## 10. Observability

Per-run metrics emitted on every tick:
- `gatra_run_heartbeat_age_seconds` — seconds since last heartbeat
- `gatra_run_step_age_seconds` — seconds since last successful step
- `gatra_run_attempts_total` — counter of step attempts
- `gatra_run_status{status="active|idle|paused|..."}` — gauge

Per-supervisor metrics:
- `gatra_supervisor_owned_runs` — number of runs leased
- `gatra_supervisor_tick_duration_seconds` — histogram
- `gatra_supervisor_lease_acquired_total{reason="ready|orphaned|stolen"}` — counter

Logs are structured JSON, one event per significant supervisor action. Lease moves, loop starts, loop exits, backoff transitions are all logged at `info`.

---

## 11. Configuration

```yaml
llar:
  leaseTtlMs: 30000          # how long a lease holds
  tickIntervalMs: 1000       # supervisor tick cadence
  idleSleepMs: 5000          # nap when no step is ready
  maxConcurrentRuns: 32      # global pool size per supervisor
  tickBudgetMs: 500          # tick wall-clock cap (logs overrun)
  haAdvisoryLockKey: 1029384  # postgres advisory lock id when HA mode

  backoff:
    transient: { firstMs: 5000, factor: 2, maxRetries: 5 }
    hardCrash: { firstMs: 30000, factor: 1.5, maxRetries: 3 }
```

All values are hot-reloadable via the dashboard's config panel — they re-apply on the next supervisor tick.

---

## 12. CLI Surface

```
gatra run list [--status active]
gatra run show <run_id>
gatra run pause <run_id> [--reason "..."]
gatra run resume <run_id>
gatra run stop <run_id>
gatra run kill <run_id>             # admin only
gatra run logs <run_id> [--follow]  # tail the run journal
```

The CLI talks to the Gateway via the same WebSocket RPC the dashboard uses, with an operator-issued token.

---

## 13. Testing Strategy

1. **Unit**: supervisor tick logic with a fake clock and a fake DB.
2. **Integration**: spin up a real Gateway with SQLite, create a goal whose plan is "sleep 1s × 100 steps", verify it completes.
3. **Chaos**:
   - SIGKILL the Gateway mid-run; restart; assert the same step is the next one resumed.
   - Two Gateways pointing at same Postgres; SIGKILL one mid-run; assert the other claims within `leaseTtl + tickInterval`.
   - Hold a `pg_sleep(60)` on the leases table; assert tick_overrun metric and graceful degradation.
4. **Soak**: 24h run with 200 concurrent goals (each 10 steps); assert no leaks, no orphaned runs, no double execution.

---

## 14. Migration Plan

LLAR is additive — no upstream OpenClaw behaviour changes.

1. Ship `e_agent_run`, `e_run_lease`, `e_run_event` tables via migration `001_llar_init.sql`.
2. Wire the Supervisor as a service in `src/gateway/server.ts` startup, behind feature flag `gatra.llar.enabled` (default true in GATRA, false if running upstream OpenClaw with the enterprise plugin disabled).
3. Add CLI subcommands.
4. Add Dashboard "Runs" tab.

Rollback: disable the flag; existing runs are left in their durable state and resume on re-enable.

---

## 15. Open Questions

- Should we expose a "drift detector" that compares heartbeat age across runs and auto-restarts stuck loops? (Probably yes, post-v1.)
- Cross-region HA: do BUMN customers run active-active across two DCs, or active-passive with DR drills? Default design assumes single DC.
- Per-tenant lease quotas: out of scope for v1 (single-tenant gateway), revisit when we add tenancy.
