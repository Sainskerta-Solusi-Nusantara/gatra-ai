import { config } from '../config.js';
import { logger } from '../logger.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { ClaudeCliProvider } from './claude-cli-provider.js';
import { MockProvider } from './mock-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import type { LLMProvider } from './types.js';

let _provider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (_provider) return _provider;

  switch (config.llm.provider) {
    case 'anthropic':
      if (!config.llm.anthropicApiKey) {
        logger.warn('GATRA_LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is unset — falling back to mock');
        _provider = new MockProvider();
      } else {
        _provider = new AnthropicProvider();
      }
      break;
    case 'openai':
      if (!config.llm.openaiApiKey) {
        logger.warn('GATRA_LLM_PROVIDER=openai but OPENAI_API_KEY is unset — falling back to mock');
        _provider = new MockProvider();
      } else {
        _provider = new OpenAIProvider();
      }
      break;
    case 'claude-cli':
      _provider = new ClaudeCliProvider();
      break;
    case 'mock':
    default:
      _provider = new MockProvider();
  }
  logger.info({ provider: _provider.name, model: _provider.model }, 'llm provider initialised');
  return _provider;
}

export function setLLMProvider(p: LLMProvider): void {
  _provider = p;
}

export type { LLMProvider, LLMRequest, LLMResponse, LLMMessage } from './types.js';
