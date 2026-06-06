// Authentication entrypoint.
//
// Two supported credentials:
//   1. Long-lived `GATRA_API_TOKEN` Bearer — system identity (admin_system).
//   2. WA-issued JWT — user identity (department + jabatan resolved at request time).
//
// Resolution lives in src/rbac/middleware.ts. This module re-exports the gate
// used by routes so existing imports of `requireToken` continue to work.

import type { NextFunction, Request, Response } from 'express';
import { authenticate, requireAuth } from '../rbac/middleware.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: string;
    }
  }
}

/** Combined: resolve identity, then 401 if no identity attached. */
export function requireToken(req: Request, res: Response, next: NextFunction): void {
  authenticate(req, res, (err?: unknown) => {
    if (err) return next(err as Error);
    if (res.headersSent) return;
    requireAuth(req, res, next);
  });
}

export { authenticate, requireAuth };
