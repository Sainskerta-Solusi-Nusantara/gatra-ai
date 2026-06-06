# Feature Design #2 — Goal-Based Executor

> Status: Design v0.1
> Owner: enterprise/executor/
> Depends on: LLAR (Feature #1), Memory & Checkpoint (Feature #3), Tool registry (OpenClaw), Audit sink.

---

## 1. Problem & Motivation

OpenClaw exposes a chat-driven agent: operator sends a message, the agent picks a tool, responds. There is no first-class concept of a **goal** — a durable description of intent that the agent works towards autonomously over many steps, possibly days, with planning and replanning.

BUMN customers want declarative goals like:
- "Every Monday 06:00 WIB, pull all OJK circulars published in the last week, flag any that mention `digital banking`, and post a one-page summary to the compliance Teams channel."
- "Monitor mention of `Pertamina` in 12 news outlets; when sentiment turns sharply negative across ≥3 outlets in 6 hours, draft a comms response and queue it for PR head approval."
- "Reconcile yesterday's GL postings against the bank statement; for every mismatch over Rp 10 jt, open a ticket in Jira with the diff."

These are not single-turn requests. They are long-horizon goals with:
- a clear success criterion,
- bounded autonomy (budgets, allowed tools, escalation rules),
- a need to plan, execute, observe, and replan.

**The Goal Executor is the planner + critic + step-runner that turns a deployed goal into a stream of executed steps.**

---

## 2. Goals & Non-Goals

### Goals
1. A first-class `Goal` object with declarative success/failure criteria.
2. A planner that turns a goal into a step plan; a critic that re-evaluates after every step.
3. Bounded autonomy via explicit budgets (tokens, money, wall-clock, step count) and policy gates.
4. Replanning when steps fail, when observations contradict the plan, or when a critic signals.
5. Deterministic resume: a plan + checkpoint chain must produce the same continuation on resume.
6. Operators can edit a goal mid-flight (pause → edit → resume) without losing prior progress.

### Non-Goals
- We do not invent a new prompting framework — the planner is a structured prompt that returns a typed plan.
- We do not solve multi-agent collaboration in v1 — one goal = one run = one logical agent. Multi-agent is a v2 layer above.
- We do not implement a general planning algorithm (e.g., STRIPS); the LLM is the planner and the system constrains it.

---

## 3. Core Data Types

```ts
type Goal = {
  id: string;                        // ulid
  title: string;                     // human label
  spec: GoalSpec;                    // the declarative description
  budget: GoalBudget;
  policy: GoalPolicy;
  schedule?: CronSpec;               // optional; runs on a cadence
  status: 'pending'|'planning'|'executing'|'paused'|'succeeded'|'failed';
  createdBy: string;                 // operator id
  createdAt: number;
};

type GoalSpec = {
  objective: string;                 // natural-language goal
  successCriteria: Criterion[];      // structured assertions
  failureCriteria?: Criterion[];     // hard stops
  context?: Record<string, unknown>; // domain inputs (account ids, dates, etc.)
  language?: 'id-ID'|'en-US';        // planner output language
};

type Criterion =
  | { kind: 'observation_matches'; field: string; predicate: string }
  | { kind: 'tool_output_contains'; tool: string; pattern: string }
  | { kind: 'operator_approves'; role: string }
  | { kind: 'llm_judge'; rubric: string };

type GoalBudget = {
  maxSteps: number;                  // hard cap
  maxTokens: number;                 // input+output across providers
  maxCostUsd?: number;               // optional billing cap
  maxWallClockSeconds: number;
};

type GoalPolicy = {
  allowedTools: string[];            // e.g. ["browser","http","fs.read"]
  deniedDomains?: string[];          // browser/http guardrails
  requireApprovalFor?: string[];     // tools that need operator OK each call
  escalateTo?: string;               // role to ping if blocked
};

type Plan = {
  goalId: string;
  version: number;                   // increments on replan
  strategy: string;                  // free-text strategy doc
  steps: Step[];
};

type Step = {
  id: string;                        // ulid
  planVersion: number;
  index: number;                     // position in plan
  kind: 'tool'|'reason'|'wait'|'approve';
  tool?: string;                     // when kind='tool'
  args?: Record<string, unknown>;
  rationale: string;                 // why the planner chose this
  status: 'pending'|'running'|'completed'|'failed'|'blocked';
  attempt: number;
  result?: StepResult;
};
```

Goals and plans are persisted in `e_goal` and `e_plan`/`e_step`. Plan versions are kept (not overwritten) so the dashboard can show the planner's reasoning trail over time.

---

## 4. The Executor Architecture

```
              ┌────────────────────────────────────────────────┐
              │                GOAL EXECUTOR                    │
              │                                                 │
   nextStep   │  ┌───────────┐                                  │
   ◀──────────┼──┤  Pointer  │  step queue cursor               │
              │  └─────┬─────┘                                  │
              │        │                                        │
              │        ▼                                        │
              │  ┌───────────────┐    if no more steps          │
              │  │  Step Queue   │────────────────┐             │
              │  └─────┬─────────┘                ▼             │
              │        │                  ┌───────────────┐     │
              │        │                  │   Planner     │     │
              │        ▼                  │   (LLM)       │     │
              │  ┌───────────────┐        └──────┬────────┘     │
              │  │  Policy Gate  │               │              │
              │  └─────┬─────────┘               │              │
              │        │ pass                    │              │
              │        ▼                         │              │
              │  ┌───────────────┐               │              │
   executeStep│  │ Tool Invoker  │               │              │
   ◀──────────┼──┤  (sandboxed)  │               │              │
              │  └─────┬─────────┘               │              │
              │        ▼                         │              │
              │  ┌───────────────┐               │              │
              │  │  Critic       │  ─── replan? ─┘              │
              │  │  (LLM)        │                              │
              │  └───────────────┘                              │
              └────────────────────────────────────────────────┘
```

The LLAR drives the loop by calling `executor.nextStep(run)` and `executor.executeStep(run, step)`. The executor owns:
- the step queue and planner replanning,
- the policy gate,
- the tool invocation contract,
- the critic.

---

## 5. The Planner

The planner is a structured-output LLM call. The prompt is templated:

```
SYSTEM:
  You are GATRA AI's planner. Produce a JSON plan that, when executed,
  satisfies the goal's success criteria. Each step must use only tools in
  `allowedTools`. Prefer cheap deterministic tools over LLM reasoning steps.
  Respect the budget; if the goal cannot be done within budget, return
  { error: "...", suggestion: "..." }.

INPUT:
  goal: <GoalSpec>
  budget: <GoalBudget>
  allowedTools: [...]
  toolSpecs: [...]                  // names + JSON-Schema args + descriptions
  memoryBundle: <WorkingContext>    // facts + summary of prior runs

OUTPUT:
  { strategy: string,
    steps: [
      { kind: 'tool', tool: 'fs.read', args: {...}, rationale: '...' },
      ...
    ] }
```

Constraints enforced **outside** the LLM:
- JSON Schema validation on the returned plan.
- Tools not in `allowedTools` → plan rejected, planner re-invoked once with the error.
- Steps that exceed `maxSteps` are truncated; planner is told the truncation.

The planner is **not** trusted to enforce budgets — those are server-side invariants checked by the policy gate at each step.

### 5.1. Two-tier planning

For long goals, we plan in **two tiers**:

1. **Strategic** (cheap, infrequent): "what are the 5–10 macro phases?" Updated on replan triggers.
2. **Tactical** (richer, frequent): "what are the 3–5 next concrete tool calls to advance phase N?" Re-invoked when the tactical queue empties.

This avoids replanning the whole goal after every step, while keeping the planner's tactical view fresh.

### 5.2. Replan triggers

A replan is triggered when:
- the tactical queue is empty and the goal is not yet succeeded,
- the critic returns `verdict='replan'`,
- a step fails permanently (after retries),
- a tool returns an observation tagged as `breaks_assumption`,
- the operator edits the goal,
- the budget reaches 75% (forces strategic re-evaluation: "can we still finish?").

---

## 6. The Critic

After each step result, the critic runs. It is also a structured-LLM call:

```
INPUT:
  goal: <GoalSpec>
  recentSteps: last K (default 5) steps + results
  successCriteria: [...]

OUTPUT:
  { verdict: 'ok'|'retry'|'replan'|'stop'|'success',
    confidence: 0.0..1.0,
    reasoning: '...',
    suggestedFix?: '...' }
```

Verdicts map to step transitions:
- `ok` → mark step `completed`, advance pointer.
- `retry` → bump attempt, re-enqueue same step.
- `replan` → invalidate tactical queue, call planner.
- `stop` → set goal `paused` with reason.
- `success` → check criteria; if all met, set goal `succeeded`.

The critic is a guardrail, not a second planner. Its job is to catch hallucinated success or runaway attempts.

### 6.1. Two critic modes

- **Cheap critic** (default): a small fast model, runs every step.
- **Deep critic** (every K steps or on `replan` candidate): larger model, fuller context, decides whether the cheap critic's `replan` was justified.

This bounds critic spend while keeping a strong veto on the planner's drift.

---

## 7. The Policy Gate

Every step passes through the gate **after** the planner emits it and **again** immediately before execution. Re-checking at execution time catches budget exhaustion during the wait.

```ts
function gate(step: Step, ctx: GoalContext): GateResult {
  // 1. tool allowed?
  if (!ctx.goal.policy.allowedTools.includes(step.tool)) return deny('tool_not_allowed');

  // 2. budget?
  if (ctx.spentTokens + step.estTokens > ctx.goal.budget.maxTokens) return deny('token_budget');
  if (ctx.elapsedMs + step.estMs > ctx.goal.budget.maxWallClockMs) return deny('wall_clock');
  if (ctx.stepIndex >= ctx.goal.budget.maxSteps) return deny('step_count');

  // 3. domain allowlist (browser/http)?
  if (step.tool === 'http' && hostnameDenied(step.args.url, ctx.goal.policy.deniedDomains)) {
    return deny('domain_denied');
  }

  // 4. needs explicit approval?
  if (ctx.goal.policy.requireApprovalFor?.includes(step.tool)) {
    return holdForApproval();
  }

  return allow();
}
```

`deny` → step marked `blocked`; goal goes `paused`; dashboard surfaces it.
`holdForApproval` → step status `awaiting_approval`; operator must click ✅ in dashboard before LLAR will run it.

All gate decisions write an `audit_event`.

---

## 8. Tool Invocation Contract

GATRA inherits OpenClaw's tool registry. The executor adds three things:

1. **Argument schema validation** before invoke — tools that don't ship a schema are rejected with `unsupported_tool`.
2. **Cancellation token**: every tool call receives `AbortSignal`. Tools must respect it; sandboxes wrap legacy tools that don't.
3. **Snapshot hook**: tools that hold session state (browser, shell) implement `snapshot()/restore()` so checkpoints can persist resumable cursors.

```ts
interface Tool<Args, Result> {
  name: string;
  argsSchema: JSONSchema;
  invoke(args: Args, ctx: ToolContext): Promise<Result>;
  snapshot?(ctx: ToolContext): Promise<unknown>;
  restore?(state: unknown, ctx: ToolContext): Promise<void>;
}
```

Tools without `snapshot/restore` are treated as **idempotent re-runners** on resume — they will be invoked again with the same args; the planner must design with that in mind, and the registry tags such tools as `idempotent` or `non-idempotent` so the planner avoids non-idempotent non-snapshottable tools in long plans.

---

## 9. Budget Enforcement

Budgets are tracked in `e_goal_budget_state` (one row per goal):

```sql
CREATE TABLE e_goal_budget_state (
  goal_id           TEXT PRIMARY KEY REFERENCES e_goal(id),
  spent_tokens      INTEGER NOT NULL DEFAULT 0,
  spent_cost_usd    NUMERIC NOT NULL DEFAULT 0,
  elapsed_ms        INTEGER NOT NULL DEFAULT 0,
  steps_used        INTEGER NOT NULL DEFAULT 0,
  updated_at        INTEGER NOT NULL
);
```

Updates happen in the same transaction as the step transition. The gate reads this row before each step. Atomicity means the gate is never tricked by a race between two parallel callers (which the LLAR's single-step invariant already prevents within a run).

Cost is tracked via per-provider price tables stored under `enterprise/executor/pricing.yaml`. Prices are updated on release; operators can override.

---

## 10. Determinism & Resume

For resume to be safe, the executor must produce the same continuation given the same checkpoint. We get this with:

1. **Plans are immutable**: once a plan version is written, it is not edited. Replans create a new version.
2. **Step IDs are stable**: assigned at plan write time, not at execution.
3. **LLM calls are seeded**: the planner and critic receive an explicit `seed` derived from the goal id, plan version, and step index. Providers that don't honour seeds still produce *similar* enough output that we tolerate cosmetic drift.
4. **Memory snapshots are content-hashed**: the working context at resume time is identical to the one captured in the checkpoint.

On resume:
- Load latest checkpoint → working memory + tool cursors restored.
- Find the next `pending` step at the plan version active when the checkpoint was taken.
- If the plan has been superseded (operator edited the goal), planner produces a new plan version starting from the resumed memory state; old plan is archived.

---

## 11. Approvals & Escalation

GATRA AI is designed for autonomy *within* limits. The limits are explicit:

- `policy.requireApprovalFor: ['payments.transfer']` — every step that calls `payments.transfer` halts at `awaiting_approval` until an operator with role `goal_owner` clicks approve.
- `policy.escalateTo: 'compliance_lead'` — when a goal pauses due to a denial, the dashboard fires a notification to that role's inbox (email, Slack, Teams).
- Approvals are time-boxed: default 24h to approve; otherwise the goal auto-fails with `reason=approval_timeout`.

Approval decisions are also audited and the operator's identity is bound to the step.

---

## 12. Scheduling

Goals may be one-shot or recurring (via OpenClaw cron):

```yaml
goal: weekly-ojk-monitor
schedule:
  cron: "0 6 * * 1"       # Mondays 06:00
  tz: "Asia/Jakarta"
behavior:
  ifPriorRunning: 'skip'  # 'skip' | 'queue' | 'cancel_prior'
```

Each cron firing creates a new `AgentRun` against the same `Goal` — the goal is the durable template, the run is the durable attempt. Memory carries across runs (a recurring goal accumulates knowledge); checkpoints are per-run.

---

## 13. Operator UX (briefly — full design in Feature #4)

The dashboard exposes:
- A **Goal Designer**: form for the spec + budget + policy, with a "dry run" that shows what the planner would propose without executing.
- A **Run Timeline**: every step, its rationale, its tool call, its result, its critic verdict.
- An **Approvals Inbox**: pending approvals across all goals.
- A **Replan Diff** view: when the planner replans, show the diff between plan versions and the trigger that caused it.

---

## 14. Observability

Per-goal metrics:
- `gatra_goal_status{status="executing|paused|..."}` gauge
- `gatra_goal_steps_total` counter
- `gatra_goal_tokens_spent` gauge
- `gatra_goal_replan_total{trigger="critic|step_fail|operator|budget"}` counter
- `gatra_goal_approval_pending` gauge

Logs include planner prompt and response payloads when the dashboard's "trace" toggle is on (per goal, default off, audited).

---

## 15. Failure Modes

| Failure | Behaviour |
|---------|-----------|
| Planner returns invalid JSON | One retry with the validation error appended; second failure → goal `failed (planner_invalid)` |
| Planner asks for a tool not in allowedTools | Plan rejected; planner re-invoked with denial reason |
| Critic disagrees with own past verdict | Verdict logged; planner is told and may replan |
| Tool call returns an obviously hallucinated success | Critic catches via success criteria check; replan triggered |
| Tool call exhausts retries | Step `failed`; goal `paused`; operator decides |
| Operator approves a step then revokes mid-execution | Cancellation signal fired; tool stops; step `blocked` |

---

## 16. Configuration

```yaml
executor:
  planner:
    model: claude-3-5-sonnet-latest
    deepCriticModel: claude-3-5-sonnet-latest
    cheapCriticModel: claude-3-5-haiku-latest
    maxPlanSteps: 50            # planner can produce up to this many tactical steps per replan
    replanOnPercentBudget: 0.75
  defaults:
    budget: { maxSteps: 200, maxTokens: 500000, maxWallClockSeconds: 86400 }
    policy: { allowedTools: ['fs.read','http.get','sessions_send'], requireApprovalFor: [] }
  critic:
    runEveryStep: true
    deepEveryNSteps: 10
  approval:
    timeoutHours: 24
    notifyChannels: ['email','slack']
```

---

## 17. Testing Strategy

1. **Planner contract tests**: golden plans for 20 representative GoalSpecs; assert structural conformance (not exact text).
2. **Critic veto tests**: synthesize a "fake success" tool output; assert critic catches it.
3. **Budget tests**: run a goal whose plan needs more tokens than budget; assert it pauses at exactly the right step.
4. **Replan tests**: a step returning `breaks_assumption=true` triggers a replan within one tick.
5. **End-to-end**: real BUMN scenarios (OJK monitor, GL reconciliation) with mock tool implementations; full chain.
6. **Deterministic resume**: take a checkpoint, kill the process, resume; assert next step id is the same as it would have been.

---

## 18. Migration & Rollout

1. Ship goal/plan/step tables and budget state table in `002_goal_executor_init.sql`.
2. Wire `executor.nextStep/executeStep` into LLAR.
3. Add Goal Designer + Run Timeline to the dashboard.
4. Ship a starter library of 5–10 BUMN-flavoured goal templates (cron monitor, regulatory ingest, GL recon, sentiment watch, PR draft pipeline).
5. Default `requireApprovalFor` to include every write/destructive tool until customers explicitly relax it.

---

## 19. Open Questions

- Should we support **goal composition** (goal A's success creates goal B) in v1, or is operator-driven manual chaining sufficient?
- Should we expose the planner's chain-of-thought to the dashboard, or only the structured plan? Lean: structured only, with a "show reasoning" admin toggle for debug.
- Critic mismatch: when cheap and deep critics disagree often, how do we surface this — auto-promote to deep-only mode? Plan: track agreement rate; alert when below 80%.
