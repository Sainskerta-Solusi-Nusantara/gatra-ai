import { config } from '../config.js';
import type { LLMProvider, LLMRequest, LLMResponse } from './types.js';

const PRICE_INPUT_PER_M = 2.5;
const PRICE_OUTPUT_PER_M = 10;

interface OpenAIChatResponse {
  choices: { message: { content: string }; finish_reason: string }[];
  usage: { prompt_tokens: number; completion_tokens: number };
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly model = config.llm.model;

  async complete(req: LLMRequest): Promise<LLMResponse> {
    if (!config.llm.openaiApiKey) throw new Error('OPENAI_API_KEY not set');

    const body = {
      model: this.model,
      messages: req.messages,
      max_tokens: req.maxTokens ?? config.llm.maxTokens,
      temperature: req.temperature ?? config.llm.temperature,
      stop: req.stopSequences,
      response_format: req.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
    };

    try {
      const res = await fetch(`${config.llm.openaiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.llm.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: req.abortSignal,
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI HTTP ${res.status}: ${errText}`);
      }
      const data = (await res.json()) as OpenAIChatResponse;
      const text = data.choices[0]?.message.content ?? '';
      const inputTokens = data.usage.prompt_tokens;
      const outputTokens = data.usage.completion_tokens;
      const costUsd = (inputTokens * PRICE_INPUT_PER_M + outputTokens * PRICE_OUTPUT_PER_M) / 1_000_000;
      const reason = data.choices[0]?.finish_reason ?? 'stop';
      const finish: LLMResponse['finishReason'] = reason === 'length' ? 'length' : 'stop';
      return { text, inputTokens, outputTokens, costUsd, finishReason: finish, raw: data };
    } catch (err) {
      if (req.abortSignal?.aborted) {
        return { text: '', inputTokens: 0, outputTokens: 0, costUsd: 0, finishReason: 'aborted' };
      }
      throw err;
    }
  }
}
