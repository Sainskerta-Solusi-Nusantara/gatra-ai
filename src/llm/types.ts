export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json_object';
  stopSequences?: string[];
  abortSignal?: AbortSignal;
}

export interface LLMResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  finishReason: 'stop' | 'length' | 'aborted' | 'error';
  raw?: unknown;
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  complete(req: LLMRequest): Promise<LLMResponse>;
}
