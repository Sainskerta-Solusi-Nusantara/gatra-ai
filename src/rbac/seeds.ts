// Idempotent seed data — default departments, folder grants, and the bootstrap admin.

import { logger } from '../logger.js';
import { Departments, FolderPermissions, Users } from './store.js';
import type { JabatanLevel } from './types.js';

interface SeedSpec {
  name: string;
  description: string;
  folders: { path: string; level: 'read' | 'write' | 'admin' }[];
}

const DEFAULT_DEPARTMENTS: SeedSpec[] = [
  {
    name: 'HRD',
    description: 'Human Resources Development — kepegawaian, payroll, training.',
    folders: [
      { path: '/hr', level: 'admin' },
      { path: '/shared/policies', level: 'read' },
    ],
  },
  {
    name: 'IT',
    description: 'Information Technology — infrastruktur, aplikasi, security.',
    folders: [
      { path: '/it', level: 'admin' },
      { path: '/shared', level: 'write' },
    ],
  },
  {
    name: 'Finance',
    description: 'Keuangan — akuntansi, treasury, pajak.',
    folders: [
      { path: '/finance', level: 'admin' },
      { path: '/shared/reports', level: 'read' },
    ],
  },
  {
    name: 'Operations',
    description: 'Operasional — produksi, logistik, supply chain.',
    folders: [
      { path: '/ops', level: 'admin' },
      { path: '/shared', level: 'read' },
    ],
  },
  {
    name: 'Legal',
    description: 'Hukum & compliance — kontrak, regulasi, litigasi.',
    folders: [
      { path: '/legal', level: 'admin' },
      { path: '/shared/policies', level: 'write' },
    ],
  },
  {
    name: 'Marketing',
    description: 'Marketing & komunikasi — kampanye, brand, market research.',
    folders: [
      { path: '/marketing', level: 'admin' },
      { path: '/shared/reports', level: 'read' },
    ],
  },
  {
    name: 'Procurement',
    description: 'Procurement — vendor, pengadaan, kontrak vendor.',
    folders: [
      { path: '/procurement', level: 'admin' },
      { path: '/shared/policies', level: 'read' },
    ],
  },
  {
    name: 'Customer Service',
    description: 'Customer service — penanganan keluhan, NPS, escalation.',
    folders: [
      { path: '/cs', level: 'admin' },
      { path: '/shared', level: 'read' },
    ],
  },
  {
    name: 'General Affairs',
    description: 'General Affairs — aset, fasilitas, vendor non-IT.',
    folders: [
      { path: '/ga', level: 'admin' },
      { path: '/shared/reports', level: 'read' },
    ],
  },
];

interface UserSeed {
  waNumber: string;
  name: string;
  department: string;
  jabatan: JabatanLevel;
}

const DEFAULT_USERS: UserSeed[] = [
  { waNumber: '+62-811-0000-0001', name: 'Admin Sistem', department: 'IT', jabatan: 'admin_system' },
  { waNumber: '+62-811-0001-0001', name: 'Dewi Anggraini', department: 'HRD', jabatan: 'manager' },
  { waNumber: '+62-811-0001-0002', name: 'Bayu Pratama', department: 'HRD', jabatan: 'staff' },
  { waNumber: '+62-811-0002-0001', name: 'Rizal Hakim', department: 'IT', jabatan: 'direktur' },
  { waNumber: '+62-811-0002-0002', name: 'Sari Nuraini', department: 'IT', jabatan: 'supervisor' },
  { waNumber: '+62-811-0003-0001', name: 'Hendra Setiawan', department: 'Finance', jabatan: 'manager' },
  { waNumber: '+62-811-0003-0002', name: 'Putri Maharani', department: 'Finance', jabatan: 'staff' },
  { waNumber: '+62-811-0004-0001', name: 'Agus Wibowo', department: 'Operations', jabatan: 'manager' },
  { waNumber: '+62-811-0005-0001', name: 'Indira Wulandari', department: 'Legal', jabatan: 'direktur' },
];

export interface SeedResult {
  departmentsCreated: number;
  departmentsExisting: number;
  usersCreated: number;
  usersExisting: number;
  foldersGranted: number;
}

export function seedRbac(opts: { quiet?: boolean } = {}): SeedResult {
  const result: SeedResult = {
    departmentsCreated: 0,
    departmentsExisting: 0,
    usersCreated: 0,
    usersExisting: 0,
    foldersGranted: 0,
  };

  for (const spec of DEFAULT_DEPARTMENTS) {
    const existing = Departments.getByName(spec.name);
    const dept = existing ?? Departments.create({ name: spec.name, description: spec.description });
    if (existing) result.departmentsExisting += 1;
    else result.departmentsCreated += 1;
    for (const folder of spec.folders) {
      FolderPermissions.grant({
        departmentId: dept.id,
        folderPath: folder.path,
        accessLevel: folder.level,
      });
      result.foldersGranted += 1;
    }
  }

  for (const u of DEFAULT_USERS) {
    const dept = Departments.getByName(u.department);
    if (!dept) {
      if (!opts.quiet) logger.warn({ user: u.waNumber, dept: u.department }, 'seed user skipped — dept missing');
      continue;
    }
    const existing = Users.getByWa(u.waNumber);
    if (existing) {
      result.usersExisting += 1;
      continue;
    }
    Users.create({
      waNumber: u.waNumber,
      name: u.name,
      departmentId: dept.id,
      jabatan: u.jabatan,
    });
    result.usersCreated += 1;
  }

  if (!opts.quiet) logger.info(result, 'rbac seed complete');
  return result;
}
