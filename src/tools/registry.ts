import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { config } from '../config.js';
import { logger } from '../logger.js';
import type { Tool, ToolContext, ToolResult } from './types.js';

const MAX_OUTPUT_BYTES = 64 * 1024;

function truncate(out: string): { output: string; truncated: boolean } {
  const buf = Buffer.from(out, 'utf8');
  if (buf.byteLength <= MAX_OUTPUT_BYTES) return { output: out, truncated: false };
  return {
    output: buf.subarray(0, MAX_OUTPUT_BYTES).toString('utf8') + '\n…[truncated]',
    truncated: true,
  };
}

// ---------- noop (used for smoke tests / mock provider) ----------

const noop: Tool = {
  name: 'noop',
  description: 'Returns its arguments. Useful for plan smoke tests.',
  async invoke(args, _ctx): Promise<ToolResult> {
    return { output: args, durationMs: 0 };
  },
};

// ---------- fs.read ----------

interface FsReadArgs { path: string; maxBytes?: number }

const fsRead: Tool<FsReadArgs> = {
  name: 'fs.read',
  description: 'Read a UTF-8 file. Restricted to the data directory.',
  async invoke(args, _ctx) {
    const start = Date.now();
    const target = path.resolve(args.path);
    if (!target.startsWith(config.dataDir + path.sep) && target !== config.dataDir) {
      throw new Error(`fs.read denied: path outside data dir (${target})`);
    }
    const content = await fs.readFile(target, 'utf8');
    const limited = args.maxBytes ? content.slice(0, args.maxBytes) : content;
    const { output, truncated } = truncate(limited);
    return { output, truncated, durationMs: Date.now() - start };
  },
};

// ---------- fs.write ----------

interface FsWriteArgs { path: string; content: string }

const fsWrite: Tool<FsWriteArgs> = {
  name: 'fs.write',
  description: 'Write a UTF-8 file under the data directory.',
  dangerous: true,
  async invoke(args, _ctx) {
    const start = Date.now();
    const target = path.resolve(args.path);
    if (!target.startsWith(config.dataDir + path.sep)) {
      throw new Error(`fs.write denied: path outside data dir (${target})`);
    }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, args.content, 'utf8');
    return { output: { wrote: target, bytes: Buffer.byteLength(args.content) }, durationMs: Date.now() - start };
  },
};

// ---------- http.get ----------

interface HttpGetArgs { url: string; headers?: Record<string, string> }

const httpGet: Tool<HttpGetArgs> = {
  name: 'http.get',
  description: 'HTTP GET. Returns first 64KB of the response body.',
  async invoke(args, ctx) {
    const start = Date.now();
    const res = await fetch(args.url, { headers: args.headers, signal: ctx.signal });
    const text = await res.text();
    const { output, truncated } = truncate(text);
    return {
      output: { status: res.status, headers: Object.fromEntries(res.headers), body: output },
      truncated,
      durationMs: Date.now() - start,
    };
  },
};

// ---------- shell.exec ----------

interface ShellArgs { command: string; timeoutMs?: number }

const shellExec: Tool<ShellArgs> = {
  name: 'shell.exec',
  description: 'Run a shell command. Output truncated to 64KB. Use carefully.',
  dangerous: true,
  async invoke(args, ctx) {
    const start = Date.now();
    return new Promise<ToolResult>((resolve, reject) => {
      const child = spawn('sh', ['-c', args.command], { cwd: config.dataDir });
      let stdout = '';
      let stderr = '';
      const timeoutMs = args.timeoutMs ?? 60_000;
      const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
      const onAbort = () => child.kill('SIGTERM');
      ctx.signal.addEventListener('abort', onAbort);
      child.stdout.on('data', (d) => (stdout += d.toString()));
      child.stderr.on('data', (d) => (stderr += d.toString()));
      child.on('error', (err) => {
        clearTimeout(timer);
        ctx.signal.removeEventListener('abort', onAbort);
        reject(err);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        ctx.signal.removeEventListener('abort', onAbort);
        const stdoutTrunc = truncate(stdout);
        const stderrTrunc = truncate(stderr);
        resolve({
          output: {
            exitCode: code,
            stdout: stdoutTrunc.output,
            stderr: stderrTrunc.output,
          },
          truncated: stdoutTrunc.truncated || stderrTrunc.truncated,
          durationMs: Date.now() - start,
        });
      });
    });
  },
};

// ---------- Registry ----------

class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register<T>(tool: Tool<T>): void {
    this.tools.set(tool.name, tool as Tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): { name: string; description: string; dangerous: boolean }[] {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      dangerous: t.dangerous ?? false,
    }));
  }

  isDangerous(name: string): boolean {
    return this.tools.get(name)?.dangerous ?? false;
  }
}

export const tools = new ToolRegistry();
tools.register(noop);
tools.register(fsRead);
tools.register(fsWrite);
tools.register(httpGet);
tools.register(shellExec);

logger.info({ tools: tools.list().map((t) => t.name) }, 'tool registry initialised');
