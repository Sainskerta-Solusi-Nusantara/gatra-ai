import { getLLMProvider } from '../llm/index.js';
import type { Criterion, Goal, Step } from '../memory/memory.js';
import { logger } from '../logger.js';
import type { VerifierResult } from './types.js';

const SYSTEM = `You are GATRA AI's verifier.

You receive a goal's success criteria and the agent's full step history.
For each criterion, decide whether it is SATISFIED based on observed evidence.

Respond ONLY with a JSON object:
{
  "satisfied": <boolean — true iff ALL criteria are satisfied>,
  "reasons": ["<one short reason per criterion>"],
  "unmet": ["<criterion descriptions that are not yet met>"]
}

Do not include markdown.
`;

function summariseStep(s: Step): string {
  const result = s.result === null ? '(no result)' : JSON.stringify(s.result).slice(0, 600);
  return `#${s.index} ${s.tool} → ${s.status}\n  result: ${result}`;
}

export class Verifier {
  /**
   * Quick rule-based pass for criteria that don't need an LLM.
   * - tool_output_contains: scan steps for a tool name + pattern match
   * - operator_approves: deferred to the approvals workflow, returns unmet
   * The remaining criteria are passed to the LLM judge.
   */
  async verify(opts: { goal: Goal; steps: Step[]; signal?: AbortSignal }): Promise<VerifierResult> {
    const { goal, steps, signal } = opts;
    const reasons: string[] = [];
    const unmet: string[] = [];
    const remainingForLLM: Criterion[] = [];

    for (const c of goal.spec.successCriteria) {
      switch (c.kind) {
        case 'tool_output_contains': {
          const match = steps.find(
            (s) =>
              s.tool === c.tool &&
              s.status === 'succeeded' &&
              s.result !== null &&
              JSON.stringify(s.result).includes(c.pattern),
          );
          if (match) reasons.push(`tool_output_contains satisfied by step #${match.index}`);
          else unmet.push(`tool_output_contains[${c.tool} ⊇ ${c.pattern}]`);
          break;
        }
        case 'operator_approves': {
          unmet.push(`operator_approves[${c.role}] — pending`);
          break;
        }
        case 'observation_matches':
        case 'llm_judge':
          remainingForLLM.push(c);
          break;
      }
    }

    if (remainingForLLM.length === 0) {
      return { satisfied: unmet.length === 0, reasons, unmet };
    }

    const llm = getLLMProvider();
    const user = `VERIFIER_TASK

# Goal
Objective: ${goal.spec.objective}

# Criteria to judge
${remainingForLLM.map((c, i) => `  ${i + 1}. ${JSON.stringify(c)}`).join('\n')}

# Step history (last 20)
${steps.slice(-20).map(summariseStep).join('\n')}

Respond with the JSON verdict now.`;

    const res = await llm.complete({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: user },
      ],
      responseFormat: 'json_object',
      abortSignal: signal,
      temperature: 0,
    });

    const parsed = parseVerifierOutput(res.text);
    return {
      satisfied: parsed.satisfied && unmet.length === 0,
      reasons: [...reasons, ...parsed.reasons],
      unmet: [...unmet, ...(parsed.unmet ?? [])],
    };
  }
}

export function parseVerifierOutput(text: string): VerifierResult {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    const obj = JSON.parse(cleaned);
    return {
      satisfied: Boolean(obj.satisfied),
      reasons: Array.isArray(obj.reasons) ? obj.reasons.map(String) : [],
      unmet: Array.isArray(obj.unmet) ? obj.unmet.map(String) : [],
    };
  } catch (err) {
    logger.error({ err, text: cleaned.slice(0, 500) }, 'verifier output parse failed');
    return { satisfied: false, reasons: ['verifier output unparseable'], unmet: ['parse_failure'] };
  }
}
