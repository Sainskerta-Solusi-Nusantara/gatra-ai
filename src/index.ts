/**
 * GATRA AI — main package entry.
 * Importing this module starts the HTTP/WebSocket server when invoked directly
 * (e.g. `node dist/index.js`). For programmatic use, prefer `createServer()`.
 */
export { config } from './config.js';
export type { Config } from './config.js';
export { logger } from './logger.js';
export type { Logger } from './logger.js';

export { createServer, start } from './api/server.js';
export type { ServerHandle } from './api/server.js';

export { buildRoutes, attachWebSocket, requireToken } from './api/index.js';

export { SessionManager } from './session/index.js';
export type {
  ExecutorAdapter,
  ExecutorRunOpts,
  SessionEvent,
  SessionHandle,
  SessionMetrics,
} from './session/index.js';

export { GoalExecutor, Planner, Verifier } from './orchestrator/index.js';
export type {
  PlannedStep,
  PlannerResult,
  CriticResult,
  VerifierResult,
} from './orchestrator/index.js';

export {
  Goals,
  Runs,
  Steps,
  Leases,
  RunEvents,
  Episodic,
  Semantic,
  Approvals,
  Audit,
  Checkpoints,
  migrate,
  openDb,
  withTx,
} from './memory/memory.js';
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
} from './memory/memory.js';

export { tools } from './tools/index.js';
export type { Tool, ToolContext, ToolResult } from './tools/index.js';

export { getLLMProvider, setLLMProvider } from './llm/index.js';
export type { LLMProvider, LLMRequest, LLMResponse, LLMMessage } from './llm/index.js';

import { start as _start } from './api/server.js';
import { logger as _logger } from './logger.js';

const isMain = (() => {
  try {
    return import.meta.url === `file://${process.argv[1]}`;
  } catch {
    return false;
  }
})();

if (isMain) {
  _start().catch((err) => {
    _logger.error({ err }, 'failed to start gatra-ai');
    process.exit(1);
  });
}
