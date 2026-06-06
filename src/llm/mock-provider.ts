import type { LLMProvider, LLMRequest, LLMResponse } from './types.js';

/**
 * Deterministic mock provider — used for tests and the default config when no
 * API key is configured. Emits structured planner/critic responses so the
 * orchestrator can run end-to-end without external network calls.
 */
export class MockProvider implements LLMProvider {
  readonly name = 'mock';
  readonly model = 'mock-1';

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const last = req.messages[req.messages.length - 1]?.content ?? '';
    const isPlanner = last.includes('PLANNER_TASK');
    const isCritic = last.includes('CRITIC_TASK');
    const isVerifier = last.includes('VERIFIER_TASK');

    let text: string;
    if (isPlanner) {
      text = JSON.stringify({
        rationale: 'Mock planner produces a noop step then completes.',
        steps: [
          { tool: 'noop', args: { message: 'mock plan executed' }, rationale: 'simulate work' },
        ],
        complete: false,
      });
    } else if (isCritic) {
      text = JSON.stringify({ ok: true, critique: 'looks fine' });
    } else if (isVerifier) {
      text = JSON.stringify({ satisfied: true, reasons: ['mock provider: success criteria assumed met'] });
    } else {
      text = JSON.stringify({ message: 'mock response' });
    }

    return {
      text,
      inputTokens: Math.ceil(last.length / 4),
      outputTokens: Math.ceil(text.length / 4),
      costUsd: 0,
      finishReason: 'stop',
    };
  }
}
