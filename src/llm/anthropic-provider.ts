import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import type { LLMProvider, LLMRequest, LLMResponse } from './types.js';

// Indicative pricing per 1M tokens for sonnet-class models. Real values are
// resolved at billing time; this is for local cost capping only.
const PRICE_INPUT_PER_M = 3;
const PRICE_OUTPUT_PER_M = 15;

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly model = config.llm.model;
  private readonly client: Anthropic;

  constructor() {
    if (!config.llm.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }
    this.client = new Anthropic({ apiKey: config.llm.anthropicApiKey });
  }

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const systemMsg = req.messages.find((m) => m.role === 'system')?.content ?? '';
    const otherMsgs = req.messages.filter((m) => m.role !== 'system');

    try {
      const res = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: req.maxTokens ?? config.llm.maxTokens,
          temperature: req.temperature ?? config.llm.temperature,
          system: systemMsg || undefined,
          messages: otherMsgs.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          stop_sequences: req.stopSequences,
        },
        { signal: req.abortSignal },
      );

      const text = res.content
        .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('');
      const inputTokens = res.usage.input_tokens;
      const outputTokens = res.usage.output_tokens;
      const costUsd = (inputTokens * PRICE_INPUT_PER_M + outputTokens * PRICE_OUTPUT_PER_M) / 1_000_000;
      const finish: LLMResponse['finishReason'] =
        res.stop_reason === 'end_turn' || res.stop_reason === 'stop_sequence'
          ? 'stop'
          : res.stop_reason === 'max_tokens'
            ? 'length'
            : 'stop';

      return { text, inputTokens, outputTokens, costUsd, finishReason: finish, raw: res };
    } catch (err) {
      if (req.abortSignal?.aborted) {
        return { text: '', inputTokens: 0, outputTokens: 0, costUsd: 0, finishReason: 'aborted' };
      }
      throw err;
    }
  }
}
