const TOKEN_KEY = 'gatra.token';

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

export function setToken(t: string): void {
  localStorage.setItem(TOKEN_KEY, t);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'x-actor': 'dashboard',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  fleetStatus: () => request<FleetStatus>('GET', '/fleet/status'),
  me: () => request<{ user: AuthIdentity | null }>('GET', '/auth/me'),
  login: (waNumber: string) => request<LoginResponse>('POST', '/auth/login', { waNumber }),
  // ---- RBAC: departments ----
  listDepartments: () => request<{ items: Department[] }>('GET', '/departments'),
  createDepartment: (input: { name: string; description?: string | null }) =>
    request<Department>('POST', '/departments', input),
  updateDepartment: (id: string, input: { name?: string; description?: string | null }) =>
    request<Department>('PUT', `/departments/${id}`, input),
  deleteDepartment: (id: string) => request<{ ok: boolean }>('DELETE', `/departments/${id}`),
  // ---- RBAC: users ----
  listUsers: (params: { departmentId?: string; jabatan?: string; active?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.departmentId) q.set('departmentId', params.departmentId);
    if (params.jabatan) q.set('jabatan', params.jabatan);
    if (params.active !== undefined) q.set('active', String(params.active));
    return request<{ items: RbacUser[] }>('GET', `/users?${q.toString()}`);
  },
  createUser: (input: CreateUserInput) => request<RbacUser>('POST', '/users', input),
  updateUser: (id: string, input: Partial<CreateUserInput>) =>
    request<RbacUser>('PUT', `/users/${id}`, input),
  deleteUser: (id: string) => request<{ ok: boolean }>('DELETE', `/users/${id}`),
  // ---- RBAC: folder permissions ----
  listPermissions: () => request<{ items: FolderPermission[] }>('GET', '/rbac/permissions'),
  grantPermission: (input: { departmentId: string; folderPath: string; accessLevel: 'read' | 'write' | 'admin' }) =>
    request<FolderPermission>('POST', '/rbac/permissions', input),
  revokePermission: (departmentId: string, folderPath: string) => {
    const q = new URLSearchParams({ departmentId, folderPath });
    return request<{ ok: boolean }>('DELETE', `/rbac/permissions?${q.toString()}`);
  },
  rbacCheck: (wa: string, folder: string, action: 'read' | 'write' | 'admin') => {
    const q = new URLSearchParams({ folder, action });
    return request<RbacCheckResult>('GET', `/rbac/check/${encodeURIComponent(wa)}?${q.toString()}`);
  },
  // ---- Goals ----
  listGoals: (params: { status?: string; departmentId?: string } = {}) => {
    const q = new URLSearchParams(params as Record<string, string>);
    return request<{ items: Goal[] }>('GET', `/goals?${q.toString()}`);
  },
  getGoal: (id: string) => request<{ goal: Goal; runs: AgentRun[]; facts: SemanticFact[] }>('GET', `/goals/${id}`),
  createGoal: (input: CreateGoalInput) => request<Goal>('POST', '/goals', input),
  startRun: (goalId: string) => request<AgentRun>('POST', `/goals/${goalId}/start`),
  cancelGoal: (goalId: string) => request<{ ok: boolean }>('POST', `/goals/${goalId}/cancel`),
  listRuns: (params: { status?: string; goalId?: string; departmentId?: string } = {}) => {
    const q = new URLSearchParams(params as Record<string, string>);
    return request<{ items: AgentRun[] }>('GET', `/runs?${q.toString()}`);
  },
  getRun: (id: string) =>
    request<{ run: AgentRun; steps: Step[]; checkpoints: CheckpointSummary[] }>('GET', `/runs/${id}`),
  runTimeline: (id: string) => request<{ events: RunEvent[] }>('GET', `/runs/${id}/timeline`),
  pauseRun: (id: string) => request<{ ok: boolean }>('POST', `/runs/${id}/pause`),
  resumeRun: (id: string) => request<AgentRun>('POST', `/runs/${id}/resume`),
  stopRun: (id: string) => request<{ ok: boolean }>('POST', `/runs/${id}/stop`),
  retryRun: (id: string) => request<AgentRun>('POST', `/runs/${id}/retry`),
  verifyChain: (id: string) => request<{ ok: boolean; broken?: string }>('GET', `/runs/${id}/checkpoints/verify`),
  rollback: (cpId: string) => request<{ ok: boolean }>('POST', `/checkpoints/${cpId}/rollback`),
  listApprovals: () => request<{ items: Approval[] }>('GET', '/approvals'),
  decideApproval: (id: string, decision: 'approved' | 'rejected', comment?: string) =>
    request<{ ok: boolean }>('POST', `/approvals/${id}/decide`, { decision, comment }),
  listAudit: (q: { q?: string; actor?: string; action?: string }) =>
    request<{ items: AuditEvent[] }>('GET', `/audit?${new URLSearchParams(q as Record<string, string>).toString()}`),
  listTools: () => request<{ items: ToolInfo[] }>('GET', '/tools'),
  // ---- Resignation / offboarding ----
  resign: (waNumber: string, reason?: string) =>
    request<{ ok: boolean; resignedAt: number; user: { id: string; waNumber: string; name: string; isActive: boolean } }>(
      'POST',
      '/resign',
      { waNumber, reason },
    ),
  adminRemoveUser: (waNumber: string, removedByWa: string) =>
    request<{ ok: boolean; removedAt: number; removedBy: string; user: { id: string; waNumber: string; name: string; isActive: boolean } }>(
      'POST',
      '/admin/remove-user',
      { waNumber, removedByWa },
    ),
  listResignedUsers: () => request<{ items: ResignedUser[] }>('GET', '/admin/resigned-users'),
};

