import { ulid } from 'ulid';
import { openDb } from '../memory/db.js';
import { logger } from '../logger.js';
import { Audit, RunEvents, Runs } from '../memory/memory.js';
import type {
  AccessLevel,
  Department,
  FolderPermission,
  JabatanLevel,
  User,
} from './types.js';

const now = () => Date.now();

interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  created_at: number;
}

function mapDepartment(r: DepartmentRow): Department {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    createdAt: r.created_at,
  };
}

interface UserRow {
  id: string;
  wa_number: string;
  name: string;
  department_id: string;
  jabatan: string;
  is_active: number;
  resigned_at: number | null;
  resignation_reason: string | null;
  removed_by: string | null;
  created_at: number;
  updated_at: number;
}

function mapUser(r: UserRow): User {
  return {
    id: r.id,
    waNumber: r.wa_number,
    name: r.name,
    departmentId: r.department_id,
    jabatan: r.jabatan as JabatanLevel,
    isActive: r.is_active === 1,
    resignedAt: r.resigned_at ?? null,
    resignationReason: r.resignation_reason ?? null,
    removedBy: r.removed_by ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface FolderPermissionRow {
  id: string;
  department_id: string;
  folder_path: string;
  access_level: string;
  created_at: number;
}

function mapFolderPermission(r: FolderPermissionRow): FolderPermission {
  return {
    id: r.id,
    departmentId: r.department_id,
    folderPath: r.folder_path,
    accessLevel: r.access_level as AccessLevel,
    createdAt: r.created_at,
  };
}

/** WhatsApp numbers come in many shapes — normalise to digits-only so lookups match. */
export function normalizeWa(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

// ---------- Departments ----------

export const Departments = {
  create(input: { name: string; description?: string | null }): Department {
    const db = openDb();
    const id = ulid();
    const t = now();
    db.prepare(
      `INSERT INTO e_department(id, name, description, created_at) VALUES(?,?,?,?)`,
    ).run(id, input.name, input.description ?? null, t);
    return { id, name: input.name, description: input.description ?? null, createdAt: t };
  },

  upsertByName(name: string, description?: string | null): Department {
    const db = openDb();
    const existing = db
      .prepare(`SELECT * FROM e_department WHERE name = ?`)
      .get(name) as DepartmentRow | undefined;
    if (existing) return mapDepartment(existing);
    return Departments.create({ name, description: description ?? null });
  },

  get(id: string): Department | null {
    const db = openDb();
    const row = db.prepare(`SELECT * FROM e_department WHERE id = ?`).get(id) as
      | DepartmentRow
      | undefined;
    return row ? mapDepartment(row) : null;
  },

  getByName(name: string): Department | null {
    const db = openDb();
    const row = db.prepare(`SELECT * FROM e_department WHERE name = ?`).get(name) as
      | DepartmentRow
      | undefined;
    return row ? mapDepartment(row) : null;
  },

  list(): Department[] {
    const db = openDb();
    const rows = db
      .prepare(`SELECT * FROM e_department ORDER BY name ASC`)
      .all() as DepartmentRow[];
    return rows.map(mapDepartment);
  },

  update(id: string, fields: { name?: string; description?: string | null }): Department | null {
    const db = openDb();
    const sets: string[] = [];
    const params: unknown[] = [];
    if (fields.name !== undefined) {
      sets.push('name = ?');
      params.push(fields.name);
    }
    if (fields.description !== undefined) {
      sets.push('description = ?');
      params.push(fields.description);
    }
    if (!sets.length) return Departments.get(id);
    params.push(id);
    db.prepare(`UPDATE e_department SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return Departments.get(id);
  },

  delete(id: string): void {
    const db = openDb();
    db.prepare(`DELETE FROM e_department WHERE id = ?`).run(id);
  },
};

// ---------- Users ----------

export const Users = {
  create(input: {
    waNumber: string;
    name: string;
    departmentId: string;
    jabatan: JabatanLevel;
    isActive?: boolean;
  }): User {
    const db = openDb();
    const id = ulid();
    const t = now();
    const wa = normalizeWa(input.waNumber);
    const isActive = input.isActive === undefined ? true : input.isActive;
    db.prepare(
      `INSERT INTO e_user(id, wa_number, name, department_id, jabatan, is_active, created_at, updated_at)
       VALUES(?,?,?,?,?,?,?,?)`,
    ).run(id, wa, input.name, input.departmentId, input.jabatan, isActive ? 1 : 0, t, t);
    return {
      id,
      waNumber: wa,
      name: input.name,
      departmentId: input.departmentId,
      jabatan: input.jabatan,
      isActive,
      resignedAt: null,
      resignationReason: null,
      removedBy: null,
      createdAt: t,
      updatedAt: t,
    };
  },

  upsertByWa(input: {
    waNumber: string;
    name: string;
    departmentId: string;
    jabatan: JabatanLevel;
    isActive?: boolean;
  }): User {
    const wa = normalizeWa(input.waNumber);
    const existing = Users.getByWa(wa);
    if (existing) {
      Users.update(existing.id, {
        name: input.name,
        departmentId: input.departmentId,
        jabatan: input.jabatan,
        isActive: input.isActive ?? existing.isActive,
      });
      return Users.get(existing.id) as User;
    }
    return Users.create({ ...input, waNumber: wa });
  },

  get(id: string): User | null {
    const db = openDb();
    const row = db.prepare(`SELECT * FROM e_user WHERE id = ?`).get(id) as UserRow | undefined;
    return row ? mapUser(row) : null;
  },

  getByWa(waNumber: string): User | null {
    const db = openDb();
    const wa = normalizeWa(waNumber);
    const row = db.prepare(`SELECT * FROM e_user WHERE wa_number = ?`).get(wa) as
      | UserRow
      | undefined;
    return row ? mapUser(row) : null;
  },

  list(
    filter: {
      departmentId?: string;
      jabatan?: JabatanLevel;
      isActive?: boolean;
      resigned?: boolean;
    } = {},
  ): User[] {
    const db = openDb();
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter.departmentId) {
      where.push('department_id = ?');
      params.push(filter.departmentId);
    }
    if (filter.jabatan) {
      where.push('jabatan = ?');
      params.push(filter.jabatan);
    }
    if (filter.isActive !== undefined) {
      where.push('is_active = ?');
      params.push(filter.isActive ? 1 : 0);
    }
    if (filter.resigned !== undefined) {
      where.push(filter.resigned ? 'resigned_at IS NOT NULL' : 'resigned_at IS NULL');
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = db
      .prepare(`SELECT * FROM e_user ${whereSql} ORDER BY created_at DESC`)
      .all(...params) as UserRow[];
    return rows.map(mapUser);
  },

  /**
   * User-initiated resignation. Deactivates the account, records timestamp +
   * reason, terminates any active sessions, and appends to the audit log.
   */
  resign(waNumber: string, reason?: string | null): User {
    const wa = normalizeWa(waNumber);
    const user = Users.getByWa(wa);
    if (!user) throw new Error('user not found');
    if (!user.isActive || user.resignedAt) {
      throw new Error('user already inactive');
    }
    const db = openDb();
    const t = now();
    db.prepare(
      `UPDATE e_user
         SET is_active = 0,
             resigned_at = ?,
             resignation_reason = ?,
             removed_by = NULL,
             updated_at = ?
       WHERE id = ?`,
    ).run(t, reason ?? null, t, user.id);
    Users.terminateActiveSessions(user.id, `resignation:${user.waNumber}`);
    Audit.append(user.waNumber, 'user.resign', user.id, { wa: user.waNumber, reason: reason ?? null });
    logger.info({ userId: user.id, wa: user.waNumber }, 'user resigned');
    return Users.get(user.id) as User;
  },

  /**
   * Admin/HR-initiated removal. Same effect as resignation but records the
   * actor who removed the account in `removed_by`.
   */
  adminRemove(waNumber: string, removedByWa: string): User {
    const wa = normalizeWa(waNumber);
    const user = Users.getByWa(wa);
    if (!user) throw new Error('user not found');
    if (!user.isActive || user.resignedAt) {
      throw new Error('user already inactive');
    }
    const remover = normalizeWa(removedByWa);
    const db = openDb();
    const t = now();
    db.prepare(
      `UPDATE e_user
         SET is_active = 0,
             resigned_at = ?,
             resignation_reason = NULL,
             removed_by = ?,
             updated_at = ?
       WHERE id = ?`,
    ).run(t, remover, t, user.id);
    Users.terminateActiveSessions(user.id, `admin-remove:${user.waNumber}`);
    Audit.append(remover, 'user.admin_remove', user.id, {
      wa: user.waNumber,
      removedBy: remover,
    });
    logger.info({ userId: user.id, wa: user.waNumber, removedBy: remover }, 'user removed by admin');
    return Users.get(user.id) as User;
  },

  /** All users currently flagged as resigned/removed, newest first. */
  listResigned(): User[] {
    const db = openDb();
    const rows = db
      .prepare(`SELECT * FROM e_user WHERE resigned_at IS NOT NULL ORDER BY resigned_at DESC`)
      .all() as UserRow[];
    return rows.map(mapUser);
  },

  /**
   * Whether a given WA number maps to an active, non-resigned user.
   * Used by the WA bot pre-flight and by middleware.
   */
  isActive(waNumber: string): boolean {
    const user = Users.getByWa(waNumber);
    return !!user && user.isActive && !user.resignedAt;
  },

  /**
   * Terminate any active agent runs belonging to a user. Runs are tied to a
   * goal (which carries createdBy), so we cancel goals owned by the user and
   * release run leases. Best-effort — errors are logged but don't throw.
   */
  terminateActiveSessions(userId: string, reason: string): void {
    try {
      const db = openDb();
      const user = Users.get(userId);
      const actorKey = user?.waNumber ?? userId;
      const goalRows = db
        .prepare(`SELECT id FROM e_goal WHERE created_by = ?`)
        .all(actorKey) as { id: string }[];
      const goalIds = new Set(goalRows.map((g) => g.id));
      if (!goalIds.size) return;
      const t = Date.now();
      for (const goalId of goalIds) {
        const runs = Runs.list({ goalId, limit: 1000 });
        for (const run of runs) {
          if (['succeeded', 'failed', 'stopped', 'orphaned'].includes(run.status)) continue;
          Runs.updateStatus(run.id, 'stopped', { endedAt: t, errorMessage: reason });
          db.prepare(`DELETE FROM e_run_lease WHERE run_id = ?`).run(run.id);
          RunEvents.append(run.id, 'session.terminated', { reason, userId });
          Audit.append(actorKey, 'run.terminated', run.id, { reason, userId });
        }
        db.prepare(`UPDATE e_goal SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(t, goalId);
      }
      logger.info({ userId, goals: goalIds.size }, 'terminated sessions for user');
    } catch (err) {
      logger.warn({ err, userId }, 'terminateActiveSessions failed');
    }
  },

  update(
    id: string,
    fields: {
      name?: string;
      departmentId?: string;
      jabatan?: JabatanLevel;
      isActive?: boolean;
      waNumber?: string;
    },
  ): User | null {
    const db = openDb();
    const sets: string[] = ['updated_at = ?'];
    const params: unknown[] = [now()];
    if (fields.name !== undefined) {
      sets.push('name = ?');
      params.push(fields.name);
    }
    if (fields.departmentId !== undefined) {
      sets.push('department_id = ?');
      params.push(fields.departmentId);
    }
    if (fields.jabatan !== undefined) {
      sets.push('jabatan = ?');
      params.push(fields.jabatan);
    }
    if (fields.isActive !== undefined) {
      sets.push('is_active = ?');
      params.push(fields.isActive ? 1 : 0);
    }
    if (fields.waNumber !== undefined) {
      sets.push('wa_number = ?');
      params.push(normalizeWa(fields.waNumber));
    }
    params.push(id);
    db.prepare(`UPDATE e_user SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return Users.get(id);
  },

  delete(id: string): void {
    const db = openDb();
    db.prepare(`DELETE FROM e_user WHERE id = ?`).run(id);
  },
};

// ---------- Folder permissions ----------

export const FolderPermissions = {
  grant(input: {
    departmentId: string;
    folderPath: string;
    accessLevel: AccessLevel;
  }): FolderPermission {
    const db = openDb();
    const id = ulid();
    const t = now();
    const folder = normalizeFolder(input.folderPath);
    db.prepare(
      `INSERT INTO e_folder_permission(id, department_id, folder_path, access_level, created_at)
         VALUES(?,?,?,?,?)
       ON CONFLICT(department_id, folder_path) DO UPDATE SET
         access_level = excluded.access_level`,
    ).run(id, input.departmentId, folder, input.accessLevel, t);
    return {
      id,
      departmentId: input.departmentId,
      folderPath: folder,
      accessLevel: input.accessLevel,
      createdAt: t,
    };
  },

  revoke(departmentId: string, folderPath: string): void {
    const db = openDb();
    db.prepare(
      `DELETE FROM e_folder_permission WHERE department_id = ? AND folder_path = ?`,
    ).run(departmentId, normalizeFolder(folderPath));
  },

  listForDepartment(departmentId: string): FolderPermission[] {
    const db = openDb();
    const rows = db
      .prepare(
        `SELECT * FROM e_folder_permission WHERE department_id = ? ORDER BY folder_path ASC`,
      )
      .all(departmentId) as FolderPermissionRow[];
    return rows.map(mapFolderPermission);
  },

  listAll(): FolderPermission[] {
    const db = openDb();
    const rows = db
      .prepare(`SELECT * FROM e_folder_permission ORDER BY department_id ASC, folder_path ASC`)
      .all() as FolderPermissionRow[];
    return rows.map(mapFolderPermission);
  },
};

/** Folder paths are stored without trailing slash; '/' is the root sentinel. */
export function normalizeFolder(p: string): string {
  if (!p) return '/';
  let out = p.trim();
  if (!out.startsWith('/')) out = `/${out}`;
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}
