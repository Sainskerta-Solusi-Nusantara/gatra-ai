import { ulid } from 'ulid';
import { openDb } from './db.js';
import type {
  AgentRun,
  Approval,
  AuditEvent,
  EpisodicMemory,
  Goal,
  GoalStatus,
  RunEvent,
  RunLease,
  RunStatus,
  SemanticFact,
  Step,
  StepStatus,
} from './types.js';

const now = () => Date.now();

// ---------- Row mappers ----------

interface GoalRow {
  id: string;
  title: string;
  spec_json: string;
  budget_json: string;
  policy_json: string;
  status: string;
  created_by: string;
  department_id: string | null;
  created_at: number;
  updated_at: number;
}

function mapGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    title: r.title,
    spec: JSON.parse(r.spec_json),
    budget: JSON.parse(r.budget_json),
    policy: JSON.parse(r.policy_json),
    status: r.status as GoalStatus,
    createdBy: r.created_by,
    departmentId: r.department_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface RunRow {
  id: string;
  goal_id: string;
  status: string;
  current_step_id: string | null;
  last_checkpoint_id: string | null;
  attempt: number;
  steps_executed: number;
  tokens_used: number;
  cost_usd: number;
  started_at: number | null;
  ended_at: number | null;
  error_message: string | null;
  created_at: number;
  updated_at: number;
}

