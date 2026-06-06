import type { AgentRun, RunStatus } from '../memory/types.js';

export interface SessionHandle {
  runId: string;
  goalId: string;
  abort: AbortController;
  startedAt: number;
  lastHeartbeatAt: number;
  status: RunStatus;
}

export interface SessionMetrics {
  active: number;
  paused: number;
  idle: number;
  leased: number;
  succeeded: number;
  failed: number;
}

export type SessionEvent =
  | { kind: 'session.started'; run: AgentRun }
  | { kind: 'session.heartbeat'; runId: string; at: number }
  | { kind: 'session.paused'; runId: string }
  | { kind: 'session.resumed'; runId: string }
  | { kind: 'session.stopped'; runId: string }
  | { kind: 'session.completed'; runId: string; status: 'succeeded' | 'failed'; reason?: string }
  | { kind: 'session.orphaned'; runId: string }
  | { kind: 'step.completed'; runId: string; stepId: string; status: string }
  | { kind: 'step.failed'; runId: string; stepId: string; error: string };

export type SessionEventListener = (event: SessionEvent) => void;