// ---------- Types (mirror src/memory/types.ts) ----------

export type GoalStatus =
  | 'pending'
  | 'planning'
  | 'executing'
  | 'paused'
  | 'awaiting_approval'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

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

export interface Goal {
  id: string;
  title: string;
  spec: {
    objective: string;
    successCriteria: { kind: string; [k: string]: unknown }[];
    failureCriteria?: { kind: string; [k: string]: unknown }[];
    language?: string;
  };
  budget: { maxSteps: number; maxTokens: number; maxCostUsd?: number; maxWallClockSeconds: number };
  policy: { allowedTools: string[]; requireApprovalFor?: string[] };
  status: GoalStatus;
  createdBy: string;
  departmentId: string | null;
  createdAt: number;
  updatedAt: number;
}

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

export interface Step {
  id: string;
  runId: string;
  goalId: string;
  index: number;
  tool: string;
  args: unknown;
  rationale: string;
  status: string;
  result: unknown;
  critique: string | null;
  tokensUsed: number;
  startedAt: number | null;
  endedAt: number | null;
}

export interface CheckpointSummary {
  id: string;
  stepId: string;
  parent: string | null;
  reason: string;
  takenAt: number;
  sizeBytes: number;
  stateHash: string;
}

export interface RunEvent {
  id: number;
  runId: string;
  ts: number;
  kind: string;
  meta: Record<string, unknown>;
}

export interface Approval {
  id: string;
  runId: string;
  stepId: string;
  reason: string;
  requestedRole: string;
  requestedAt: number;
  decision: 'pending' | 'approved' | 'rejected';
  decidedAt: number | null;
  decidedBy: string | null;
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

export interface SemanticFact {
  id: string;
  scope: string;
  scopeId: string;
  key: string;
  value: string;
  confidence: number;
  source: string;
}

export interface ToolInfo {
  name: string;
  description: string;
  dangerous: boolean;
}

export interface FleetStatus {
  instance: string;
  goals: Record<string, number>;
  sessions: { active: number; paused: number; idle: number; leased: number; succeeded: number; failed: number };
  pendingApprovals: number;
  tools: ToolInfo[];
  user?: AuthIdentity | null;
}

// ---------- RBAC ----------

export type JabatanLevel = 'staff' | 'supervisor' | 'manager' | 'direktur' | 'admin_system';
export type AccessLevel = 'read' | 'write' | 'admin';

export interface AuthIdentity {
  kind: 'user' | 'system';
  id: string;
  waNumber: string | null;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  jabatan: JabatanLevel;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  createdAt: number;
}

export interface RbacUser {
  id: string;
  waNumber: string;
  name: string;
  departmentId: string;
  jabatan: JabatanLevel;
  isActive: boolean;
  resignedAt: number | null;
  resignationReason: string | null;
  removedBy: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ResignedUser {
  id: string;
  waNumber: string;
  name: string;
  departmentId: string;
  departmentName: string | null;
  jabatan: JabatanLevel;
  resignedAt: number;
  resignationReason: string | null;
  removedBy: string | null;
}

export interface FolderPermission {
  id: string;
  departmentId: string;
  folderPath: string;
  accessLevel: AccessLevel;
  createdAt: number;
}

export interface CreateUserInput {
  waNumber: string;
  name: string;
  departmentId: string;
  jabatan: JabatanLevel;
  isActive?: boolean;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  user: {
    id: string;
    waNumber: string;
    name: string;
    jabatan: JabatanLevel;
    departmentId: string | null;
    departmentName: string | null;
  };
}

export interface RbacCheckResult {
  allowed: boolean;
  reason: string;
  folder?: string;
  action?: AccessLevel;
  user?: {
    id: string;
    name: string;
    waNumber: string;
    jabatan: JabatanLevel;
    departmentId: string | null;
    departmentName: string | null;
  };
}

export interface CreateGoalInput {
  title: string;
  spec: Goal['spec'];
  budget?: Partial<Goal['budget']>;
  policy?: Partial<Goal['policy']>;
}
