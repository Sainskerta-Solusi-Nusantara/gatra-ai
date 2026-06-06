import 'dotenv/config';
import path from 'node:path';

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

const dataDir = path.resolve(str('GATRA_DATA_DIR', './data'));

export const config = {
  env: str('NODE_ENV', 'development'),
  host: str('GATRA_HOST', '0.0.0.0'),
  port: num('GATRA_PORT', 7070),
  instanceId: str('GATRA_INSTANCE_ID', `gatra-${process.pid}`),
  dataDir,
  dbPath: path.resolve(str('GATRA_DB_PATH', path.join(dataDir, 'gatra.db'))),
  logLevel: str('GATRA_LOG_LEVEL', 'info'),

  llm: {
    provider: str('GATRA_LLM_PROVIDER', 'anthropic') as 'anthropic' | 'openai' | 'claude-cli' | 'mock',
    model: str('GATRA_LLM_MODEL', 'claude-sonnet-4-5'),
    maxTokens: num('GATRA_LLM_MAX_TOKENS', 4096),
    temperature: Number(str('GATRA_LLM_TEMPERATURE', '0.2')),
    anthropicApiKey: str('ANTHROPIC_API_KEY', ''),
    openaiApiKey: str('OPENAI_API_KEY', ''),
    openaiBaseUrl: str('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
    claudeCliPath: str('GATRA_CLAUDE_CLI_PATH', 'claude'),
  },

  defaults: {
    maxSteps: num('GATRA_DEFAULT_MAX_STEPS', 50),
    maxTokens: num('GATRA_DEFAULT_MAX_TOKENS', 200_000),
    maxWallClockSeconds: num('GATRA_DEFAULT_MAX_WALLCLOCK_SECONDS', 86_400),
    maxCostUsd: num('GATRA_DEFAULT_MAX_COST_USD', 10),
  },

  session: {
    leaseTtlMs: num('GATRA_SESSION_LEASE_TTL_MS', 60_000),
    heartbeatIntervalMs: num('GATRA_HEARTBEAT_INTERVAL_MS', 15_000),
    maxConcurrentRuns: num('GATRA_MAX_CONCURRENT_RUNS', 4),
    supervisorPollIntervalMs: num('GATRA_SUPERVISOR_POLL_INTERVAL_MS', 2_000),
  },

  apiToken: str('GATRA_API_TOKEN', ''),
  dashboardDir: path.resolve(str('GATRA_DASHBOARD_DIR', './dashboard/dist')),
  corsOrigin: str('GATRA_CORS_ORIGIN', '*'),

  rbac: {
    jwtSecret: str('GATRA_JWT_SECRET', ''),
    jwtExpirySeconds: num('GATRA_JWT_EXPIRY_SECONDS', 7 * 24 * 60 * 60),
    /** Phone number of the bootstrap admin (created by seed if absent). */
    bootstrapAdminWa: str('GATRA_BOOTSTRAP_ADMIN_WA', '+62-811-0000-0001'),
    /** When true, /api/auth/login accepts WA number alone (dev/pilot). */
    waLoginOpen: str('GATRA_RBAC_OPEN_WA_LOGIN', 'false') === 'true',
    /** WA number notified when someone resigns / is removed. Empty disables notification. */
    resignationNotifyWa: str('RESIGNATION_NOTIFY_WA', ''),
  },
};

export type Config = typeof config;
