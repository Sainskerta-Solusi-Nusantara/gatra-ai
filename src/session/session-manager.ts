import { EventEmitter } from 'node:events';
import { config } from '../config.js';
import { logger } from '../logger.js';
import {
  Audit,
  Checkpoints,
  Goals,
  RunEvents,
  Runs,
} from '../memory/memory.js';
import type { AgentRun, Goal } from '../memory/memory.js';
import { SessionStore } from './session-store.js';
import { isTerminal } from './lifecycle.js';
import type { SessionEvent, SessionHandle, SessionMetrics } from './types.js';

export interface ExecutorProgressEvent {
  kind: string;
  payload: unknown;
}

export interface ExecutorRunOpts {
  run: AgentRun;
  goal: Goal;
  signal: AbortSignal;
  scopeNote?: string;  // department scope enforcement prompt
  onProgress: (event: ExecutorProgressEvent) => void;
}

export interface ExecutorAdapter {
  runOnce(opts: ExecutorRunOpts): Promise<{ status: 'succeeded' | 'failed' | 'paused'; reason?: string }>;
}

/**
 * SessionManager owns the lifecycle of long-lived agent runs.
 * - acquires leases (HA-safe via SQL conditional update)
 * - heartbeats periodically so other supervisors see the lease as live
 * - runs the executor in a child task, abortable on pause/stop
 * - drives the run state machine and emits events for the API/WebSocket
 */
export class SessionManager extends EventEmitter {
  private readonly store: SessionStore;
  private readonly sessions = new Map<string, SessionHandle>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private supervisorTimer: NodeJS.Timeout | null = null;
  private stopping = false;

  constructor(private readonly executor: ExecutorAdapter) {
    super();
    this.store = new SessionStore(config.instanceId, config.session.leaseTtlMs);
  }

