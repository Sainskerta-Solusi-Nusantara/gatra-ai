export interface ToolContext {
  goalId: string;
  runId: string;
  stepId: string;
  signal: AbortSignal;
}

export interface ToolResult {
  output: unknown;
  truncated?: boolean;
  durationMs: number;
}

export interface Tool<TArgs = unknown> {
  name: string;
  description: string;
  dangerous?: boolean;
  invoke(args: TArgs, ctx: ToolContext): Promise<ToolResult>;
}
