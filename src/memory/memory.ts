// Public surface for the memory layer. Other modules import from here.

export { Goals, Runs, Steps, Leases, RunEvents, Episodic, Semantic, Approvals, Audit } from './sqlite-store.js';
export { Checkpoints } from './checkpoint.js';
export { openDb, withTx } from './db.js';
export { migrate } from './migrate.js';
export type {
  Goal,
  GoalSpec,
  GoalBudget,
  GoalPolicy,
  GoalStatus,
  AgentRun,
  RunStatus,
  Step,
  StepStatus,
  Checkpoint,
  EpisodicMemory,
  SemanticFact,
  Approval,
  AuditEvent,
  RunEvent,
  RunLease,
  Criterion,
} from './types.js';

import { Episodic, Semantic } from './sqlite-store.js';
import type { EpisodicMemory, SemanticFact } from './types.js';

export interface WorkingContext {
  episodic: EpisodicMemory[];
  semantic: SemanticFact[];
}

/**
 * Build a token-bounded working context for the planner/critic.
 * Combines latest episodic events from this run with semantic facts pinned to the goal.
 */
export function buildWorkingContext(opts: {
  goalId: string;
  runId: string;
  query?: string;
  episodicLimit?: number;
}): WorkingContext {
  const episodic = opts.query
    ? Episodic.searchGoal(opts.goalId, opts.query, opts.episodicLimit ?? 30)
    : Episodic.listByRun(opts.runId, opts.episodicLimit ?? 30);
  const semantic = Semantic.list('goal', opts.goalId);
  return { episodic, semantic };
}