function mapRun(r: RunRow): AgentRun {
  return {
    id: r.id,
    goalId: r.goal_id,
    status: r.status as RunStatus,
    currentStepId: r.current_step_id,
    lastCheckpointId: r.last_checkpoint_id,
    attempt: r.attempt,
    stepsExecuted: r.steps_executed,
    tokensUsed: r.tokens_used,
    costUsd: r.cost_usd,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    errorMessage: r.error_message,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface StepRow {
  id: string;
  run_id: string;
  goal_id: string;
  idx: number;
  tier: string;
  tool: string;
  args_json: string | null;
  rationale: string | null;
  status: string;
  result_json: string | null;
  critique: string | null;
  tokens_used: number;
  started_at: number | null;
  ended_at: number | null;
  created_at: number;
}

function mapStep(r: StepRow): Step {
  return {
    id: r.id,
    runId: r.run_id,
    goalId: r.goal_id,
    index: r.idx,
    tier: r.tier as Step['tier'],
    tool: r.tool,
    args: r.args_json ? JSON.parse(r.args_json) : null,
    rationale: r.rationale ?? '',
    status: r.status as StepStatus,
    result: r.result_json ? JSON.parse(r.result_json) : null,
    critique: r.critique,
    tokensUsed: r.tokens_used,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    createdAt: r.created_at,
  };
}

// ---------- Goals ----------

export const Goals = {
  create(
    input: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'departmentId'> & {
      status?: GoalStatus;
      departmentId?: string | null;
    },
  ): Goal {
    const db = openDb();
    const id = ulid();
    const t = now();
    const status: GoalStatus = input.status ?? 'pending';
    const departmentId = input.departmentId ?? null;
    db.prepare(
      `INSERT INTO e_goal(id,title,spec_json,budget_json,policy_json,status,created_by,department_id,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id,
      input.title,
      JSON.stringify(input.spec),
      JSON.stringify(input.budget),
      JSON.stringify(input.policy),
      status,
      input.createdBy,
      departmentId,
      t,
      t,
    );
    return { ...input, id, status, departmentId, createdAt: t, updatedAt: t };
  },

  get(id: string): Goal | null {
    const db = openDb();
    const row = db.prepare(`SELECT * FROM e_goal WHERE id = ?`).get(id) as GoalRow | undefined;
    return row ? mapGoal(row) : null;
  },

  list(
    filter: {
      status?: GoalStatus;
      owner?: string;
      departmentId?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Goal[] {
    const db = openDb();
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter.status) {
      where.push('status = ?');
      params.push(filter.status);
    }
    if (filter.owner) {
      where.push('created_by = ?');
      params.push(filter.owner);
    }
    if (filter.departmentId) {
      where.push('department_id = ?');
      params.push(filter.departmentId);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT * FROM e_goal ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(filter.limit ?? 100, filter.offset ?? 0);
    const rows = db.prepare(sql).all(...params) as GoalRow[];
    return rows.map(mapGoal);
  },

  updateStatus(id: string, status: GoalStatus): void {
    const db = openDb();
    db.prepare(`UPDATE e_goal SET status = ?, updated_at = ? WHERE id = ?`).run(status, now(), id);
  },

  countByStatus(): Record<string, number> {
    const db = openDb();
    const rows = db.prepare(`SELECT status, COUNT(*) AS n FROM e_goal GROUP BY status`).all() as {
      status: string;
      n: number;
    }[];
    const out: Record<string, number> = {};
    for (const r of rows) out[r.status] = r.n;
    return out;
  },
};

// ---------- Runs ----------

export const Runs = {
  create(goalId: string): AgentRun {
    const db = openDb();
    const id = ulid();
    const t = now();
    db.prepare(
      `INSERT INTO e_agent_run(id,goal_id,status,attempt,steps_executed,tokens_used,cost_usd,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?)`,
    ).run(id, goalId, 'ready' satisfies RunStatus, 0, 0, 0, 0, t, t);
    return {
      id,
      goalId,
      status: 'ready',
      currentStepId: null,
      lastCheckpointId: null,
      attempt: 0,
      stepsExecuted: 0,
      tokensUsed: 0,
      costUsd: 0,
      startedAt: null,
      endedAt: null,
      errorMessage: null,
      createdAt: t,
      updatedAt: t,
    };
  },

  get(id: string): AgentRun | null {
    const db = openDb();
    const row = db.prepare(`SELECT * FROM e_agent_run WHERE id = ?`).get(id) as RunRow | undefined;
    return row ? mapRun(row) : null;
  },

  list(filter: { goalId?: string; status?: RunStatus; limit?: number; offset?: number } = {}): AgentRun[] {
    const db = openDb();
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter.goalId) {
      where.push('goal_id = ?');
      params.push(filter.goalId);
    }
    if (filter.status) {
      where.push('status = ?');
      params.push(filter.status);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT * FROM e_agent_run ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(filter.limit ?? 100, filter.offset ?? 0);
    const rows = db.prepare(sql).all(...params) as RunRow[];
    return rows.map(mapRun);
  },

  updateStatus(id: string, status: RunStatus, fields: Partial<AgentRun> = {}): void {
    const db = openDb();
    const t = now();
    const sets: string[] = ['status = ?', 'updated_at = ?'];
    const params: unknown[] = [status, t];

    if (fields.currentStepId !== undefined) {
      sets.push('current_step_id = ?');
      params.push(fields.currentStepId);
    }
    if (fields.lastCheckpointId !== undefined) {
      sets.push('last_checkpoint_id = ?');
      params.push(fields.lastCheckpointId);
    }
    if (fields.startedAt !== undefined) {
      sets.push('started_at = ?');
      params.push(fields.startedAt);
    }
    if (fields.endedAt !== undefined) {
      sets.push('ended_at = ?');
      params.push(fields.endedAt);
    }
    if (fields.errorMessage !== undefined) {
      sets.push('error_message = ?');
      params.push(fields.errorMessage);
    }
    params.push(id);
    db.prepare(`UPDATE e_agent_run SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  },

  incrementProgress(id: string, deltaSteps: number, deltaTokens: number, deltaCostUsd: number): void {
    const db = openDb();
    db.prepare(
      `UPDATE e_agent_run
         SET steps_executed = steps_executed + ?,
             tokens_used    = tokens_used + ?,
             cost_usd       = cost_usd + ?,
             updated_at     = ?
       WHERE id = ?`,
    ).run(deltaSteps, deltaTokens, deltaCostUsd, now(), id);
  },

  incrementAttempt(id: string): void {
    const db = openDb();
    db.prepare(`UPDATE e_agent_run SET attempt = attempt + 1, updated_at = ? WHERE id = ?`).run(
      now(),
      id,
    );
  },
};

// ---------- Run leases (for session manager) ----------

interface LeaseRow {
  run_id: string;
  holder_id: string;
  acquired_at: number;
  expires_at: number;
  heartbeat_at: number;
}

function mapLease(r: LeaseRow): RunLease {
  return {
    runId: r.run_id,
    holderId: r.holder_id,
    acquiredAt: r.acquired_at,
    expiresAt: r.expires_at,
    heartbeatAt: r.heartbeat_at,
  };
}

export const Leases = {
  acquire(runId: string, holderId: string, ttlMs: number): RunLease | null {
    const db = openDb();
    const t = now();
    const expiresAt = t + ttlMs;
    const tx = db.transaction(() => {
      const existing = db
        .prepare(`SELECT * FROM e_run_lease WHERE run_id = ?`)
        .get(runId) as LeaseRow | undefined;
      if (existing && existing.expires_at >= t && existing.holder_id !== holderId) {
        return null;
      }
      if (existing) {
        db.prepare(
          `UPDATE e_run_lease SET holder_id = ?, acquired_at = ?, expires_at = ?, heartbeat_at = ? WHERE run_id = ?`,
        ).run(holderId, t, expiresAt, t, runId);
      } else {
        db.prepare(
          `INSERT INTO e_run_lease(run_id, holder_id, acquired_at, expires_at, heartbeat_at) VALUES(?,?,?,?,?)`,
        ).run(runId, holderId, t, expiresAt, t);
      }
      return {
        runId,
        holderId,
        acquiredAt: t,
        expiresAt,
        heartbeatAt: t,
      } satisfies RunLease;
    });
    return tx();
  },

  heartbeat(runId: string, holderId: string, ttlMs: number): boolean {
    const db = openDb();
    const t = now();
    const result = db
      .prepare(
        `UPDATE e_run_lease
           SET heartbeat_at = ?, expires_at = ?
         WHERE run_id = ? AND holder_id = ?`,
      )
      .run(t, t + ttlMs, runId, holderId);
    return result.changes === 1;
  },

  release(runId: string, holderId: string): void {
    const db = openDb();
    db.prepare(`DELETE FROM e_run_lease WHERE run_id = ? AND holder_id = ?`).run(runId, holderId);
  },

  findStealableRuns(limit: number): string[] {
    const db = openDb();
    const t = now();
    const rows = db
      .prepare(
        `SELECT r.id AS id FROM e_agent_run r
           LEFT JOIN e_run_lease l ON l.run_id = r.id
          WHERE r.status IN ('ready','orphaned')
             OR (l.expires_at IS NOT NULL AND l.expires_at < ?)
          ORDER BY r.updated_at ASC
          LIMIT ?`,
      )
      .all(t, limit) as { id: string }[];
    return rows.map((r) => r.id);
  },

  list(): RunLease[] {
    const db = openDb();
    const rows = db.prepare(`SELECT * FROM e_run_lease`).all() as LeaseRow[];
    return rows.map(mapLease);
  },
};

// ---------- Run events (per-run journal) ----------

export const RunEvents = {
  append(runId: string, kind: string, meta?: Record<string, unknown>): void {
    const db = openDb();
    db.prepare(`INSERT INTO e_run_event(run_id, ts, kind, meta) VALUES(?,?,?,?)`).run(
      runId,
      now(),
      kind,
      meta ? JSON.stringify(meta) : null,
    );
  },

  list(runId: string, limit = 500): RunEvent[] {
    const db = openDb();
    const rows = db
      .prepare(`SELECT * FROM e_run_event WHERE run_id = ? ORDER BY ts ASC LIMIT ?`)
      .all(runId, limit) as { id: number; run_id: string; ts: number; kind: string; meta: string | null }[];
    return rows.map((r) => ({
      id: r.id,
      runId: r.run_id,
      ts: r.ts,
      kind: r.kind,
      meta: r.meta ? JSON.parse(r.meta) : {},
    }));
  },
};

// ---------- Steps ----------

export const Steps = {
  create(input: Omit<Step, 'id' | 'createdAt' | 'startedAt' | 'endedAt' | 'tokensUsed' | 'result' | 'critique' | 'status'>): Step {
    const db = openDb();
    const id = ulid();
    const t = now();
    db.prepare(
      `INSERT INTO e_step(id,run_id,goal_id,idx,tier,tool,args_json,rationale,status,tokens_used,created_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id,
      input.runId,
      input.goalId,
      input.index,
      input.tier,
      input.tool,
      input.args !== undefined ? JSON.stringify(input.args) : null,
      input.rationale,
      'planned' satisfies StepStatus,
      0,
      t,
    );
    return {
      ...input,
      id,
      status: 'planned',
      result: null,
      critique: null,
      tokensUsed: 0,
      startedAt: null,
      endedAt: null,
      createdAt: t,
    };
  },

  get(id: string): Step | null {
    const db = openDb();
    const row = db.prepare(`SELECT * FROM e_step WHERE id = ?`).get(id) as StepRow | undefined;
    return row ? mapStep(row) : null;
  },

  listByRun(runId: string): Step[] {
    const db = openDb();
    const rows = db.prepare(`SELECT * FROM e_step WHERE run_id = ? ORDER BY idx ASC`).all(runId) as StepRow[];
    return rows.map(mapStep);
  },

  updateStart(id: string): void {
    const db = openDb();
    db.prepare(`UPDATE e_step SET status = 'executing', started_at = ? WHERE id = ?`).run(now(), id);
  },

  updateResult(id: string, status: StepStatus, result: unknown, tokensUsed: number, critique: string | null): void {
    const db = openDb();
    db.prepare(
      `UPDATE e_step SET status = ?, result_json = ?, tokens_used = ?, critique = ?, ended_at = ? WHERE id = ?`,
    ).run(status, JSON.stringify(result ?? null), tokensUsed, critique, now(), id);
  },

  countByRun(runId: string): number {
    const db = openDb();
    const row = db.prepare(`SELECT COUNT(*) AS n FROM e_step WHERE run_id = ?`).get(runId) as { n: number };
    return row.n;
  },
};

// ---------- Episodic memory ----------

export const Episodic = {
  append(input: Omit<EpisodicMemory, 'id' | 'createdAt'>): EpisodicMemory {
    const db = openDb();
    const id = ulid();
    const t = now();
    db.prepare(
      `INSERT INTO e_episodic(id,goal_id,run_id,step_id,kind,content,tokens,created_at) VALUES(?,?,?,?,?,?,?,?)`,
    ).run(id, input.goalId, input.runId, input.stepId, input.kind, input.content, input.tokens, t);
    return { ...input, id, createdAt: t };
  },

  listByRun(runId: string, limit = 200): EpisodicMemory[] {
    const db = openDb();
    const rows = db
      .prepare(`SELECT * FROM e_episodic WHERE run_id = ? ORDER BY created_at DESC LIMIT ?`)
      .all(runId, limit) as {
      id: string;
      goal_id: string;
      run_id: string;
      step_id: string | null;
      kind: string;
      content: string;
      tokens: number;
      created_at: number;
    }[];
    return rows.map((r) => ({
      id: r.id,
      goalId: r.goal_id,
      runId: r.run_id,
      stepId: r.step_id,
      kind: r.kind as EpisodicMemory['kind'],
      content: r.content,
      tokens: r.tokens,
      createdAt: r.created_at,
    }));
  },

  searchGoal(goalId: string, query: string, limit = 20): EpisodicMemory[] {
    // Naive LIKE search — pgvector / sqlite-vss is the v2 upgrade path.
    const db = openDb();
    const rows = db
      .prepare(
        `SELECT * FROM e_episodic
          WHERE goal_id = ? AND content LIKE ?
          ORDER BY created_at DESC LIMIT ?`,
      )
      .all(goalId, `%${query}%`, limit) as {
      id: string;
      goal_id: string;
      run_id: string;
      step_id: string | null;
      kind: string;
      content: string;
      tokens: number;
      created_at: number;
    }[];
    return rows.map((r) => ({
      id: r.id,
      goalId: r.goal_id,
      runId: r.run_id,
      stepId: r.step_id,
      kind: r.kind as EpisodicMemory['kind'],
      content: r.content,
      tokens: r.tokens,
      createdAt: r.created_at,
    }));
  },
};

// ---------- Semantic facts ----------

export const Semantic = {
  upsert(input: Omit<SemanticFact, 'id' | 'createdAt' | 'updatedAt'>): void {
    const db = openDb();
    const t = now();
    const id = ulid();
    db.prepare(
      `INSERT INTO e_semantic(id,scope,scope_id,key,value,confidence,source,created_at,updated_at)
         VALUES(?,?,?,?,?,?,?,?,?)
       ON CONFLICT(scope, scope_id, key) DO UPDATE SET
         value = excluded.value,
         confidence = excluded.confidence,
         source = excluded.source,
         updated_at = excluded.updated_at`,
    ).run(id, input.scope, input.scopeId, input.key, input.value, input.confidence, input.source, t, t);
  },

  list(scope: 'goal' | 'tenant', scopeId: string): SemanticFact[] {
    const db = openDb();
    const rows = db
      .prepare(`SELECT * FROM e_semantic WHERE scope = ? AND scope_id = ? ORDER BY updated_at DESC`)
      .all(scope, scopeId) as {
      id: string;
      scope: string;
      scope_id: string;
      key: string;
      value: string;
      confidence: number;
      source: string;
      created_at: number;
      updated_at: number;
    }[];
    return rows.map((r) => ({
      id: r.id,
      scope: r.scope as 'goal' | 'tenant',
      scopeId: r.scope_id,
      key: r.key,
      value: r.value,
      confidence: r.confidence,
      source: r.source,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },
};

// ---------- Approvals ----------

export const Approvals = {
  create(input: Omit<Approval, 'id' | 'requestedAt' | 'decidedAt' | 'decidedBy' | 'decision' | 'comment'>): Approval {
    const db = openDb();
    const id = ulid();
    const t = now();
    db.prepare(
      `INSERT INTO e_approval(id,run_id,step_id,reason,requested_role,requested_at,decision) VALUES(?,?,?,?,?,?,?)`,
    ).run(id, input.runId, input.stepId, input.reason, input.requestedRole, t, 'pending');
    return {
      ...input,
      id,
      requestedAt: t,
      decidedAt: null,
      decidedBy: null,
      decision: 'pending',
      comment: null,
    };
  },

  pending(): Approval[] {
    const db = openDb();
    const rows = db
      .prepare(`SELECT * FROM e_approval WHERE decision = 'pending' ORDER BY requested_at ASC`)
      .all() as {
      id: string;
      run_id: string;
      step_id: string;
      reason: string;
      requested_role: string;
      requested_at: number;
      decided_at: number | null;
      decided_by: string | null;
      decision: string;
      comment: string | null;
    }[];
    return rows.map((r) => ({
      id: r.id,
      runId: r.run_id,
      stepId: r.step_id,
      reason: r.reason,
      requestedRole: r.requested_role,
      requestedAt: r.requested_at,
      decidedAt: r.decided_at,
      decidedBy: r.decided_by,
      decision: r.decision as Approval['decision'],
      comment: r.comment,
    }));
  },

  get(id: string): Approval | null {
    const db = openDb();
    const r = db.prepare(`SELECT * FROM e_approval WHERE id = ?`).get(id) as
      | {
          id: string;
          run_id: string;
          step_id: string;
          reason: string;
          requested_role: string;
          requested_at: number;
          decided_at: number | null;
          decided_by: string | null;
          decision: string;
          comment: string | null;
        }
      | undefined;
    if (!r) return null;
    return {
      id: r.id,
      runId: r.run_id,
      stepId: r.step_id,
      reason: r.reason,
      requestedRole: r.requested_role,
      requestedAt: r.requested_at,
      decidedAt: r.decided_at,
      decidedBy: r.decided_by,
      decision: r.decision as Approval['decision'],
      comment: r.comment,
    };
  },

  decide(id: string, decidedBy: string, decision: 'approved' | 'rejected', comment?: string): void {
    const db = openDb();
    db.prepare(
      `UPDATE e_approval SET decision = ?, decided_at = ?, decided_by = ?, comment = ? WHERE id = ?`,
    ).run(decision, now(), decidedBy, comment ?? null, id);
  },
};

// ---------- Audit log ----------

export const Audit = {
  append(actor: string, action: string, target: string, meta: Record<string, unknown> = {}): void {
    const db = openDb();
    db.prepare(`INSERT INTO e_audit_event(ts, actor, action, target, meta) VALUES(?,?,?,?,?)`).run(
      now(),
      actor,
      action,
      target,
      JSON.stringify(meta),
    );
  },

  search(
    filter: { actor?: string; action?: string; q?: string; since?: number; until?: number; limit?: number } = {},
  ): AuditEvent[] {
    const db = openDb();
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter.actor) {
      where.push('actor = ?');
      params.push(filter.actor);
    }
    if (filter.action) {
      where.push('action = ?');
      params.push(filter.action);
    }
    if (filter.q) {
      where.push('(target LIKE ? OR meta LIKE ?)');
      params.push(`%${filter.q}%`, `%${filter.q}%`);
    }
    if (filter.since) {
      where.push('ts >= ?');
      params.push(filter.since);
    }
    if (filter.until) {
      where.push('ts <= ?');
      params.push(filter.until);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = db
      .prepare(`SELECT * FROM e_audit_event ${whereSql} ORDER BY ts DESC LIMIT ?`)
      .all(...params, filter.limit ?? 200) as {
      id: number;
      ts: number;
      actor: string;
      action: string;
      target: string;
      meta: string | null;
    }[];
    return rows.map((r) => ({
      id: r.id,
      ts: r.ts,
      actor: r.actor,
      action: r.action,
      target: r.target,
      meta: r.meta ? JSON.parse(r.meta) : {},
    }));
  },
};
