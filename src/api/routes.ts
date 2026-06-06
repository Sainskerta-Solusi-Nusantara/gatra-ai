import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { logger } from '../logger.js';
import {
  Approvals,
  Audit,
  Checkpoints,
  Episodic,
  Goals,
  RunEvents,
  Runs,
  Semantic,
  Steps,
} from '../memory/memory.js';
import {
  Departments,
  Users,
  canAccessDepartment,
  hasJabatanAtLeast,
  isAdmin,
  normalizeWa,
} from '../rbac/index.js';
import type { SessionManager } from '../session/index.js';
import { tools } from '../tools/index.js';
import { requireToken } from './auth.js';
import { buildRbacRoutes } from './rbac-routes.js';
import {
  formatHelpText,
  getCategories,
  getStakeholderTemplates,
  getTemplateByCommand,
} from '../templates/engine.js';
import { getScopePrompt } from '../rbac/scope.js';
import { getLLMProvider } from '../llm/index.js';
import { CATALOG } from '../templates/catalog.js';
import {
  isDepartmentId,
  type DepartmentId,
  type JabatanLevel,
} from '../templates/types.js';
import {
  AdminRemoveUserSchema,
  CreateGoalSchema,
  DecideApprovalSchema,
  ResignSchema,
} from './validators.js';

const JABATAN_VALUES: readonly JabatanLevel[] = [
  'staff',
  'supervisor',
  'manager',
  'direktur',
  'admin_system',
];
function isJabatanLevel(v: unknown): v is JabatanLevel {
  return typeof v === 'string' && (JABATAN_VALUES as readonly string[]).includes(v);
}

/** Throw a 403 unless the caller can see this goal. */
function gateGoal(req: Request, res: Response, goalId: string): { ok: true; departmentId: string | null } | null {
  const goal = Goals.get(goalId);
  if (!goal) {
    res.status(404).json({ error: 'not found' });
    return null;
  }
  const u = req.user;
  if (!u) {
    res.status(401).json({ error: 'unauthorised' });
    return null;
  }
  const decision = canAccessDepartment(u, goal.departmentId);
  if (!decision.allowed) {
    res.status(403).json({ error: 'forbidden', reason: decision.reason });
    return null;
  }
  return { ok: true, departmentId: goal.departmentId };
}

function gateRun(req: Request, res: Response, runId: string): { ok: true } | null {
  const run = Runs.get(runId);
  if (!run) {
    res.status(404).json({ error: 'not found' });
    return null;
  }
  const goal = Goals.get(run.goalId);
  if (!goal) {
    res.status(404).json({ error: 'goal not found' });
    return null;
  }
  const u = req.user;
  if (!u) {
    res.status(401).json({ error: 'unauthorised' });
    return null;
  }
  const decision = canAccessDepartment(u, goal.departmentId);
  if (!decision.allowed) {
    res.status(403).json({ error: 'forbidden', reason: decision.reason });
    return null;
  }
  return { ok: true };
}

