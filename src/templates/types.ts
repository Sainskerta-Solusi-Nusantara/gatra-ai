// Types for use-case templates / command catalogue

export type JabatanLevel = 'staff' | 'supervisor' | 'manager' | 'direktur' | 'admin_system';

export type OutputFormat = 'report' | 'notification' | 'data' | 'action' | 'analysis' | 'dataset' | 'dashboard' | 'file' | 'approval';
export type Frequency = 'one-time' | 'daily' | 'weekly' | 'monthly' | 'continuous' | 'quarterly' | 'on-demand';

export type DepartmentSlug = DepartmentId;

export type DepartmentId =
  | 'it'
  | 'hrd'
  | 'finance'
  | 'operations'
  | 'legal'
  | 'marketing'
  | 'procurement'
  | 'cs'
  | 'ga'
  | 'cross-department';

export interface UseCaseTemplate {
  id: string;
  departmentId: DepartmentId | null;  // null = cross-department
  minJabatan: JabatanLevel;
  command: string;
  category: string;
  title: string;
  description: string;
  exampleGoal: string;
  outputFormat: OutputFormat;
  frequency: Frequency;
  stakeholders: string[];
}

export interface HelpGroup {
  departmentId: DepartmentId | null;
  departmentName: string;
  jabatan: JabatanLevel;
  jabatanName: string;
  templates: UseCaseTemplate[];
}

// ---------- Catalogue display metadata ----------

export const DEPARTMENT_IDS: DepartmentId[] = [
  'it',
  'hrd',
  'finance',
  'operations',
  'legal',
  'marketing',
  'procurement',
  'cs',
  'ga',
  'cross-department',
];

/** Map department slug → human display name. */
export const DEPARTMENT_NAMES: Record<DepartmentId, string> = {
  it: 'IT',
  hrd: 'HRD',
  finance: 'Finance',
  operations: 'Operations',
  legal: 'Legal',
  marketing: 'Marketing',
  procurement: 'Procurement',
  cs: 'Customer Service',
  ga: 'General Affairs',
  'cross-department': 'Cross-Department',
};

export const JABATAN_NAMES: Record<JabatanLevel, string> = {
  staff: 'Staff',
  supervisor: 'Supervisor',
  manager: 'Manager',
  direktur: 'Direktur',
  admin_system: 'Admin Sistem',
};

export const JABATAN_RANK: Record<JabatanLevel, number> = {
  staff: 1,
  supervisor: 2,
  manager: 3,
  direktur: 4,
  admin_system: 99,
};

export function isDepartmentId(v: unknown): v is DepartmentId {
  return typeof v === 'string' && (DEPARTMENT_IDS as readonly string[]).includes(v);
}
