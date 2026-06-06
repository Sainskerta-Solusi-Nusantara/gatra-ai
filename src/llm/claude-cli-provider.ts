import { spawn } from 'node:child_process';
import { config } from '../config.js';
import type { LLMProvider, LLMRequest, LLMResponse } from './types.js';

/**
 * Subprocess provider: pipes the prompt into the Claude Code CLI and reads
 * its stdout. Used in environments without an outbound HTTPS LLM key.
 *
 * Requires the CLI binary specified by GATRA_CLAUDE_CLI_PATH to be on PATH,
 * authenticated, and to support `--print` (claude prints assistant reply
 * to stdout and exits).
 */
export class ClaudeCliProvider implements LLMProvider {
  readonly name = 'claude-cli';
  readonly model = config.llm.model;

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const prompt = req.messages.map((m) => `[${m.role}]\n${m.content}`).join('\n\n');

    return new Promise<LLMResponse>((resolve, reject) => {
      const args = ['--print', '--model', this.model];
      const child = spawn(config.llm.claudeCliPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      const onAbort = () => {
        child.kill('SIGTERM');
      };
      req.abortSignal?.addEventListener('abort', onAbort);

      child.stdout.on('data', (d) => (stdout += d.toString()));
      child.stderr.on('data', (d) => (stderr += d.toString()));
      child.on('error', (err) => {
        req.abortSignal?.removeEventListener('abort', onAbort);
        reject(err);
      });
      child.on('close', (code) => {
        req.abortSignal?.removeEventListener('abort', onAbort);
        if (req.abortSignal?.aborted) {
          resolve({ text: '', inputTokens: 0, outputTokens: 0, costUsd: 0, finishReason: 'aborted' });
          return;
        }
        if (code !== 0) {
          reject(new Error(`claude CLI exited ${code}: ${stderr.slice(-2000)}`));
          return;
        }
        // We don't know real token counts from the CLI; estimate ~4 chars/token.
        const text = stdout.trim();
        const inputTokens = Math.ceil(prompt.length / 4);
        const outputTokens = Math.ceil(text.length / 4);
        resolve({
          text,
          inputTokens,
          outputTokens,
          costUsd: 0,
          finishReason: 'stop',
        });
      });

      child.stdin.write(prompt);
      child.stdin.end();
    });
  }
}
