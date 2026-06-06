import { logger } from '../logger.js';
import {
  Approvals,
  Audit,
  Checkpoints,
  Episodic,
  Goals,
  RunEvents,
  Runs,
  Steps,
} from '../memory/memory.js';
import type { AgentRun, Goal, Step } from '../memory/memory.js';
import { tools } from '../tools/index.js';
import type { ExecutorAdapter, ExecutorRunOpts } from '../session/index.js';
import { Planner } from './planner.js';
import { Verifier } from './verifier.js';
import type { PlannedStep, PlannerResult, VerifierResult } from './types.js';

const REPLAN_INTERVAL = 5; // re-plan strategy every N executed steps

export class GoalExecutor implements ExecutorAdapter {
  constructor(
    private readonly planner = new Planner(),
    private readonly verifier = new Verifier(),
  ) {}

  async runOnce(
    opts: ExecutorRunOpts,
  ): Promise<{ status: 'succeeded' | 'failed' | 'paused'; reason?: string }> {
    const { run, goal, signal, scopeNote, onProgress } = opts;
    logger.info({ runId: run.id, goalId: goal.id }, 'executor starting');
    Goals.updateStatus(goal.id, 'planning');

    const startedAt = Date.now();
    let stepBudgetLeft = goal.budget.maxSteps - run.stepsExecuted;
    let tokenBudgetLeft = goal.budget.maxTokens - run.tokensUsed;
    let costBudgetLeft = (goal.budget.maxCostUsd ?? Number.POSITIVE_INFINITY) - run.costUsd;

    Goals.updateStatus(goal.id, 'executing');

    while (true) {
      if (signal.aborted) {
        return { status: 'paused', reason: String(signal.reason ?? 'aborted') };
      }
      if (stepBudgetLeft <= 0) return { status: 'failed', reason: 'budget: max_steps exhausted' };
      if (tokenBudgetLeft <= 0) return { status: 'failed', reason: 'budget: max_tokens exhausted' };
      if (costBudgetLeft <= 0) return { status: 'failed', reason: 'budget: max_cost exhausted' };
      const elapsedSec = (Date.now() - startedAt) / 1000;
      if (elapsedSec > goal.budget.maxWallClockSeconds)
        return { status: 'failed', reason: 'budget: wallclock exhausted' };

      const history = Steps.listByRun(run.id);
      const plan = await this.callPlanner({ goal, run: this.refreshRun(run), history, signal, scopeNote });
      tokenBudgetLeft -= estimatePlannerTokens(plan);

      // Persist plan as a planning event in the episodic log
      Episodic.append({
        goalId: goal.id,
        runId: run.id,
        stepId: null,
        kind: 'plan',
        content: JSON.stringify(plan),
        tokens: 0,
      });
      RunEvents.append(run.id, 'plan.generated', { steps: plan.steps.length, complete: plan.complete });

      if (plan.complete || plan.steps.length === 0) {
        const verdict = await this.callVerifier(goal, Steps.listByRun(run.id), signal);
        RunEvents.append(run.id, 'verify.result', verdict as unknown as Record<string, unknown>);
        if (verdict.satisfied) return { status: 'succeeded', reason: verdict.reasons.join('; ') };
        if (plan.steps.length === 0) {
          return {
            status: 'failed',
            reason: `planner exited without a plan; unmet: ${(verdict.unmet ?? []).join('; ')}`,
          };
        }
        // not satisfied but planner thinks complete — let it try one more iteration
      }

      // Execute up to REPLAN_INTERVAL steps from the plan
      const slice = plan.steps.slice(0, REPLAN_INTERVAL);
      let anyApprovalPending = false;

      for (const planned of slice) {
        if (signal.aborted) return { status: 'paused', reason: String(signal.reason ?? 'aborted') };

        const result = await this.executeStep({ goal, run, planned, signal, onProgress });
        if (result.kind === 'approval_pending') {
          anyApprovalPending = true;
          break;
        }
        if (result.kind === 'denied') {
          RunEvents.append(run.id, 'policy.denied', { tool: planned.tool });
          continue;
        }
        if (result.kind === 'aborted') return { status: 'paused', reason: 'aborted-mid-step' };

        stepBudgetLeft--;
        tokenBudgetLeft -= result.tokensUsed;
        costBudgetLeft -= result.costUsd;

        if (result.kind === 'failed') {
          // back to planner; one transient failure is fine
          break;
        }
      }

      if (anyApprovalPending) {
        Goals.updateStatus(goal.id, 'awaiting_approval');
        return { status: 'paused', reason: 'awaiting_approval' };
      }

      // After each batch, run a quick verification pass.
      const verdict = await this.callVerifier(goal, Steps.listByRun(run.id), signal);
      RunEvents.append(run.id, 'verify.batch', verdict as unknown as Record<string, unknown>);
      if (verdict.satisfied) return { status: 'succeeded', reason: verdict.reasons.join('; ') };
    }
  }

  private async callPlanner(args: {
    goal: Goal;
    run: AgentRun;
    history: Step[];
    signal: AbortSignal;
    scopeNote?: string;
  }): Promise<PlannerResult> {
    try {
      return await this.planner.plan(args);
    } catch (err) {
      logger.error({ err, runId: args.run.id }, 'planner failed');
      RunEvents.append(args.run.id, 'plan.error', { error: err instanceof Error ? err.message : String(err) });
      return { rationale: 'planner error', steps: [], complete: false };
    }
  }

