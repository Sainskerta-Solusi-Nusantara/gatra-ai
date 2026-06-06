import { Router, type Request, type Response } from 'express';
import { config } from '../config.js';
import { Audit } from '../memory/memory.js';
import {
  Departments,
  FolderPermissions,
  Users,
  canUserAccess,
  isAdmin,
  normalizeFolder,
  normalizeWa,
  signJwt,
} from '../rbac/index.js';
import { requireAdmin, requireJabatan } from '../rbac/middleware.js';
import {
  AdminRemoveUserSchema,
  CreateDepartmentSchema,
  CreateUserSchema,
  GrantFolderSchema,
  LoginSchema,
  ResignSchema,
  UpdateDepartmentSchema,
  UpdateUserSchema,
} from './validators.js';

/** RBAC + auth routes. Mounted by buildRoutes() after the auth middleware. */
export function buildRbacRoutes(): Router {
  const r = Router();

  // ---------- Auth ----------

  /**
   * POST /api/auth/login — exchange a WA number for a JWT.
   * In production this would also verify a one-time code (e.g. sent via WA).
   * In `waLoginOpen=true` mode (pilot), the WA number alone is enough.
   */
  r.post('/auth/login', (req: Request, res: Response) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation', issues: parsed.error.issues });
      return;
    }
    if (!config.rbac.waLoginOpen && req.user?.kind !== 'system') {
      res.status(403).json({ error: 'wa login requires admin or open-login mode' });
      return;
    }
    if (!config.rbac.jwtSecret) {
      res.status(500).json({ error: 'GATRA_JWT_SECRET not configured' });
      return;
    }
    const wa = normalizeWa(parsed.data.waNumber);
    const user = Users.getByWa(wa);
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'unknown or inactive WA number' });
      return;
    }
    const token = signJwt(
      { sub: user.id, wa: user.waNumber, dept: user.departmentId, jab: user.jabatan },
      config.rbac.jwtSecret,
      config.rbac.jwtExpirySeconds,
    );
    const dept = Departments.get(user.departmentId);
    Audit.append(req.actor ?? 'system', 'auth.login', user.id, { wa: user.waNumber });
    res.json({
      token,
      expiresIn: config.rbac.jwtExpirySeconds,
      user: {
        id: user.id,
        waNumber: user.waNumber,
        name: user.name,
        jabatan: user.jabatan,
        departmentId: user.departmentId,
        departmentName: dept?.name ?? null,
      },
    });
  });

  /** GET /api/auth/me — return the resolved identity for the caller. */
  r.get('/auth/me', (req: Request, res: Response) => {
    res.json({ user: req.user });
  });

  // ---------- Departments ----------

  r.get('/departments', requireJabatan('staff'), (_req: Request, res: Response) => {
    res.json({ items: Departments.list() });
  });

  r.post('/departments', requireAdmin, (req: Request, res: Response) => {
    const parsed = CreateDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation', issues: parsed.error.issues });
      return;
    }
    const existing = Departments.getByName(parsed.data.name);
    if (existing) {
      res.status(409).json({ error: 'department exists', department: existing });
      return;
    }
    const dept = Departments.create({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    });
    Audit.append(req.actor ?? 'admin', 'department.create', dept.id, { name: dept.name });
    res.status(201).json(dept);
  });

  r.put('/departments/:id', requireAdmin, (req: Request, res: Response) => {
    const parsed = UpdateDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation', issues: parsed.error.issues });
      return;
    }
    const id = String(req.params.id);
    const dept = Departments.update(id, parsed.data);
    if (!dept) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    Audit.append(req.actor ?? 'admin', 'department.update', dept.id, parsed.data);
    res.json(dept);
  });

  r.delete('/departments/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id);
    Departments.delete(id);
    Audit.append(req.actor ?? 'admin', 'department.delete', id, {});
    res.json({ ok: true });
  });

  // ---------- Users ----------

  r.get('/users', requireJabatan('manager'), (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    // Non-admin managers see only their own department, regardless of query.
    const u = req.user!;
    const departmentId = isAdmin(u) ? q.departmentId : u.departmentId ?? undefined;
    const items = Users.list({
      departmentId,
      jabatan: q.jabatan as never,
      isActive: q.active === undefined ? undefined : q.active === 'true',
    });
    res.json({ items });
  });

  r.post('/users', requireAdmin, (req: Request, res: Response) => {
    const parsed = CreateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation', issues: parsed.error.issues });
      return;
    }
    if (!Departments.get(parsed.data.departmentId)) {
      res.status(400).json({ error: 'unknown departmentId' });
      return;
    }
    if (Users.getByWa(parsed.data.waNumber)) {
      res.status(409).json({ error: 'WA number already registered' });
      return;
    }
    const user = Users.create(parsed.data);
    Audit.append(req.actor ?? 'admin', 'user.create', user.id, {
      wa: user.waNumber,
      dept: user.departmentId,
    });
    res.status(201).json(user);
  });

  r.put('/users/:id', requireAdmin, (req: Request, res: Response) => {
    const parsed = UpdateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation', issues: parsed.error.issues });
      return;
    }
    if (parsed.data.departmentId && !Departments.get(parsed.data.departmentId)) {
      res.status(400).json({ error: 'unknown departmentId' });
      return;
    }
    const id = String(req.params.id);
    const user = Users.update(id, parsed.data);
    if (!user) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    Audit.append(req.actor ?? 'admin', 'user.update', user.id, parsed.data);
    res.json(user);
  });

  r.delete('/users/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id);
    Users.delete(id);
    Audit.append(req.actor ?? 'admin', 'user.delete', id, {});
    res.json({ ok: true });
  });

  // ---------- Folder permissions ----------

  r.get('/rbac/permissions', requireJabatan('manager'), (req: Request, res: Response) => {
    const u = req.user!;
    const items = isAdmin(u)
      ? FolderPermissions.listAll()
      : u.departmentId
        ? FolderPermissions.listForDepartment(u.departmentId)
        : [];
    res.json({ items });
  });

  r.post('/rbac/permissions', requireAdmin, (req: Request, res: Response) => {
    const parsed = GrantFolderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation', issues: parsed.error.issues });
      return;
    }
    if (!Departments.get(parsed.data.departmentId)) {
      res.status(400).json({ error: 'unknown departmentId' });
      return;
    }
    const perm = FolderPermissions.grant(parsed.data);
    Audit.append(req.actor ?? 'admin', 'rbac.grant', perm.id, {
      dept: perm.departmentId,
      folder: perm.folderPath,
      level: perm.accessLevel,
    });
    res.status(201).json(perm);
  });

  r.delete('/rbac/permissions', requireAdmin, (req: Request, res: Response) => {
    const departmentId = String(req.query.departmentId ?? '');
    const folderPath = String(req.query.folderPath ?? '');
    if (!departmentId || !folderPath) {
      res.status(400).json({ error: 'departmentId and folderPath required' });
      return;
    }
    FolderPermissions.revoke(departmentId, folderPath);
    Audit.append(req.actor ?? 'admin', 'rbac.revoke', `${departmentId}:${folderPath}`, {});
    res.json({ ok: true });
  });

  // ---------- Access check ----------

  /**
   * GET /api/rbac/check/:wa?folder=/path&action=read
   * Resolves the WA number's user, returns the policy decision for the
   * requested folder/action. Useful for the WA bot pre-flight.
   */
  r.get('/rbac/check/:wa', requireJabatan('staff'), (req: Request, res: Response) => {
    const folder = normalizeFolder(String(req.query.folder ?? '/'));
    const action = (String(req.query.action ?? 'read') as 'read' | 'write' | 'admin');
    if (!['read', 'write', 'admin'].includes(action)) {
      res.status(400).json({ error: 'action must be read|write|admin' });
      return;
    }
    const user = Users.getByWa(normalizeWa(String(req.params.wa)));
    if (!user) {
      res.json({ allowed: false, reason: 'unknown WA number' });
      return;
    }
    if (!user.isActive) {
      res.json({ allowed: false, reason: 'user inactive', user: { id: user.id, name: user.name } });
      return;
    }
    const dept = Departments.get(user.departmentId);
    const identity = {
      kind: 'user' as const,
      id: user.id,
      waNumber: user.waNumber,
      name: user.name,
      departmentId: user.departmentId,
      departmentName: dept?.name ?? null,
      jabatan: user.jabatan,
    };
    const decision = canUserAccess(identity, folder, action);
    res.json({
      allowed: decision.allowed,
      reason: decision.reason,
      folder,
      action,
      user: {
        id: user.id,
        name: user.name,
        waNumber: user.waNumber,
        jabatan: user.jabatan,
        departmentId: user.departmentId,
        departmentName: dept?.name ?? null,
      },
    });
  });

  // ---------- Resignation / offboarding ----------

  /**
   * POST /api/self-resign — user-initiated resignation.
   * Caller must be authenticated as the same WA, or be an admin acting on
   * their behalf. Deactivates the account, records reason, terminates active
   * sessions, and audit-logs the event.
   */
  r.post('/self-resign', (req: Request, res: Response) => {
    const parsed = ResignSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation', issues: parsed.error.issues });
      return;
    }
    const wa = normalizeWa(parsed.data.waNumber);
    const caller = req.user;
    if (!caller) {
      res.status(401).json({ error: 'unauthorised' });
      return;
    }
    const callerWa = caller.waNumber ? normalizeWa(caller.waNumber) : null;
    if (!isAdmin(caller) && callerWa !== wa) {
      res.status(403).json({ error: 'forbidden', reason: 'can only resign yourself' });
      return;
    }
    try {
      const user = Users.resign(wa, parsed.data.reason ?? null);
      res.json({ ok: true, user });
    } catch (e) {
      const msg = (e as Error).message;
      const status = msg === 'user not found' ? 404 : 409;
      res.status(status).json({ error: msg });
    }
  });

  /**
   * POST /api/admin/remove-user — admin/manager-initiated removal.
   * The actor recorded in `removed_by` is the authenticated caller, not the
   * body field — bodies are user-controlled and shouldn't authorise themselves.
   */
  r.post('/admin/remove-user', requireJabatan('manager'), (req: Request, res: Response) => {
    const parsed = AdminRemoveUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation', issues: parsed.error.issues });
      return;
    }
    const targetWa = normalizeWa(parsed.data.waNumber);
    const removedByWa = req.user?.waNumber
      ? normalizeWa(req.user.waNumber)
      : normalizeWa(parsed.data.removedByWa);
    try {
      const user = Users.adminRemove(targetWa, removedByWa);
      res.json({ ok: true, user });
    } catch (e) {
      const msg = (e as Error).message;
      const status = msg === 'user not found' ? 404 : 409;
      res.status(status).json({ error: msg });
    }
  });

  /** GET /api/admin/resigned — list resigned/removed users (admin only). */
  r.get('/admin/resigned', requireAdmin, (_req: Request, res: Response) => {
    res.json({ items: Users.listResigned() });
  });

  return r;
}
