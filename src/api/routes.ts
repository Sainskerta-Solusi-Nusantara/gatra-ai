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
  AdminRemoveUserSchema,
  CreateGoalSchema,
  DecideApprovalSchema,
  ResignSchema,
} from './validators.js';

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
