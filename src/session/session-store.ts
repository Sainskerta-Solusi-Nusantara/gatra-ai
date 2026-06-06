import { Leases, RunEvents, Runs } from '../memory/memory.js';
import type { AgentRun, RunStatus } from '../memory/memory.js';
import { canTransition } from './lifecycle.js';

/**
 * Thin wrapper around the run + lease tables. SessionManager uses this to keep
 * persisted run state consistent with the in-memory handle map.
 */
export class SessionStore {
  constructor(private readonly holderId: string, private readonly leaseTtlMs: number) {}

  acquireRun(runId: string): boolean {
    const lease = Leases.acquire(runId, this.holderId, this.leaseTtlMs);
    if (!lease) return false;
    RunEvents.append(runId, 'lease.acquired', { holder: this.holderId, expiresAt: lease.expiresAt });
    return true;
  }

  releaseRun(runId: string): void {
    Leases.release(runId, this.holderId);
    RunEvents.append(runId, 'lease.released', { holder: this.holderId });
  }

  heartbeat(runId: string): boolean {
    const ok = Leases.heartbeat(runId, this.holderId, this.leaseTtlMs);
    if (ok) RunEvents.append(runId, 'lease.heartbeat', { holder: this.holderId, ts: Date.now() });
    return ok;
  }

  findStealable(limit: number): string[] {
    return Leases.findStealableRuns(limit);
  }

  transitionRun(run: AgentRun, next: RunStatus, fields?: Partial<AgentRun>): AgentRun {
    if (!canTransition(run.status, next)) {
      throw new Error(`invalid run transition ${run.status} → ${next} for run ${run.id}`);
    }
    Runs.updateStatus(run.id, next, fields);
    RunEvents.append(run.id, `run.${next}`, fields ?? {});
    return { ...run, ...fields, status: next, updatedAt: Date.now() };
  }
}
