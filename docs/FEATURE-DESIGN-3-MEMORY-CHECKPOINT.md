# Feature Design #3 — Memory & Checkpoint Layer (MCL)

> Status: Design v0.1
> Owner: enterprise/memory/
> Depends on: State DB, Object Store, Vector Store, Goal Executor (Feature #2), LLAR (Feature #1).

---

## 1. Problem & Motivation

A long-lived autonomous agent needs two distinct kinds of state, and OpenClaw ships neither as a first-class layer:

1. **Memory** — what the agent has observed, what it has learned, what it should recall later. Needed by the planner and critic to make good decisions.
2. **Checkpoints** — durable snapshots of execution state so a crash, restart, or rollback can resume from a known-good point without re-doing work.

OpenClaw has sessions and session history, which is conversational; it does not have typed memory partitions or step-level checkpoints. For BUMN goals that span days and tens of thousands of observations, we need both — designed deliberately, not bolted on.

---

## 2. Goals & Non-Goals

### Goals
1. Three memory partitions (episodic, semantic, durable facts) with clear retrieval semantics.
2. Per-goal memory isolation by default, with explicit promotion to cross-goal shared memory.
3. Step-level checkpoints that form a verifiable hash chain.
4. Resume from any prior checkpoint, not just the latest.
5. Memory compaction so episodic stores don't grow unbounded.
6. Auditability: every memory write and every checkpoint event recorded.
7. PII tagging at write-time, with redaction at read-time when crossing trust boundaries.

### Non-Goals
- A full "AGI memory architecture" — we choose a small, opinionated model.
- Replacing the operator's data warehouse — long-term BI lives elsewhere; we keep only what the agent needs to act.

---

## 3. Memory Model

```
                       ┌─────────────────────────────────────┐
                       │             WORKING                  │
                       │   in-process map per run             │
                       │   built fresh each loop              │
                       └────────────────┬────────────────────┘
                                        │ assembled from
            ┌───────────────────────────┼───────────────────────────┐
            │                           │                           │
            ▼                           ▼                           ▼
   ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
   │   EPISODIC      │         │   SEMANTIC      │         │  DURABLE FACTS  │
   │  (time-ordered) │         │ (vector recall) │         │  (key-value)    │
   │  e_memory_event │         │  vector store   │         │  e_memory_fact  │
   └─────────────────┘         └─────────────────┘         └─────────────────┘
       per-goal append          per-goal embed              per-scope upsert
       summarised at scale      cosine top-K                strict typed
```

### 3.1. Episodic

Time-ordered append-only log of observations, decisions, and outcomes for a run. Each row:

```sql
CREATE TABLE e_memory_event (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id     TEXT NOT NULL,
  run_id      TEXT NOT NULL,
  step_id     TEXT,
  ts          INTEGER NOT NULL,
  kind        TEXT NOT NULL,           -- observation|decision|outcome|note|summary
  body        TEXT NOT NULL,           -- short prose
  tags        TEXT,                    -- json array of tags (e.g. ['pii:nik','source:ojk'])
  payload_ref TEXT                     -- optional MinIO key for large blobs
);
CREATE INDEX idx_mem_event_goal_ts ON e_memory_event (goal_id, ts);
```

Read patterns:
- Tail window for planner context (last N events).
- Filtered tail (e.g., kind=`outcome` only) for the critic.
- Compaction sweep (oldest decile → one summary event).

### 3.2. Semantic

Embedding-backed recall. One row per chunk:

```sql
CREATE TABLE e_memory_chunk (
  id          TEXT PRIMARY KEY,           -- ulid
  scope_kind  TEXT NOT NULL,              -- goal|run|global
  scope_id    TEXT,                       -- goal_id or run_id; null when scope_kind='global'
  source_kind TEXT NOT NULL,              -- doc|observation|skill|note
  source_ref  TEXT,                       -- pointer into e_memory_event or external
  text        TEXT NOT NULL,              -- chunk body (kept small, e.g. <2KB)
  tags        TEXT,                       -- json
  embedding   BLOB NOT NULL,              -- float32[d]
  embedded_model TEXT NOT NULL,           -- which embedding model produced this
  ts          INTEGER NOT NULL
);
```

The actual vector index is held by:
- `sqlite-vss` for single-host SQLite mode (lives in same DB file as a virtual table),
- `pgvector` for HA Postgres mode.

Retrieval: `memory.semantic.recall(scope, queryText, k=5, tagFilter?)` returns top-K chunks by cosine similarity, scoped to `scope` plus `global`.

Embedding model: per provider, default `text-embedding-3-large` for hosted, configurable in-VPC equivalent for air-gap. Embedding model changes trigger a re-embed migration (background job).

### 3.3. Durable Facts

Key-value typed facts the agent wants to remember strictly, not via vector recall. Examples: "BUMN contact for compliance: name=…, email=…", "last successful reconciliation timestamp = …".

```sql
CREATE TABLE e_memory_fact (
  scope_kind TEXT NOT NULL,
  scope_id   TEXT NOT NULL,        -- '' for global
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,        -- json
  type_uri   TEXT NOT NULL,        -- e.g. 'gatra:fact:contact', 'gatra:fact:cursor'
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope_kind, scope_id, key)
);
```

`type_uri` is the schema reference. Schemas live in `enterprise/memory/schemas/` and are validated on write. Unknown types are rejected.

---

## 4. Working Context Assembly

The planner and critic don't read the raw stores directly. They call **one** function:

```ts
async function workingContextFor(goalId: string, options: WCFOptions): Promise<WorkingContext> {
  return {
    facts:     await facts.list(scopeOf(goalId), options.factTypes ?? '*'),
    summary:   await episodic.rollingSummary(goalId),               // long-horizon
    recent:    await episodic.tail(goalId, options.recentN ?? 20),  // short-horizon
    recall:    await semantic.recall(scopeOf(goalId), options.queryText, options.recallK ?? 5),
    budget:    await goal.budgetState(goalId),
  };
}
```

Why one function: every call to it is recorded; the planner cannot fan out hidden reads. Tests can replay deterministic working contexts. PII redaction (see §8) happens here, in one place.

---

## 5. Checkpoints

A checkpoint is the smallest unit of state from which a goal can resume.

### 5.1. What's captured

```ts
type CheckpointBlob = {
  schemaVersion: 1;
  goalId: string;
  runId: string;
  stepId: string;
  planVersion: number;
  workingMemorySnapshot: WorkingContext;   // what the planner saw for this step
  toolCursors: Record<string, unknown>;    // tools that implement snapshot()
  budgetState: BudgetState;
  takenAt: number;
};
```

What's deliberately **not** captured:
- The full episodic store (already in DB; we cite, not copy).
- The semantic vector store (regeneratable; we cite by chunk ids).
- The plan itself (already in `e_plan`).

### 5.2. Metadata table

```sql
CREATE TABLE e_checkpoint (
  id                 TEXT PRIMARY KEY,        -- ulid
  goal_id            TEXT NOT NULL,
  run_id             TEXT NOT NULL,
  step_id            TEXT NOT NULL,
  parent_checkpoint  TEXT,                    -- null for the first
  state_hash         TEXT NOT NULL,           -- sha256(canonical(blob))
  parent_state_hash  TEXT,                    -- denormalised for verify
  blob_ref           TEXT NOT NULL,           -- MinIO key
  size_bytes         INTEGER NOT NULL,
  taken_at           INTEGER NOT NULL,
  reason             TEXT NOT NULL            -- 'step_ok'|'forced'|'pre_dangerous_tool'|...
);
CREATE INDEX idx_ckpt_goal_run ON e_checkpoint (goal_id, run_id, taken_at);
```

### 5.3. Hash chain

`state_hash(N) = sha256(parent_state_hash(N) || canonical_json(blob(N)))`. The dashboard's `Run Timeline` validates the chain on demand; `gatra checkpoint verify <run_id>` validates from the CLI.

A broken chain is **not** silent. The supervisor refuses to resume from an unverifiable checkpoint and walks back the chain until a verifiable one is found.

### 5.4. Blob storage

- Path: `checkpoints/<goal_id>/<run_id>/<step_id>.<hash>.json.zst`
- Compressed with Zstandard.
- Content-addressed: identical blobs across runs deduplicate by hash (we still write a row to `e_checkpoint`, but `blob_ref` is shared).
- Encrypted at rest via MinIO server-side encryption with KMS key per BUMN customer policy.

### 5.5. When checkpoints are taken

Default: **after every successful step**. This is cheap because blobs compress well and the working memory snapshot is usually <50KB.

Additional triggers:
- Before any step calling a tool tagged `dangerous` (e.g., `payments.transfer`). The pre-step checkpoint lets us roll back to "the world before we paid the supplier."
- On explicit `executor.forceCheckpoint(runId, reason)` call (used by operators via dashboard).
- On graceful supervisor shutdown.

### 5.6. Resume protocol

```
function resume(goalId, runId, fromCheckpointId?):
  c = fromCheckpointId
      ? loadCheckpoint(fromCheckpointId)
      : latestVerifiableCheckpoint(runId)

  if !c: planExtraordinary("no checkpoints — replanning from goal spec")

  state = blobStore.get(c.blob_ref)
  if sha256(state) != c.state_hash: walk back; retry
  if c.parent_state_hash && walkBackVerifies() < N: warn but proceed

  restoreWorkingMemory(state.workingMemorySnapshot)
  for (toolName, cursor) of state.toolCursors:
    tools[toolName].restore?.(cursor, ctx)

  pointer = nextPendingStepAfter(c.step_id, c.planVersion)
  startExecutionLoop(pointer)
```

The protocol is designed to be **safe under partial restores**: if a tool's `restore` fails, that tool is logged as `restore_failed`, the executor either treats it as idempotent re-run or pauses the goal for operator review. The choice is the tool's declared metadata.

### 5.7. Rollback

Operators can roll back a run to a prior checkpoint via dashboard:

```
gatra checkpoint rollback <run_id> --to <checkpoint_id> --reason "..."
```

Rollback:
1. Pauses the run.
2. Marks all steps after the target checkpoint as `superseded`.
3. Starts a new plan version (planner is told "we rolled back because <reason>; replan from here").
4. Resumes execution.

Rollback is audited heavily — it is the only operator action that can destroy progress, so it requires the `goal_owner` role and a free-text reason.

---

## 6. Compaction

Episodic memory grows linearly with steps. Without compaction a long-running goal would carry MB of history.

### 6.1. Trigger

When `e_memory_event` rows for a goal exceed `compaction.bytesThreshold` (default 1MB) or `compaction.rowsThreshold` (default 5000).

### 6.2. Process

1. Compaction sweeper selects the oldest 10% of events for the goal.
2. Sends them to a summariser LLM call with prompt: "Compress these into a single dense summary preserving facts the planner would need."
3. Writes one new event `kind=summary` with the summary body and `summarised_from=[ids…]`.
4. Marks the source events `superseded_by=<summary_id>`. They are kept (not deleted) until retention purge — the audit trail must remain intact.

### 6.3. Resume safety

If a checkpoint references events that were later superseded, resume still works: the checkpoint blob carried a snapshot of working memory built from those events, so the planner sees coherent context even if the underlying rows are now hidden behind a summary.

---

## 7. Cross-Goal Knowledge Promotion

By default, memory is scoped to one goal. Operators can promote:

- A fact: `gatra memory fact promote --goal G123 --key "compliance.contact.email"` copies to `scope_kind='global'`.
- A semantic chunk: `gatra memory chunk promote --id ck_…` re-tags scope to global.

Promotion is audited and requires the `goal_owner` role. Promoted facts/chunks become visible to all other goals' working contexts.

This is the BUMN equivalent of "the agent learned something useful — make it institutional knowledge." We *don't* auto-promote; promotion is always a human-in-the-loop step.

---

## 8. PII Tagging & Redaction

Memory is the most likely place for PII to accumulate. We require tagging at write time:

```ts
memory.episodic.write(goalId, runId, stepId, {
  kind: 'observation',
  body: 'Found employee record for NIK 3201xxxxxxxxxxxx',
  tags: ['pii:nik']
});
```

The PII tag vocabulary is loaded from `enterprise/memory/pii.yaml` and includes by default the Indonesian set: `pii:nik`, `pii:npwp`, `pii:ktp`, `pii:rekening`, `pii:phone`, `pii:email`, and generic `pii:name`, `pii:address`.

### 8.1. Read-time redaction

`workingContextFor` accepts a `redactionPolicy`:

```ts
{ keep: ['pii:none'], maskInBody: ['pii:nik','pii:npwp'], dropEntirely: ['pii:rekening'] }
```

Default policy applies to LLM provider egress: redact NIK/NPWP/account numbers to placeholder tokens (`<NIK_1>` etc.) **before** sending to any provider that is not in the customer's on-prem allowlist.

Masking is consistent within a working context (the same NIK becomes the same placeholder), so the planner can still reason about identity without seeing the raw value.

### 8.2. Audit of leakage attempts

Any read that would expose a PII-tagged value to an out-of-policy destination is blocked and written to `audit_event` with `kind=pii_leak_blocked`. The dashboard surfaces these as security findings.

---

## 9. Storage Footprint Estimates

Per goal, 30-day horizon, mid-sized BUMN workload (≈2000 steps):

| Layer | Rows | Bytes |
|-------|------|-------|
| Episodic events | ≈8000 (with summaries) | ≈10 MB |
| Semantic chunks | ≈4000 | ≈20 MB (incl. embeddings) |
| Facts | ≈50 | <100 KB |
| Checkpoint metadata | ≈2000 | ≈1 MB |
| Checkpoint blobs (compressed) | ≈2000 | ≈100 MB |
| Audit events | ≈10000 | ≈5 MB |
| **Total** | | **≈135 MB** |

Disk planning for HA: assume 200 active goals × 135 MB = ~27 GB hot; provision 100 GB for SQLite/Postgres + 500 GB for MinIO.

---

## 10. APIs

```ts
// Episodic
memory.episodic.write(goalId, runId, stepId, event): Promise<EventId>
memory.episodic.tail(goalId, n): Promise<Event[]>
memory.episodic.rollingSummary(goalId): Promise<string>

// Semantic
memory.semantic.embed(text): Promise<EmbeddingId>           // writes chunk + vector
memory.semantic.recall(scope, queryText, k, tagFilter?): Promise<Chunk[]>
memory.semantic.promote(chunkId, toScope): Promise<void>

// Facts
memory.facts.upsert(scope, key, value, typeUri): Promise<void>
memory.facts.get(scope, key): Promise<Fact | null>
memory.facts.list(scope, typeFilter?): Promise<Fact[]>

// Checkpoints
checkpoint.save(runId, stepId, reason): Promise<CheckpointId>
checkpoint.list(runId): Promise<CheckpointMeta[]>
checkpoint.verify(runId, fromId?): Promise<VerifyReport>
checkpoint.rollback(runId, toId, reason, actorId): Promise<void>

// Working context — the only call planner/critic make
memory.workingContextFor(goalId, options): Promise<WorkingContext>
```

All write APIs participate in the same transaction as the calling step where possible, so a step that completes is durable end-to-end before the loop advances.

---

## 11. Configuration

```yaml
memory:
  episodic:
    tailDefault: 20
    compaction:
      bytesThreshold: 1048576
      rowsThreshold: 5000
      summariserModel: claude-3-5-haiku-latest
  semantic:
    embeddingModel: text-embedding-3-large
    embeddingDim: 3072
    backend: pgvector       # or 'sqlite-vss'
    recallDefaultK: 5
  facts:
    schemasDir: enterprise/memory/schemas
    rejectUnknownTypes: true
  pii:
    vocabularyFile: enterprise/memory/pii.yaml
    egressRedactionPolicy:
      maskInBody: ['pii:nik','pii:npwp','pii:rekening']
      dropEntirely: []
  checkpoint:
    storeBackend: minio
    bucket: gatra-checkpoints
    compression: zstd
    encryptionKmsKey: alias/gatra-ckpt
    autoOnStepOk: true
    autoOnDangerousTool: true
    retainSucceededDays: 90
    retainFailedDays: 30
```

---

## 12. Failure Modes

| Failure | Behaviour |
|---------|-----------|
| Embedding model down | Write to a fallback `pending_embeddings` queue; recall falls back to text search until queue drains |
| MinIO unreachable on checkpoint save | Step transition refuses to commit; supervisor retries with backoff; if persistent, goal pauses with `reason=checkpoint_store_down` |
| Vector index corrupt | Read returns empty + warning; admin alert; rebuild job from `e_memory_chunk` source rows |
| Checkpoint hash mismatch on resume | Walk back chain; if no verifiable parent, mark goal `failed (reason=checkpoint_chain_broken)` |
| PII tag missing on a known sensitive field | Egress redactor refuses to send; audit `pii_leak_blocked`; planner gets a redacted placeholder |

---

## 13. Testing Strategy

1. **Schema validation tests** for fact types.
2. **Compaction soak**: simulate 100k events; assert compaction keeps the store under threshold and summaries preserve key facts (LLM-judge eval).
3. **Resume property test**: kill the executor at every step boundary 10 times across 20 goals; assert exactly-once step completion (no duplicates, no gaps).
4. **Hash chain fuzzing**: corrupt a random blob in MinIO; assert verify catches it and walk-back recovers.
5. **PII redaction**: end-to-end test that a tagged NIK never appears in outbound LLM payloads (assert via egress proxy log inspection).
6. **Migration test**: simulate an embedding model swap; assert background re-embed completes and recall still works during migration.

---

## 14. Migration & Rollout

1. Migration `003_memory_init.sql`: tables for episodic, chunks, facts, checkpoints.
2. Add `pii.yaml` and starter schemas.
3. Wire `workingContextFor` into the planner; wire `checkpoint.save` into the LLAR step loop.
4. Backfill: existing OpenClaw session histories can be optionally imported as a one-shot episodic seed via `gatra import sessions`.
5. Default feature flag `gatra.memory.enabled=true`. When off, executor falls back to a degenerate "no memory" mode (planner sees only the goal spec) for emergency use.

---

## 15. Open Questions

- Embeddings provider in air-gapped deployments: bundle a small on-prem model (BGE-M3?) or require customer to deploy one? Lean: ship a bundled one with a documented swap path.
- Should we expose memory CRUD to tools directly (so a tool can write a fact mid-execution)? Lean: yes, but gated by tool capability flag, not free-for-all.
- Multi-language memory: do we want one embedding store with mixed languages (id-ID + en-US) or two? Lean: one with multilingual embedding model; cheaper, comparable recall in practice.
