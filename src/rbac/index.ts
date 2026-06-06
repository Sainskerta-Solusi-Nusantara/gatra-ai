// Public surface for the RBAC module.

export {
  ACCESS_LEVELS,
  ACCESS_RANK,
  JABATAN_LEVELS,
  JABATAN_RANK,
  isAccessLevel,
  isJabatanLevel,
  type AccessLevel,
  type AuthIdentity,
  type Department,
  type FolderAction,
  type FolderPermission,
  type JabatanLevel,
  type PolicyDecision,
  type User,
} from './types.js';

export { Departments, FolderPermissions, Users, normalizeFolder, normalizeWa } from './store.js';
export { canAccessDepartment, canManageRbac, canUserAccess, hasJabatanAtLeast, isAdmin } from './policies.js';
export { seedRbac, type SeedResult } from './seeds.js';
export {
  authenticate,
  requireActiveUser,
  requireAdmin,
  requireAuth,
  requireDepartmentAccess,
  requireFolderAccess,
  requireJabatan,
} from './middleware.js';
export { signJwt, verifyJwt, type JwtClaims } from './jwt.js';
