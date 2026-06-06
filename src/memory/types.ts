// Memory & Checkpoint types. Mirrors the docs/FEATURE-DESIGN-3 schema, simplified for v1.

export type Criterion =
  | { kind: 'observation_matches'; field: string; predicate: string }
  | { kind: 'tool_output_contains'; tool: string; pattern: string }
  | { kind: 'operator_approves'; role: string }
  | { kind: 'llm_judge'; rubric: string };

export interface GoalSpec {
  objective: string;
  successCriteria: Criterion[];
  failureCriteria?: Criterion[];
  context?: Record<string, unknown>;
  language?: 'id-ID' | 'en-US';
}

export interface GoalBudget {
  maxSteps: number;
  maxTokens: number;
  maxCostUsd?: number;
  maxWallClockSeconds: number;
}

export interface GoalPolicy {
  allowedTools: string[];
  deniedDomains?: string[];
  requireApprovalFor?: string[];
}

export type GoalStatus =
  | 'pending'
  | 'planning'
  | 'executing'
  | 'paused'
  | 'awaiting_approval'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export interface Goal {
  id: string;
  title: string;
  spec: GoalSpec;
  budget: GoalBudget;
  policy: GoalPolicy;
  status: GoalStatus;
  createdBy: string;
  departmentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export type RunStatus =
  | 'ready'
  | 'leased'
  | 'active'
  | 'idle'
  | 'paused'
  | 'draining'
  | 'stopped'
  | 'orphaned'
  | 'succeeded'
  | 'failed';

export interface AgentRun {
  id: string;
  goalId: string;
  status: RunStatus;
  currentStepId: string | null;
  lastCheckpointId: string | null;
  attempt: number;
  stepsExecuted: number;
  tokensUsed: number;
  costUsd: number;
  startedAt: number | null;
  endedAt: number | null;
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
}

export type StepStatus =
  | 'planned'
  | 'executing'
  | 'awaiting_approval'
  | 'succeeded'
  | 'failed'
  | 'skipped';

export interface Step {
  id: string;
  runId: string;
  goalId: string;
  index: number;
  tier: 'strategic' | 'tactical';
  tool: string;
  args: unknown;
  rationale: string;
  status: StepStatus;
  result: unknown;
  critique: string | null;
  tokensUsed: number;
  startedAt: number | null;
  endedAt: number | null;
  createdAt: number;
}

export interface Checkpoint {
  id: string;
  goalId: string;
  runId: string;
  stepId: string;
  parentCheckpoint: string | null;
  stateHash: string;
  parentStateHash: string | null;
  payload: unknown; // serialized state blob, kept inline for single-host SQLite
  sizeBytes: number;
  takenAt: number;
  reason: 'step_ok' | 'forced' | 'pre_dangerous_tool' | 'periodic' | 'pause';
}

export interface EpisodicMemory {
  id: string;
  goalId: string;
  runId: string;
  stepId: string | null;
  kind: 'observation' | 'tool_result' | 'rationale' | 'critique' | 'plan';
  content: string;
  tokens: number;
  createdAt: number;
}

export interface SemanticFact {
  id: string;
  scope: 'goal' | 'tenant';
  scopeId: string;
  key: string;
  value: string;
  confidence: number;
  source: string; // run id that produced it
  createdAt: number;
  updatedAt: number;
}

export interface Approval {
  id: string;
  runId: string;
  stepId: string;
  reason: string;
  requestedRole: string;
  requestedAt: number;
  decidedAt: number | null;
  decidedBy: string | null;
  decision: 'pending' | 'approved' | 'rejected';
  comment: string | null;
}

export interface AuditEvent {
  id: number;
  ts: number;
  actor: string;
  action: string;
  target: string;
  meta: Record<string, unknown>;
}

export interface RunEvent {
  id: number;
  runId: string;
  ts: number;
  kind: string;
  meta: Record<string, unknown>;
}

export interface RunLease {
  runId: string;
  holderId: string;
  acquiredAt: number;
  expiresAt: number;
  heartbeatAt: number;
}
