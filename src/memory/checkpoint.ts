import { ulid } from 'ulid';
import { createHash } from 'node:crypto';
import { openDb } from './db.js';
import type { Checkpoint } from './types.js';

function canonical(o: unknown): string {
  // Deterministic JSON: sort keys recursively
  const seen = new WeakSet();
  const sort = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(sort);
    if (seen.has(v as object)) return null;
    seen.add(v as object);
    const obj = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) out[k] = sort(obj[k]);
    return out;
  };
  return JSON.stringify(sort(o));
}

function hash(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export interface CheckpointInput {
  goalId: string;
  runId: string;
  stepId: string;
  payload: unknown;
  reason: Checkpoint['reason'];
}

interface CheckpointRow {
  id: string;
  goal_id: string;
  run_id: string;
  step_id: string;
  parent_checkpoint: string | null;
  state_hash: string;
  parent_state_hash: string | null;
  payload_json: string;
  size_bytes: number;
  taken_at: number;
  reason: string;
}

function mapCheckpoint(r: CheckpointRow): Checkpoint {
  return {
    id: r.id,
    goalId: r.goal_id,
    runId: r.run_id,
    stepId: r.step_id,
    parentCheckpoint: r.parent_checkpoint,
    stateHash: r.state_hash,
    parentStateHash: r.parent_state_hash,
    payload: JSON.parse(r.payload_json),
    sizeBytes: r.size_bytes,
    takenAt: r.taken_at,
    reason: r.reason as Checkpoint['reason'],
  };
}

export const Checkpoints = {
  take(input: CheckpointInput): Checkpoint {
    const db = openDb();
    const id = ulid();
    const t = Date.now();

    const canonStr = canonical(input.payload);
    const stateHash = hash(canonStr);
    const sizeBytes = Buffer.byteLength(canonStr, 'utf8');

    const parent = db
      .prepare(`SELECT id, state_hash FROM e_checkpoint WHERE run_id = ? ORDER BY taken_at DESC LIMIT 1`)
      .get(input.runId) as { id: string; state_hash: string } | undefined;

    db.prepare(
      `INSERT INTO e_checkpoint(id,goal_id,run_id,step_id,parent_checkpoint,state_hash,parent_state_hash,payload_json,size_bytes,taken_at,reason)
       VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id,
      input.goalId,
      input.runId,
      input.stepId,
      parent?.id ?? null,
      stateHash,
      parent?.state_hash ?? null,
      canonStr,
      sizeBytes,
      t,
      input.reason,
    );

    // Update run's last_checkpoint pointer
    db.prepare(`UPDATE e_agent_run SET last_checkpoint_id = ? WHERE id = ?`).run(id, input.runId);

    return {
      id,
      goalId: input.goalId,
      runId: input.runId,
      stepId: input.stepId,
      parentCheckpoint: parent?.id ?? null,
      stateHash,
      parentStateHash: parent?.state_hash ?? null,
      payload: input.payload,
      sizeBytes,
      takenAt: t,
      reason: input.reason,
    };
  },

  get(id: string): Checkpoint | null {
    const db = openDb();
    const r = db.prepare(`SELECT * FROM e_checkpoint WHERE id = ?`).get(id) as CheckpointRow | undefined;
    return r ? mapCheckpoint(r) : null;
  },

  latestForRun(runId: string): Checkpoint | null {
    const db = openDb();
    const r = db
      .prepare(`SELECT * FROM e_checkpoint WHERE run_id = ? ORDER BY taken_at DESC LIMIT 1`)
      .get(runId) as CheckpointRow | undefined;
    return r ? mapCheckpoint(r) : null;
  },

  listForRun(runId: string): Checkpoint[] {
    const db = openDb();
    const rows = db
      .prepare(`SELECT * FROM e_checkpoint WHERE run_id = ? ORDER BY taken_at ASC`)
      .all(runId) as CheckpointRow[];
    return rows.map(mapCheckpoint);
  },

  /**
   * Walks the parent chain from the latest checkpoint back to the root, verifying
   * that each child's parent_state_hash matches its parent's state_hash.
   */
  verifyChain(runId: string): { ok: boolean; broken?: string } {
    const list = Checkpoints.listForRun(runId);
    let prev: Checkpoint | null = null;
    for (const c of list) {
      if (prev) {
        if (c.parentCheckpoint !== prev.id || c.parentStateHash !== prev.stateHash) {
          return { ok: false, broken: c.id };
        }
      } else if (c.parentCheckpoint !== null) {
        return { ok: false, broken: c.id };
      }
      prev = c;
    }
    return { ok: true };
  },

  rollback(checkpointId: string): Checkpoint | null {
    const db = openDb();
    const target = Checkpoints.get(checkpointId);
    if (!target) return null;
    db.prepare(`DELETE FROM e_checkpoint WHERE run_id = ? AND taken_at > ?`).run(
      target.runId,
      target.takenAt,
    );
    db.prepare(`UPDATE e_agent_run SET last_checkpoint_id = ? WHERE id = ?`).run(
      checkpointId,
      target.runId,
    );
    return target;
  },
};
