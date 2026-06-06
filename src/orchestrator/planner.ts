import { getLLMProvider } from '../llm/index.js';
import { buildWorkingContext } from '../memory/memory.js';
import type { Goal, AgentRun, Step } from '../memory/memory.js';
import { tools } from '../tools/index.js';
import { logger } from '../logger.js';
import type { PlannerResult } from './types.js';

const SYSTEM_PROMPT = `You are GATRA AI, a goal-driven autonomous planner.

You receive:
- A high-level goal (objective + success criteria).
- A list of tools available to you.
- The recent execution history (previous steps + their results).

Your job: output the NEXT 1-5 concrete tool calls that move the agent closer
to satisfying the success criteria. Plan tactically; do not invent goals.

Respond ONLY with a JSON object matching this schema:
{
  "rationale": "string — one paragraph",
  "steps": [
    { "tool": "<tool-name>", "args": <object>, "rationale": "string" }
  ],
  "complete": <boolean — true iff you believe ALL success criteria are met
                          and no further steps are needed>
}

Constraints:
- Only use tools from the allowed list. If none fit, return complete=true
  with a rationale explaining why no further work is possible.
- "args" must be a JSON object that the tool can accept directly.
- Do not include markdown, backticks, or commentary outside the JSON.
`;

function clipResults(steps: Step[], maxChars = 4000): string {
  const lines = steps.slice(-10).map((s) => {
    const result = s.result === null ? '(no result)' : JSON.stringify(s.result).slice(0, 800);
    return `#${s.index} ${s.tool}(${JSON.stringify(s.args).slice(0, 300)}) → ${s.status}\n  rationale: ${s.rationale}\n  result: ${result}${s.critique ? `\n  critique: ${s.critique}` : ''}`;
  });
  let acc = '';
  for (const l of lines) {
    if (acc.length + l.length > maxChars) break;
    acc += l + '\n';
  }
  return acc || '(no prior steps)';
}

export class Planner {
  async plan(opts: { goal: Goal; run: AgentRun; history: Step[]; signal?: AbortSignal }): Promise<PlannerResult> {
    const { goal, run, history, signal } = opts;
    const llm = getLLMProvider();
    const allowed = tools
      .list()
      .filter((t) => goal.policy.allowedTools.includes(t.name) || goal.policy.allowedTools.includes('*'));

    if (allowed.length === 0) {
      logger.warn({ goalId: goal.id }, 'planner: no allowed tools for this goal');
      return {
        rationale: 'No tools are permitted by goal policy; cannot proceed.',
        steps: [],
        complete: true,
      };
    }

    const ctx = buildWorkingContext({
      goalId: goal.id,
      runId: run.id,
      episodicLimit: 20,
    });

    const toolList = allowed
      .map((t) => `- ${t.name}: ${t.description}${t.dangerous ? ' (DANGEROUS — may require approval)' : ''}`)
      .join('\n');

    const semantic = ctx.semantic.length
      ? '\nPersistent facts (from prior runs of this goal):\n' +
        ctx.semantic.map((f) => `- ${f.key}: ${f.value} (confidence ${f.confidence.toFixed(2)})`).join('\n')
      : '';

    const user = `PLANNER_TASK

# Goal
Title: ${goal.title}
Objective: ${goal.spec.objective}
Language: ${goal.spec.language ?? 'en-US'}

Success criteria:
${goal.spec.successCriteria.map((c, i) => `  ${i + 1}. ${JSON.stringify(c)}`).join('\n')}

${goal.spec.failureCriteria?.length ? `Failure criteria:\n${goal.spec.failureCriteria.map((c) => `  - ${JSON.stringify(c)}`).join('\n')}\n` : ''}
Context: ${JSON.stringify(goal.spec.context ?? {})}

# Budget
Steps used: ${run.stepsExecuted}/${goal.budget.maxSteps}
Tokens used: ${run.tokensUsed}/${goal.budget.maxTokens}
Cost so far: $${run.costUsd.toFixed(4)} / $${(goal.budget.maxCostUsd ?? Infinity).toFixed(2)}

# Allowed tools
${toolList}
${semantic}

# Recent steps
${clipResults(history)}

Respond with the JSON plan now.`;

    const res = await llm.complete({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
      responseFormat: 'json_object',
      abortSignal: signal,
      temperature: 0.2,
    });

    const parsed = parsePlannerOutput(res.text);
    logger.info(
      { runId: run.id, steps: parsed.steps.length, complete: parsed.complete, tokens: res.outputTokens },
      'planner produced plan',
    );
    return parsed;
  }
}

export function parsePlannerOutput(text: string): PlannerResult {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    const obj = JSON.parse(cleaned);
    return {
      rationale: typeof obj.rationale === 'string' ? obj.rationale : '',
      steps: Array.isArray(obj.steps)
        ? obj.steps
            .filter((s: unknown): s is { tool: string; args?: unknown; rationale?: string } => {
              return typeof s === 'object' && s !== null && typeof (s as { tool: unknown }).tool === 'string';
            })
            .map((s: { tool: string; args?: unknown; rationale?: string }) => ({
              tool: s.tool,
              args: s.args ?? {},
              rationale: typeof s.rationale === 'string' ? s.rationale : '',
            }))
        : [],
      complete: Boolean(obj.complete),
      reasoning: typeof obj.reasoning === 'string' ? obj.reasoning : undefined,
    };
  } catch (err) {
    logger.error({ err, text: cleaned.slice(0, 500) }, 'planner output parse failed');
    return {
      rationale: 'Planner produced unparseable output.',
      steps: [],
      complete: false,
    };
  }
}
