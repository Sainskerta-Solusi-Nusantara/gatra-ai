import type { Goal, AgentRun, Step } from '../memory/memory.js';

export interface PlannedStep {
  tool: string;
  args: unknown;
  rationale: string;
}

export interface PlannerResult {
  rationale: string;
  steps: PlannedStep[];
  complete: boolean;
  reasoning?: string;
}

export interface CriticResult {
  ok: boolean;
  critique: string;
  shouldReplan?: boolean;
}

export interface VerifierResult {
  satisfied: boolean;
  reasons: string[];
  unmet?: string[];
}

export interface ExecuteContext {
  goal: Goal;
  run: AgentRun;
  signal: AbortSignal;
  onProgress?: (event: { kind: string; payload: unknown }) => void;
}

export interface StepExecutionRecord {
  step: Step;
  ok: boolean;
  error?: string;
}
