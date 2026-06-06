import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { migrate } from '../memory/memory.js';
import { GoalExecutor } from '../orchestrator/index.js';
import { seedRbac } from '../rbac/index.js';
import { SessionManager } from '../session/index.js';
import { buildRoutes } from './routes.js';
import { attachWebSocket } from './ws.js';

export interface ServerHandle {
  app: express.Express;
  server: http.Server;
  sessions: SessionManager;
  close: () => Promise<void>;
}

export async function createServer(): Promise<ServerHandle> {
  migrate();
  // Bootstrap baseline RBAC (idempotent). Without this, /api/users etc. are
  // unreachable on a fresh install because no admin_system user exists.
  seedRbac({ quiet: true });

  const sessions = new SessionManager(new GoalExecutor());
  sessions.start();

  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(
    morgan(config.env === 'production' ? 'combined' : 'dev', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    }),
  );

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 600,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, instance: config.instanceId, ts: Date.now() });
  });

  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 240,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });

  app.use('/api/v1', apiLimiter, buildRoutes(sessions));
  // Legacy alias — keep `/api` working for older clients/tests.
  app.use('/api', apiLimiter, buildRoutes(sessions));

  const dashboardDir = config.dashboardDir;
  if (fs.existsSync(dashboardDir)) {
    logger.info({ dashboardDir }, 'serving dashboard from disk');
    app.use(
      express.static(dashboardDir, {
        index: false,
        maxAge: config.env === 'production' ? '7d' : 0,
      }),
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/ws') || req.path === '/healthz') {
        return next();
      }
      const indexPath = path.join(dashboardDir, 'index.html');
      if (!fs.existsSync(indexPath)) return next();
      res.sendFile(indexPath);
    });
  } else {
    logger.warn({ dashboardDir }, 'dashboard dist not found — UI disabled');
    app.get('/', (_req, res) => {
      res
        .type('text/plain')
        .send(
          `GATRA AI ${config.instanceId}\n` +
            `Dashboard not built. Run: npm run build:dashboard\n` +
            `API base: /api/v1\n`,
        );
    });
  }

  app.use((req, res, next) => {
    if (res.headersSent) return next();
    res.status(404).json({ error: 'not found', path: req.path });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'unhandled error');
    if (res.headersSent) return;
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  });

  const server = http.createServer(app);
  attachWebSocket(server, sessions);

  const close = async () => {
    logger.info('shutting down server');
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await sessions.stop();
  };

  return { app, server, sessions, close };
}

export async function start(): Promise<ServerHandle> {
  const handle = await createServer();
  await new Promise<void>((resolve) => {
    handle.server.listen(config.port, config.host, () => resolve());
  });
  logger.info(
    { host: config.host, port: config.port, instance: config.instanceId, env: config.env },
    'gatra-ai listening',
  );

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'received shutdown signal');
    try {
      await handle.close();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'error during shutdown');
      process.exit(1);
    }
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  return handle;
}

const isMain = (() => {
  try {
    return import.meta.url === `file://${process.argv[1]}`;
  } catch {
    return false;
  }
})();

if (isMain) {
  start().catch((err) => {
    logger.error({ err }, 'failed to start gatra-ai');
    process.exit(1);
  });
}
