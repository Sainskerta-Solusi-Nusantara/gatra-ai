// RBAC domain types — Department, User, Jabatan, Folder permissions.

export const JABATAN_LEVELS = ['staff', 'supervisor', 'manager', 'direktur', 'admin_system'] as const;
export type JabatanLevel = (typeof JABATAN_LEVELS)[number];

export const JABATAN_RANK: Record<JabatanLevel, number> = {
  staff: 1,
  supervisor: 2,
  manager: 3,
  direktur: 4,
  admin_system: 99,
};

export const ACCESS_LEVELS = ['read', 'write', 'admin'] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export const ACCESS_RANK: Record<AccessLevel, number> = {
  read: 1,
  write: 2,
  admin: 3,
};

export type FolderAction = 'read' | 'write' | 'admin';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  createdAt: number;
}

export interface User {
  id: string;
  waNumber: string;
  name: string;
  departmentId: string;
  jabatan: JabatanLevel;
  isActive: boolean;
  resignedAt: number | null;
  resignationReason: string | null;
  removedBy: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface FolderPermission {
  id: string;
  departmentId: string;
  folderPath: string;
  accessLevel: AccessLevel;
  createdAt: number;
}

/**
 * Resolved identity for a request. Attached to req.user by RBAC middleware.
 * `kind` distinguishes a real user (JWT/WA-resolved) from a system actor
 * (long-lived API token used by CI / sysadmin).
 */
export interface AuthIdentity {
  kind: 'user' | 'system';
  id: string;
  waNumber: string | null;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  jabatan: JabatanLevel;
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
}

export function isJabatanLevel(v: unknown): v is JabatanLevel {
  return typeof v === 'string' && (JABATAN_LEVELS as readonly string[]).includes(v);
}

export function isAccessLevel(v: unknown): v is AccessLevel {
  return typeof v === 'string' && (ACCESS_LEVELS as readonly string[]).includes(v);
}