  private async callVerifier(goal: Goal, steps: Step[], signal: AbortSignal): Promise<VerifierResult> {
    try {
      return await this.verifier.verify({ goal, steps, signal });
    } catch (err) {
      logger.error({ err, goalId: goal.id }, 'verifier failed');
      return {
        satisfied: false,
        reasons: ['verifier crashed'],
        unmet: [err instanceof Error ? err.message : String(err)],
      };
    }
  }

  private refreshRun(run: AgentRun): AgentRun {
    return Runs.get(run.id) ?? run;
  }

  private async executeStep(args: {
    goal: Goal;
    run: AgentRun;
    planned: PlannedStep;
    signal: AbortSignal;
    onProgress?: (e: { kind: string; payload: unknown }) => void;
  }): Promise<
    | { kind: 'succeeded'; tokensUsed: number; costUsd: number }
    | { kind: 'failed'; tokensUsed: number; costUsd: number; error: string }
    | { kind: 'approval_pending' }
    | { kind: 'denied' }
    | { kind: 'aborted' }
  > {
    const { goal, run, planned, signal, onProgress } = args;

    // Policy: tool must be allowed
    const allowList = goal.policy.allowedTools;
    if (!allowList.includes('*') && !allowList.includes(planned.tool)) {
      logger.warn({ runId: run.id, tool: planned.tool }, 'tool denied by goal policy');
      return { kind: 'denied' };
    }

    const tool = tools.get(planned.tool);
    if (!tool) {
      logger.warn({ tool: planned.tool }, 'tool not registered');
      return { kind: 'denied' };
    }

    // Approval gate: if tool requires approval and no approved record exists, create one and pause.
    const needsApproval =
      goal.policy.requireApprovalFor?.includes(planned.tool) ||
      (tool.dangerous && goal.policy.requireApprovalFor !== undefined);

    const stepIndex = Steps.countByRun(run.id);
    const step = Steps.create({
      runId: run.id,
      goalId: goal.id,
      index: stepIndex,
      tier: 'tactical',
      tool: planned.tool,
      args: planned.args,
      rationale: planned.rationale,
    });
    Runs.updateStatus(run.id, run.status, { currentStepId: step.id });

    if (needsApproval) {
      const approval = Approvals.create({
        runId: run.id,
        stepId: step.id,
        reason: `Tool ${planned.tool} requires approval per goal policy.`,
        requestedRole: 'operator',
      });
      RunEvents.append(run.id, 'approval.requested', { approvalId: approval.id, stepId: step.id });
      onProgress?.({ kind: 'approval_pending', payload: { stepId: step.id, approvalId: approval.id } });
      return { kind: 'approval_pending' };
    }

    Steps.updateStart(step.id);
    onProgress?.({ kind: 'step.started', payload: step });

    // Pre-tool checkpoint for dangerous tools
    if (tool.dangerous) {
      Checkpoints.take({
        goalId: goal.id,
        runId: run.id,
        stepId: step.id,
        reason: 'pre_dangerous_tool',
        payload: { planned, runState: this.refreshRun(run) },
      });
    }

    try {
      const result = await tool.invoke(planned.args, {
        goalId: goal.id,
        runId: run.id,
        stepId: step.id,
        signal,
      });
      const tokensUsed = 0;
      const costUsd = 0;
      Steps.updateResult(step.id, 'succeeded', result.output, tokensUsed, null);
      Episodic.append({
        goalId: goal.id,
        runId: run.id,
        stepId: step.id,
        kind: 'tool_result',
        content: JSON.stringify(result.output).slice(0, 4000),
        tokens: 0,
      });
      Runs.incrementProgress(run.id, 1, tokensUsed, costUsd);
      RunEvents.append(run.id, 'step.succeeded', { stepId: step.id, tool: planned.tool });
      Audit.append('agent', 'step.execute', step.id, { tool: planned.tool, status: 'succeeded' });

      // Post-step checkpoint
      Checkpoints.take({
        goalId: goal.id,
        runId: run.id,
        stepId: step.id,
        reason: 'step_ok',
        payload: {
          stepIndex: stepIndex,
          tool: planned.tool,
          args: planned.args,
          output: result.output,
        },
      });
      onProgress?.({ kind: 'step.succeeded', payload: { stepId: step.id, tool: planned.tool } });
      return { kind: 'succeeded', tokensUsed, costUsd };
    } catch (err) {
      if (signal.aborted) {
        Steps.updateResult(step.id, 'failed', { aborted: true }, 0, 'aborted');
        return { kind: 'aborted' };
      }
      const message = err instanceof Error ? err.message : String(err);
      Steps.updateResult(step.id, 'failed', { error: message }, 0, message);
      Runs.incrementProgress(run.id, 1, 0, 0);
      RunEvents.append(run.id, 'step.failed', { stepId: step.id, error: message });
      Audit.append('agent', 'step.execute', step.id, { tool: planned.tool, status: 'failed', error: message });
      onProgress?.({ kind: 'step.failed', payload: { stepId: step.id, error: message } });
      return { kind: 'failed', tokensUsed: 0, costUsd: 0, error: message };
    }
  }
}

function estimatePlannerTokens(plan: PlannerResult): number {
  // Cheap upper-bound estimate when the LLM didn't report token usage.
  return 500 + plan.steps.length * 200;
}
