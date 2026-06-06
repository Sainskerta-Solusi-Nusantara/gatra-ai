import type { RunStatus } from '../memory/types.js';

/**
 * Allowed transitions for the run state machine. Enforced by SessionManager to
 * prevent invalid transitions (e.g., resuming a succeeded run).
 */
export const ALLOWED_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  ready:      ['leased', 'stopped'],
  leased:     ['active', 'ready', 'orphaned'],
  active:     ['idle', 'paused', 'draining', 'orphaned', 'succeeded', 'failed'],
  idle:       ['active', 'paused', 'draining', 'orphaned'],
  paused:     ['ready', 'active', 'stopped'],
  draining:   ['stopped', 'succeeded', 'failed'],
  stopped:    [],
  orphaned:   ['ready', 'stopped'],
  succeeded:  [],
  failed:     ['ready'], // retry
};

export function canTransition(from: RunStatus, to: RunStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(status: RunStatus): boolean {
  return status === 'stopped' || status === 'succeeded' || status === 'failed';
}