  start(): void {
    this.startHeartbeat();
    this.startSupervisor();
    this.recoverOrphans();
    logger.info({ instance: config.instanceId }, 'session manager started');
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.supervisorTimer) clearInterval(this.supervisorTimer);
    const all = [...this.sessions.values()];
    for (const s of all) s.abort.abort('shutdown');
    // Wait briefly for tasks to finish their current step gracefully
    await new Promise((r) => setTimeout(r, 250));
    for (const s of all) this.store.releaseRun(s.runId);
    this.sessions.clear();
    logger.info('session manager stopped');
  }

  // ---------- Public API ----------

  async startRun(goalId: string, actor: string): Promise<AgentRun> {
    const goal = Goals.get(goalId);
    if (!goal) throw new Error(`goal not found: ${goalId}`);
    if (goal.status !== 'pending' && goal.status !== 'paused' && goal.status !== 'failed') {
      throw new Error(`goal status '${goal.status}' does not accept a new run`);
    }
    const run = Runs.create(goalId);
    Goals.updateStatus(goalId, 'executing');
    RunEvents.append(run.id, 'run.created', { goalId, by: actor });
    Audit.append(actor, 'run.start', run.id, { goalId });

    if (!this.store.acquireRun(run.id)) {
      logger.warn({ runId: run.id }, 'could not acquire lease immediately — supervisor will retry');
    } else {
      this.spawn(run, goal);
    }
    return run;
  }

  async pauseRun(runId: string, actor: string): Promise<void> {
    const handle = this.sessions.get(runId);
    const run = Runs.get(runId);
    if (!run) throw new Error('run not found');
    if (isTerminal(run.status)) return;
    if (handle) handle.abort.abort('pause');
    const updated = this.store.transitionRun(run, 'paused');
    Audit.append(actor, 'run.pause', runId, {});
    this.emitEvent({ kind: 'session.paused', runId });
    this.sessions.delete(runId);
    this.store.releaseRun(runId);
    Goals.updateStatus(updated.goalId, 'paused');
  }

  async resumeRun(runId: string, actor: string): Promise<AgentRun> {
    const run = Runs.get(runId);
    if (!run) throw new Error('run not found');
    if (run.status !== 'paused' && run.status !== 'failed') {
      throw new Error(`cannot resume run in status '${run.status}'`);
    }
    const updated = this.store.transitionRun(run, 'ready');
    Audit.append(actor, 'run.resume', runId, {});
    if (this.store.acquireRun(runId)) {
      const goal = Goals.get(updated.goalId);
      if (goal) {
        Goals.updateStatus(goal.id, 'executing');
        this.spawn(updated, goal);
      }
    }
    return updated;
  }

  async stopRun(runId: string, actor: string): Promise<void> {
    const handle = this.sessions.get(runId);
    const run = Runs.get(runId);
    if (!run) throw new Error('run not found');
    if (isTerminal(run.status)) return;
    if (handle) handle.abort.abort('stop');

    const next = this.store.transitionRun(run, 'draining');
    setTimeout(() => {
      const cur = Runs.get(runId);
      if (cur && !isTerminal(cur.status)) {
        this.store.transitionRun(cur, 'stopped', { endedAt: Date.now() });
      }
    }, 500);
    Audit.append(actor, 'run.stop', runId, {});
    this.emitEvent({ kind: 'session.stopped', runId });
    this.sessions.delete(runId);
    this.store.releaseRun(runId);
    Goals.updateStatus(next.goalId, 'cancelled');
  }

  async retryStep(runId: string, actor: string): Promise<AgentRun> {
    const run = Runs.get(runId);
    if (!run) throw new Error('run not found');
    Audit.append(actor, 'run.retry', runId, {});
    Runs.incrementAttempt(runId);
    return this.resumeRun(runId, actor);
  }

  listSessions(): SessionHandle[] {
    return [...this.sessions.values()];
  }

  metrics(): SessionMetrics {
    let active = 0;
    let paused = 0;
    let idle = 0;
    let leased = 0;
    for (const s of this.sessions.values()) {
      switch (s.status) {
        case 'active':
          active++;
          break;
        case 'paused':
          paused++;
          break;
        case 'idle':
          idle++;
          break;
        case 'leased':
          leased++;
          break;
        default:
          break;
      }
    }
    const all = Runs.list({ limit: 1000 });
    const succeeded = all.filter((r) => r.status === 'succeeded').length;
    const failed = all.filter((r) => r.status === 'failed').length;
    return { active, paused, idle, leased, succeeded, failed };
  }

  // ---------- Internal ----------

  private spawn(run: AgentRun, goal: Goal): void {
    if (this.sessions.has(run.id)) {
      logger.warn({ runId: run.id }, 'spawn ignored — session already exists');
      return;
    }
    const abort = new AbortController();
    const handle: SessionHandle = {
      runId: run.id,
      goalId: run.goalId,
      abort,
      startedAt: Date.now(),
      lastHeartbeatAt: Date.now(),
      status: 'active',
    };
    this.sessions.set(run.id, handle);

    const startedRun = this.store.transitionRun(run, 'leased', { startedAt: Date.now() });
    const activeRun = this.store.transitionRun(startedRun, 'active');
    this.emitEvent({ kind: 'session.started', run: activeRun });

    queueMicrotask(async () => {
      try {
        const result = await this.executor.runOnce({
          run: activeRun,
          goal,
          signal: abort.signal,
          onProgress: (e) => this.emit('progress', e),
        });

        const cur = Runs.get(run.id);
        if (!cur) return;
        if (result.status === 'paused') {
          // already transitioned to paused via pauseRun()
          return;
        }
        const final = result.status;
        const next = this.store.transitionRun(cur, final, {
          endedAt: Date.now(),
          errorMessage: result.reason ?? null,
        });
        Goals.updateStatus(next.goalId, final);
        if (final === 'succeeded') {
          Checkpoints.take({
            goalId: next.goalId,
            runId: next.id,
            stepId: next.currentStepId ?? next.id,
            reason: 'forced',
            payload: { final: true, status: 'succeeded' },
          });
        }
        this.emitEvent({ kind: 'session.completed', runId: run.id, status: final, reason: result.reason });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        logger.error({ err, runId: run.id }, 'executor crashed');
        const cur = Runs.get(run.id);
        if (cur && !isTerminal(cur.status)) {
          this.store.transitionRun(cur, 'failed', { endedAt: Date.now(), errorMessage: reason });
          Goals.updateStatus(cur.goalId, 'failed');
          this.emitEvent({ kind: 'session.completed', runId: run.id, status: 'failed', reason });
        }
      } finally {
        this.sessions.delete(run.id);
        this.store.releaseRun(run.id);
      }
    });
  }

  private emitEvent(event: SessionEvent): void {
    this.emit('event', event);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const handle of this.sessions.values()) {
        const ok = this.store.heartbeat(handle.runId);
        if (!ok) {
          logger.warn({ runId: handle.runId }, 'heartbeat failed — lease lost');
          handle.abort.abort('lease_lost');
        } else {
          handle.lastHeartbeatAt = now;
          this.emitEvent({ kind: 'session.heartbeat', runId: handle.runId, at: now });
        }
      }
    }, config.session.heartbeatIntervalMs).unref();
  }

  private startSupervisor(): void {
    this.supervisorTimer = setInterval(() => {
      if (this.stopping) return;
      const slots = config.session.maxConcurrentRuns - this.sessions.size;
      if (slots <= 0) return;
      const candidates = this.store.findStealable(slots);
      for (const runId of candidates) {
        if (this.sessions.has(runId)) continue;
        const run = Runs.get(runId);
        if (!run || isTerminal(run.status)) continue;
        if (!this.store.acquireRun(runId)) continue;
        const goal = Goals.get(run.goalId);
        if (!goal) continue;
        if (run.status === 'paused' || run.status === 'stopped') {
          this.store.releaseRun(runId);
          continue;
        }
        const refreshed = run.status === 'ready' ? run : this.store.transitionRun(run, 'ready');
        this.spawn(refreshed, goal);
      }
    }, config.session.supervisorPollIntervalMs).unref();
  }

  private recoverOrphans(): void {
    const orphans = Runs.list({ status: 'active' });
    for (const r of orphans) {
      const updated = this.store.transitionRun(r, 'orphaned');
      RunEvents.append(r.id, 'recovery.marked_orphan', { previousHolder: r.id });
      this.emitEvent({ kind: 'session.orphaned', runId: updated.id });
    }
  }
}
