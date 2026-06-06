// Express middleware: resolve identity (JWT or system token), gate folder/RBAC actions.

import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { verifyJwt } from './jwt.js';
import {
  canAccessDepartment,
  canManageRbac,
  canUserAccess,
  isAdmin,
} from './policies.js';
import { Departments, Users, normalizeWa } from './store.js';
import type { AuthIdentity, FolderAction, JabatanLevel } from './types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthIdentity;
    }
  }
}

const SYSTEM_IDENTITY: AuthIdentity = {
  kind: 'system',
  id: 'system',
  waNumber: null,
  name: 'System',
  departmentId: null,
  departmentName: null,
  jabatan: 'admin_system',
};

const DEV_IDENTITY: AuthIdentity = {
  kind: 'system',
  id: 'dev',
  waNumber: null,
  name: 'Developer',
  departmentId: null,
  departmentName: null,
  jabatan: 'admin_system',
};

function resolveJwt(token: string): AuthIdentity | null {
  if (!config.rbac.jwtSecret) return null;
  const claims = verifyJwt(token, config.rbac.jwtSecret);
  if (!claims) return null;
  // Re-load from DB so revoked/disabled accounts stop working before token expiry.
  const user = Users.get(claims.sub);
  if (!user || !user.isActive) return null;
  const dept = user.departmentId ? Departments.get(user.departmentId) : null;
  return {
    kind: 'user',
    id: user.id,
    waNumber: user.waNumber,
    name: user.name,
    departmentId: user.departmentId,
    departmentName: dept?.name ?? null,
    jabatan: user.jabatan,
  };
}

function resolveSystemToken(token: string): AuthIdentity | null {
  if (!config.apiToken || config.apiToken === 'change-me-please-use-random-token') return null;
  if (token !== config.apiToken) return null;
  return SYSTEM_IDENTITY;
}

/**
 * Resolve `req.user` from Authorization header.
 *  - `Bearer <jwt>` → looks up user, populates department/jabatan
 *  - `Bearer <api-token>` → system identity (admin_system)
 *  - In non-prod with no token configured → dev identity (admin_system)
 *  - x-actor-wa header → fallback: resolve as user if waLoginOpen and JWT absent
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const auth = req.header('authorization') ?? '';
  const [scheme, token] = auth.split(' ');
  if (scheme === 'Bearer' && token) {
    const jwtIdentity = resolveJwt(token);
    if (jwtIdentity) {
      req.user = jwtIdentity;
      req.actor = jwtIdentity.waNumber ?? jwtIdentity.name;
      return next();
    }
    const systemIdentity = resolveSystemToken(token);
    if (systemIdentity) {
      req.user = systemIdentity;
      req.actor = req.header('x-actor') ?? 'system';
      return next();
    }
  }

  // x-actor-wa fallback for header-only WA login (dev / pilot integrations).
  const waHeader = req.header('x-actor-wa');
  if (waHeader && config.rbac.waLoginOpen) {
    const user = Users.getByWa(normalizeWa(waHeader));
    if (user && user.isActive) {
      const dept = Departments.get(user.departmentId);
      req.user = {
        kind: 'user',
        id: user.id,
        waNumber: user.waNumber,
        name: user.name,
        departmentId: user.departmentId,
        departmentName: dept?.name ?? null,
        jabatan: user.jabatan,
      };
      req.actor = user.waNumber;
      return next();
    }
  }

  // Dev fallback: only when nothing is configured at all.
  const noTokenConfigured =
    !config.apiToken || config.apiToken === 'change-me-please-use-random-token';
  if (noTokenConfigured && !config.rbac.jwtSecret && config.env !== 'production') {
    req.user = DEV_IDENTITY;
    req.actor = 'dev';
    return next();
  }

  res.status(401).json({ error: 'unauthorised' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'unauthorised' });
    return;
  }
  next();
}

/**
 * Gate that blocks resigned / removed users from making changes.
 * System identities (API token, dev fallback) are allowed through — they have
 * no underlying user record to check.
 */
export function requireActiveUser(req: Request, res: Response, next: NextFunction): void {
  const u = req.user;
  if (!u) {
    res.status(401).json({ error: 'unauthorised' });
    return;
  }
  if (u.kind === 'system') return next();
  const live = Users.get(u.id);
  if (!live || !live.isActive || live.resignedAt) {
    res.status(403).json({ error: 'forbidden', reason: 'Account deactivated — contact HR' });
    return;
  }
  next();
}

export function requireJabatan(min: JabatanLevel) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const u = req.user;
    if (!u) {
      res.status(401).json({ error: 'unauthorised' });
      return;
    }
    if (isAdmin(u)) return next();
    const decision = canManageRbac(u, 'write');
    if (min === 'admin_system' && !decision.allowed) {
      res.status(403).json({ error: 'forbidden', reason: decision.reason });
      return;
    }
    // Generic jabatan-rank check for non-admin gates.
    const rank: Record<JabatanLevel, number> = {
      staff: 1,
      supervisor: 2,
      manager: 3,
      direktur: 4,
      admin_system: 99,
    };
    if (rank[u.jabatan] < rank[min]) {
      res.status(403).json({ error: 'forbidden', reason: `requires ${min}` });
      return;
    }
    next();
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const u = req.user;
  if (!u) {
    res.status(401).json({ error: 'unauthorised' });
    return;
  }
  if (!isAdmin(u)) {
    res.status(403).json({ error: 'forbidden', reason: 'admin_system required' });
    return;
  }
  next();
}

/** Department isolation gate keyed on a resource lookup. */
export function requireDepartmentAccess(
  loader: (req: Request) => string | null | Promise<string | null>,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const u = req.user;
    if (!u) {
      res.status(401).json({ error: 'unauthorised' });
      return;
    }
    let deptId: string | null;
    try {
      deptId = await loader(req);
    } catch (err) {
      logger.warn({ err, path: req.path }, 'department loader failed');
      res.status(404).json({ error: 'not found' });
      return;
    }
    const decision = canAccessDepartment(u, deptId);
    if (!decision.allowed) {
      res.status(403).json({ error: 'forbidden', reason: decision.reason });
      return;
    }
    next();
  };
}

/** Folder gate — `folder` and `action` taken from req.body / req.params. */
export function requireFolderAccess(
  pick: (req: Request) => { folder: string; action: FolderAction },
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const u = req.user;
    if (!u) {
      res.status(401).json({ error: 'unauthorised' });
      return;
    }
    const { folder, action } = pick(req);
    const decision = canUserAccess(u, folder, action);
    if (!decision.allowed) {
      res.status(403).json({ error: 'forbidden', reason: decision.reason });
      return;
    }
    next();
  };
}