export function buildRoutes(sessions: SessionManager): Router {
  const r = Router();
  r.use(requireToken);

  // ---------- RBAC + auth sub-router ----------
  r.use(buildRbacRoutes());

  // ---------- Healthz / status ----------
  r.get('/healthz', (_req, res) => {
    res.json({ ok: true, instance: config.instanceId });
  });

  r.get('/fleet/status', (req, res) => {
    const u = req.user;
    // Non-admin sees only their department's goal counts.
    const goalFilter = u && !isAdmin(u) && u.departmentId ? { departmentId: u.departmentId } : {};
    const filteredGoals = Goals.list({ ...goalFilter, limit: 10_000 });
    const goalCounts: Record<string, number> = {};
    for (const g of filteredGoals) goalCounts[g.status] = (goalCounts[g.status] ?? 0) + 1;

    res.json({
      instance: config.instanceId,
      goals: isAdmin(u!) ? Goals.countByStatus() : goalCounts,
      sessions: sessions.metrics(),
      pendingApprovals: Approvals.pending().length,
      tools: tools.list(),
      user: u,
    });
  });

  // ---------- Goals ----------
  r.post('/goals', (req: Request, res: Response) => {
    const parsed = CreateGoalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation', issues: parsed.error.issues });
      return;
    }
    const data = parsed.data;
    const u = req.user!;
    // Non-admin users always create goals under their own department.
    const departmentId = isAdmin(u)
      ? (typeof req.body.departmentId === 'string' ? req.body.departmentId : u.departmentId ?? null)
      : u.departmentId ?? null;
    const goal = Goals.create({
      title: data.title,
      spec: data.spec,
      budget: {
        maxSteps: data.budget?.maxSteps ?? config.defaults.maxSteps,
        maxTokens: data.budget?.maxTokens ?? config.defaults.maxTokens,
        maxCostUsd: data.budget?.maxCostUsd,
        maxWallClockSeconds: data.budget?.maxWallClockSeconds ?? config.defaults.maxWallClockSeconds,
      },
      policy: {
        allowedTools: data.policy?.allowedTools ?? ['noop'],
        deniedDomains: data.policy?.deniedDomains,
        requireApprovalFor: data.policy?.requireApprovalFor,
      },
      createdBy: req.actor ?? u.id,
      departmentId,
    });
    Audit.append(req.actor ?? 'unknown', 'goal.create', goal.id, {
      title: goal.title,
      departmentId,
    });
    res.status(201).json(goal);
  });

  r.get('/goals', (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const u = req.user!;
    const departmentId = isAdmin(u) ? q.departmentId : u.departmentId ?? undefined;
    const list = Goals.list({
      status: q.status as never,
      owner: q.owner,
      departmentId,
      limit: q.limit ? Number(q.limit) : 100,
      offset: q.offset ? Number(q.offset) : 0,
    });
    res.json({ items: list, count: list.length });
  });

  r.get('/goals/:id', (req, res) => {
    if (!gateGoal(req, res, req.params.id)) return;
    const goal = Goals.get(req.params.id)!;
    const runs = Runs.list({ goalId: goal.id });
    const facts = Semantic.list('goal', goal.id);
    res.json({ goal, runs, facts });
  });

  r.post('/goals/:id/start', async (req, res) => {
    if (!gateGoal(req, res, req.params.id)) return;
    try {
      const run = await sessions.startRun(req.params.id, req.actor ?? 'operator');
      res.status(202).json(run);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  r.post('/goals/:id/cancel', (req, res) => {
    if (!gateGoal(req, res, req.params.id)) return;
    Goals.updateStatus(req.params.id, 'cancelled');
    Audit.append(req.actor ?? 'operator', 'goal.cancel', req.params.id, {});
    res.json({ ok: true });
  });

  // ---------- Runs ----------
  r.get('/runs', (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const u = req.user!;
    let goals = Goals.list({
      departmentId: isAdmin(u) ? q.departmentId : u.departmentId ?? undefined,
      limit: 10_000,
    });
    if (q.goalId) goals = goals.filter((g) => g.id === q.goalId);
    const goalIds = new Set(goals.map((g) => g.id));
    const list = Runs.list({
      status: q.status as never,
      limit: q.limit ? Number(q.limit) : 100,
      offset: q.offset ? Number(q.offset) : 0,
    }).filter((run) => isAdmin(u) || goalIds.has(run.goalId));
    res.json({ items: list, count: list.length });
  });

  r.get('/runs/:id', (req, res) => {
    if (!gateRun(req, res, req.params.id)) return;
    const run = Runs.get(req.params.id)!;
    res.json({
      run,
      steps: Steps.listByRun(run.id),
      checkpoints: Checkpoints.listForRun(run.id).map((c) => ({
        id: c.id,
        stepId: c.stepId,
        parent: c.parentCheckpoint,
        reason: c.reason,
        takenAt: c.takenAt,
        sizeBytes: c.sizeBytes,
        stateHash: c.stateHash,
      })),
    });
  });

  r.get('/runs/:id/timeline', (req, res) => {
    if (!gateRun(req, res, req.params.id)) return;
    const events = RunEvents.list(req.params.id, 500);
    res.json({ events });
  });

  r.get('/runs/:id/memory', (req, res) => {
    if (!gateRun(req, res, req.params.id)) return;
    res.json({
      episodic: Episodic.listByRun(req.params.id, 100),
    });
  });

  r.post('/runs/:id/pause', async (req, res) => {
    if (!gateRun(req, res, req.params.id)) return;
    try {
      await sessions.pauseRun(req.params.id, req.actor ?? 'operator');
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  r.post('/runs/:id/resume', async (req, res) => {
    if (!gateRun(req, res, req.params.id)) return;
    try {
      const run = await sessions.resumeRun(req.params.id, req.actor ?? 'operator');
      res.json(run);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  r.post('/runs/:id/stop', async (req, res) => {
    if (!gateRun(req, res, req.params.id)) return;
    try {
      await sessions.stopRun(req.params.id, req.actor ?? 'operator');
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  r.post('/runs/:id/retry', async (req, res) => {
    if (!gateRun(req, res, req.params.id)) return;
    try {
      const run = await sessions.retryStep(req.params.id, req.actor ?? 'operator');
      res.json(run);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ---------- Checkpoints ----------
  r.get('/checkpoints/:id', (req, res) => {
    const cp = Checkpoints.get(req.params.id);
    if (!cp) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    if (!gateRun(req, res, cp.runId)) return;
    res.json(cp);
  });

  r.get('/runs/:id/checkpoints/verify', (req, res) => {
    if (!gateRun(req, res, req.params.id)) return;
    const result = Checkpoints.verifyChain(req.params.id);
    res.json(result);
  });

  r.post('/checkpoints/:id/rollback', (req, res) => {
    const existing = Checkpoints.get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    if (!gateRun(req, res, existing.runId)) return;
    const cp = Checkpoints.rollback(req.params.id);
    if (!cp) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    Audit.append(req.actor ?? 'operator', 'checkpoint.rollback', cp.id, { runId: cp.runId });
    res.json({ ok: true, checkpoint: cp });
  });

  // ---------- Approvals ----------
  r.get('/approvals', (req, res) => {
    const u = req.user!;
    let items = Approvals.pending();
    if (!isAdmin(u)) {
      // Filter to approvals on runs whose goal is in the user's department.
      const myGoals = new Set(
        Goals.list({ departmentId: u.departmentId ?? undefined, limit: 10_000 }).map((g) => g.id),
      );
      items = items.filter((a) => {
        const run = Runs.get(a.runId);
        return run ? myGoals.has(run.goalId) : false;
      });
    }
    res.json({ items });
  });

  r.post('/approvals/:id/decide', async (req, res) => {
    const parsed = DecideApprovalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation', issues: parsed.error.issues });
      return;
    }
    const approval = Approvals.get(req.params.id);
    if (!approval) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    if (!gateRun(req, res, approval.runId)) return;
    Approvals.decide(approval.id, req.actor ?? 'operator', parsed.data.decision, parsed.data.comment);
    Audit.append(req.actor ?? 'operator', `approval.${parsed.data.decision}`, approval.id, {
      runId: approval.runId,
      stepId: approval.stepId,
    });
    if (parsed.data.decision === 'approved') {
      try {
        await sessions.resumeRun(approval.runId, req.actor ?? 'operator');
      } catch (err) {
        logger.warn({ err, runId: approval.runId }, 'resume after approval failed');
      }
    } else {
      try {
        await sessions.stopRun(approval.runId, req.actor ?? 'operator');
      } catch (err) {
        logger.warn({ err, runId: approval.runId }, 'stop after rejection failed');
      }
    }
    res.json({ ok: true });
  });

  // ---------- Audit ----------
  r.get('/audit', (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const items = Audit.search({
      actor: q.actor,
      action: q.action,
      q: q.q,
      since: q.since ? Number(q.since) : undefined,
      until: q.until ? Number(q.until) : undefined,
      limit: q.limit ? Number(q.limit) : 200,
    });
    res.json({ items });
  });

  // ---------- Resignation / offboarding ----------

  /**
   * POST /api/resign — user self-declares resignation.
   * Open to any authenticated identity; the caller can resign their own WA
   * number, or a system token can resign on behalf of a user (e.g. WA bot).
   */
  r.post('/resign', (req: Request, res: Response) => {
    const parsed = ResignSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation', issues: parsed.error.issues });
      return;
    }
    const u = req.user!;
    const targetWa = normalizeWa(parsed.data.waNumber);
    if (u.kind === 'user' && normalizeWa(u.waNumber ?? '') !== targetWa) {
      res.status(403).json({ error: 'forbidden', reason: 'can only resign your own account' });
      return;
    }
    const target = Users.getByWa(targetWa);
    if (!target) {
      res.status(404).json({ error: 'unknown WA number' });
      return;
    }
    if (!target.isActive || target.resignedAt) {
      res.status(409).json({ error: 'already inactive', resignedAt: target.resignedAt });
      return;
    }
    try {
      const updated = Users.resign(targetWa, parsed.data.reason);
      res.json({
        ok: true,
        resignedAt: updated.resignedAt,
        user: {
          id: updated.id,
          waNumber: updated.waNumber,
          name: updated.name,
          isActive: updated.isActive,
        },
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  /**
   * POST /api/admin/remove-user — admin/HR removes a user.
   * Requires admin_system, or jabatan >= manager from the requester WA.
   */
  r.post('/admin/remove-user', (req: Request, res: Response) => {
    const parsed = AdminRemoveUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation', issues: parsed.error.issues });
      return;
    }
    const u = req.user!;
    const removerWa = normalizeWa(parsed.data.removedByWa);
    const remover = Users.getByWa(removerWa);
    // Either the caller is admin_system, or the removedByWa identifies an active
    // manager+ user. Reject otherwise.
    const callerAllowed = isAdmin(u);
    const removerAllowed =
      !!remover && remover.isActive && hasJabatanAtLeast(
        {
          kind: 'user',
          id: remover.id,
          waNumber: remover.waNumber,
          name: remover.name,
          departmentId: remover.departmentId,
          departmentName: null,
          jabatan: remover.jabatan,
        },
        'manager',
      );
    if (!callerAllowed && !removerAllowed) {
      res.status(403).json({ error: 'forbidden', reason: 'admin_system or manager+ required' });
      return;
    }
    const targetWa = normalizeWa(parsed.data.waNumber);
    const target = Users.getByWa(targetWa);
    if (!target) {
      res.status(404).json({ error: 'unknown WA number' });
      return;
    }
    if (!target.isActive || target.resignedAt) {
      res.status(409).json({ error: 'already inactive', resignedAt: target.resignedAt });
      return;
    }
    // Department isolation for non-admin removers — managers can only remove
    // users within their own department.
    if (!callerAllowed && remover && remover.departmentId !== target.departmentId) {
      res.status(403).json({ error: 'forbidden', reason: 'cross-department removal denied' });
      return;
    }
    try {
      const updated = Users.adminRemove(targetWa, removerWa);
      res.json({
        ok: true,
        removedAt: updated.resignedAt,
        removedBy: updated.removedBy,
        user: {
          id: updated.id,
          waNumber: updated.waNumber,
          name: updated.name,
          isActive: updated.isActive,
        },
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  /**
   * GET /api/admin/resigned-users — list resigned/removed accounts.
   * Visible to admin_system, direktur, manager only.
   */
  r.get('/admin/resigned-users', (req: Request, res: Response) => {
    const u = req.user!;
    if (!isAdmin(u) && !hasJabatanAtLeast(u, 'manager')) {
      res.status(403).json({ error: 'forbidden', reason: 'manager+ required' });
      return;
    }
    let items = Users.listResigned();
    if (!isAdmin(u) && u.departmentId) {
      items = items.filter((x) => x.departmentId === u.departmentId);
    }
    const deptMap = new Map(Departments.list().map((d) => [d.id, d.name] as const));
    res.json({
      items: items.map((x) => ({
        id: x.id,
        waNumber: x.waNumber,
        name: x.name,
        departmentId: x.departmentId,
        departmentName: deptMap.get(x.departmentId) ?? null,
        jabatan: x.jabatan,
        resignedAt: x.resignedAt,
        resignationReason: x.resignationReason,
        removedBy: x.removedBy,
      })),
    });
  });

  // ---------- Tools registry ----------
  r.get('/tools', (_req, res) => {
    res.json({ items: tools.list() });
  });

  // ---------- Use case templates / command catalogue ----------

  /**
   * GET /api/templates — list catalogue. Optional filters:
   *   ?department=<slug>     filter to one department; 'cross-department'
   *                          is treated as a department too. When set, the
   *                          response also folds in cross-department
   *                          templates so users see everything relevant.
   *   ?jabatan=<level>       only return templates the level can invoke.
   *                          When absent, falls back to req.user.jabatan.
   *   ?includeAll=1          override the auto-filter — return entire catalog.
   *
   * Returns: { items, count, categories }.
   */
  r.get('/templates', (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const includeAll = q.includeAll === '1' || q.includeAll === 'true';
    const jabatanQ = q.jabatan;
    const jabatan: JabatanLevel | undefined =
      jabatanQ && isJabatanLevel(jabatanQ)
        ? jabatanQ
        : (req.user?.jabatan as JabatanLevel | undefined);

    // Auto-filter: if user has department & no override, restrict to their department
    const userDept = req.user?.departmentId;
    const deptQ = q.department ?? (includeAll ? undefined : userDept);
    let items = CATALOG.slice();

    if (deptQ) {
      if (deptQ === '__all__' || deptQ === 'all') {
        // explicit 'all' — skip department filter, still apply jabatan
      } else if (!isDepartmentId(deptQ)) {
        res.status(400).json({ error: 'invalid department slug' });
        return;
      } else {
        const dept: DepartmentId = deptQ;
        items = items.filter(
          (t) =>
            t.departmentId === dept ||
            t.departmentId === null ||
            t.departmentId === 'cross-department',
        );
      }
    }

    if (jabatan) {
      const rank: Record<JabatanLevel, number> = {
        staff: 1,
        supervisor: 2,
        manager: 3,
        direktur: 4,
        admin_system: 99,
      };
      items = items.filter((t) => rank[jabatan] >= rank[t.minJabatan]);
    }

    const categoryParam = q.category;
    if (categoryParam) {
      items = items.filter((t) => t.category === categoryParam);
    }

    items.sort((a, b) => {
      const da = a.departmentId ?? 'cross-department';
      const db = b.departmentId ?? 'cross-department';
      if (da !== db) return da.localeCompare(db);
      return a.command.localeCompare(b.command);
    });

    const cats = new Set<string>();
    items.forEach((t) => cats.add(t.category));

    res.json({
      items,
      count: items.length,
      categories: [...cats].sort(),
      stakeholderCount: getStakeholderTemplates().length,
    });
  });

  /**
   * GET /api/templates/help — plain-text help suitable for WA/Telegram.
   * No markdown tables, just `/command — title` lines grouped by department.
   * ?jabatan=<level>  optional override; defaults to req.user.jabatan.
   * ?format=json      return as JSON instead of text.
   */
  r.get('/templates/help', (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const jabatanQ = q.jabatan;
    const jabatan: JabatanLevel =
      (jabatanQ && isJabatanLevel(jabatanQ) ? jabatanQ : null) ??
      (req.user?.jabatan as JabatanLevel | undefined) ??
      'staff';

    if (q.format === 'json') {
      res.json({
        jabatan,
        text: formatHelpText(jabatan),
        totalTemplates: CATALOG.length,
      });
      return;
    }
    res.type('text/plain').send(formatHelpText(jabatan));
  });

  /**
   * GET /api/templates/categories — categories for a department.
   */
  r.get('/templates/categories', (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const deptQ = q.department;
    const dept: string | null =
      !deptQ || deptQ === 'all'
        ? null
        : isDepartmentId(deptQ)
          ? deptQ
          : null;
    res.json({ items: getCategories(dept) });
  });

  /**
   * GET /api/templates/:command — single template by slash command.
   * Command can be given with or without leading slash.
   */
  r.get('/templates/:command', (req: Request, res: Response) => {
    const raw = String(req.params.command);
    const command = raw.startsWith('/') ? raw : `/${raw}`;
    const tpl = getTemplateByCommand(command);
    if (!tpl) {
      res.status(404).json({ error: 'template not found', command });
      return;
    }

    // RBAC: check if user is authorized for this template's department + jabatan
    const u = req.user;
    if (u) {
      const userLevel = ({ staff: 1, supervisor: 2, manager: 3, direktur: 4, admin_system: 99 } as Record<string, number>)[u.jabatan] ?? 0;
      const reqLevel = ({ staff: 1, supervisor: 2, manager: 3, direktur: 4, admin_system: 99 } as Record<string, number>)[tpl.minJabatan] ?? 999;

      if (u.jabatan !== 'admin_system' && tpl.departmentId && tpl.departmentId !== 'cross-department') {
        if (tpl.departmentId !== u.departmentId) {
          res.status(403).json({
            error: 'forbidden',
            message: 'Template ini khusus untuk departemen ' + tpl.departmentId.toUpperCase() + '. Anda dari ' + (u.departmentName ?? u.departmentId?.toUpperCase() ?? 'unknown') + ' tidak memiliki akses.',
            command,
            templateDepartment: tpl.departmentId,
            userDepartment: u.departmentId,
          });
          return;
        }
      }

      if (userLevel < reqLevel && u.jabatan !== 'admin_system') {
        res.status(403).json({
          error: 'forbidden',
          message: 'Template ini membutuhkan jabatan minimal ' + tpl.minJabatan + '. Jabatan Anda: ' + u.jabatan,
          command,
          minJabatan: tpl.minJabatan,
          userJabatan: u.jabatan,
        });
        return;
      }
    }

    res.json(tpl);
  });

  // ---------- Chat / Ask — scope-enforced conversation ----------
  /**
   * POST /api/chat — Send a message to the AI. Scope is auto-injected.
   * The AI will refuse to answer questions outside the user's department + jabatan.
   */
  r.post('/chat', async (req: Request, res: Response) => {
    const u = req.user;
    if (!u) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const scopeNote = getScopePrompt(
      u.departmentId ?? null,
      u.jabatan as import('../rbac/types.js').JabatanLevel,
    );

    const llm = getLLMProvider();
    const response = await llm.complete({
      messages: [
        {
          role: 'system',
          content: `Anda adalah asisten AI GATRA untuk ${u.departmentName ?? 'departemen ' + (u.departmentId ?? 'perusahaan')}.

${scopeNote}

${u.jabatan === 'admin_system' ? 'Anda memiliki akses penuh.' : ''}

Selalu gunakan Bahasa Indonesia. Jika ada pertanyaan di luar wewenang, tolak dengan sopan dan sarankan departemen yang tepat.`,
        },
        { role: 'user', content: message },
      ],
      temperature: 0.3,
      maxTokens: 2048,
    });

    res.json({ reply: response.text, scope: { department: u.departmentId, jabatan: u.jabatan } });
  });

  // ---------- Error fallthrough ----------
  r.use((err: unknown, _req: Request, res: Response, _next: () => void) => {
    logger.error({ err }, 'unhandled route error');
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'validation', issues: err.issues });
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  });

  return r;
}
