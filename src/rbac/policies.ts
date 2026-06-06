// Policy decisions for RBAC. Pure functions over store + identity — no side effects.

import { FolderPermissions, normalizeFolder } from './store.js';
import {
  ACCESS_RANK,
  type AccessLevel,
  type AuthIdentity,
  type FolderAction,
  JABATAN_RANK,
  type JabatanLevel,
  type PolicyDecision,
} from './types.js';

/** admin_system bypasses department isolation; everyone else is locked to theirs. */
export function isAdmin(identity: AuthIdentity): boolean {
  return identity.jabatan === 'admin_system';
}

export function hasJabatanAtLeast(identity: AuthIdentity, level: JabatanLevel): boolean {
  return JABATAN_RANK[identity.jabatan] >= JABATAN_RANK[level];
}

/**
 * Department-scoped resource gate.
 * Admin sees everything; everyone else sees their own department's data only.
 * `null` resource department means "system-owned, no department" — admin only.
 */
export function canAccessDepartment(
  identity: AuthIdentity,
  resourceDepartmentId: string | null,
): PolicyDecision {
  if (isAdmin(identity)) return { allowed: true, reason: 'admin_system' };
  if (!resourceDepartmentId) {
    return { allowed: false, reason: 'system-owned resource requires admin_system' };
  }
  if (identity.departmentId === resourceDepartmentId) {
    return { allowed: true, reason: 'same-department' };
  }
  return { allowed: false, reason: 'cross-department access denied' };
}

/** Most-specific matching folder permission wins (longest prefix). */
function bestMatch(
  departmentId: string,
  folderPath: string,
): { level: AccessLevel; matched: string } | null {
  const target = normalizeFolder(folderPath);
  const perms = FolderPermissions.listForDepartment(departmentId);
  let best: { level: AccessLevel; matched: string } | null = null;
  for (const p of perms) {
    const base = p.folderPath;
    const prefix = base === '/' ? '/' : `${base}/`;
    if (target === base || target.startsWith(prefix)) {
      if (!best || base.length > best.matched.length) {
        best = { level: p.accessLevel, matched: base };
      }
    }
  }
  return best;
}

/** Map a request action to the minimum AccessLevel it requires. */
function requiredLevel(action: FolderAction): AccessLevel {
  if (action === 'admin') return 'admin';
  if (action === 'write') return 'write';
  return 'read';
}

/**
 * Folder access gate. Walks the longest-prefix permission and compares ranks.
 * Admin shortcut for ops convenience: bypasses folder grants entirely.
 */
export function canUserAccess(
  identity: AuthIdentity,
  folderPath: string,
  action: FolderAction,
): PolicyDecision {
  if (isAdmin(identity)) return { allowed: true, reason: 'admin_system' };
  if (!identity.departmentId) {
    return { allowed: false, reason: 'no department on identity' };
  }
  const match = bestMatch(identity.departmentId, folderPath);
  if (!match) {
    return { allowed: false, reason: `no grant covers ${normalizeFolder(folderPath)}` };
  }
  const required = requiredLevel(action);
  if (ACCESS_RANK[match.level] < ACCESS_RANK[required]) {
    return {
      allowed: false,
      reason: `grant on ${match.matched} is '${match.level}', needs '${required}'`,
    };
  }
  return { allowed: true, reason: `grant on ${match.matched} (${match.level})` };
}

/** Gate for mutating user/department records — supervisor+ can read, only admin_system writes. */
export function canManageRbac(identity: AuthIdentity, action: 'read' | 'write'): PolicyDecision {
  if (isAdmin(identity)) return { allowed: true, reason: 'admin_system' };
  if (action === 'read' && hasJabatanAtLeast(identity, 'manager')) {
    return { allowed: true, reason: 'manager+ may read RBAC' };
  }
  return { allowed: false, reason: 'admin_system required' };
}
