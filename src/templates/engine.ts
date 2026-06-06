// Template engine — filter & serve use-case templates

import { CATALOG } from './catalog.js';
import {
  DEPARTMENT_NAMES,
  JABATAN_NAMES,
  type DepartmentId,
  type HelpGroup,
  type JabatanLevel,
  type UseCaseTemplate,
} from './types.js';

const JABATAN_ORDER: Record<JabatanLevel, number> = {
  staff: 0,
  supervisor: 1,
  manager: 2,
  direktur: 3,
  admin_system: 999,
};

function jabatanLevel(level: JabatanLevel): number {
  return JABATAN_ORDER[level] ?? 0;
}

/** Filter templates by department & user's jabatan (returns templates they're eligible for) */
export function getTemplates(
  departmentId: string | null,
  userJabatan: JabatanLevel,
): UseCaseTemplate[] {
  const userLevel = jabatanLevel(userJabatan);
  return CATALOG.filter(
    (t) =>
      t.departmentId === departmentId &&
      jabatanLevel(t.minJabatan) <= userLevel,
  );
}

/** Find a template by its command string */
export function getTemplateByCommand(command: string): UseCaseTemplate | null {
  return CATALOG.find((t) => t.command === command) ?? null;
}

/** Get unique categories for a department */
export function getCategories(departmentId: string | null): string[] {
  const cats = new Set<string>();
  for (const t of CATALOG) {
    if (t.departmentId === departmentId) cats.add(t.category);
  }
  return [...cats].sort();
}

/** Get cross-department / stakeholder templates */
export function getStakeholderTemplates(): UseCaseTemplate[] {
  return CATALOG.filter((t) => t.departmentId === null);
}

/** Get all templates for a specific jabatan level across all departments */
export function getAllTemplatesByJabatan(jabatan: JabatanLevel): UseCaseTemplate[] {
  const level = jabatanLevel(jabatan);
  return CATALOG.filter((t) => jabatanLevel(t.minJabatan) <= level);
}

/** Get all templates grouped by department + jabatan for help display */
export function getHelpGroups(jabatan: JabatanLevel): HelpGroup[] {
  const userLevel = jabatanLevel(jabatan);
  const groups: Record<string, UseCaseTemplate[]> = {};

  for (const t of CATALOG) {
    if (jabatanLevel(t.minJabatan) > userLevel) continue;
    const key = `${t.departmentId ?? 'cross'}:${t.minJabatan}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }

  return Object.entries(groups).map(([key, templates]) => {
    const [deptRaw, jab] = key.split(':') as [string, JabatanLevel];
    const deptId: DepartmentId | null =
      deptRaw === 'cross' ? null : (deptRaw as DepartmentId);
    const departmentName =
      deptId === null
        ? 'Lintas Departemen'
        : DEPARTMENT_NAMES[deptId] ?? deptRaw;
    return {
      departmentId: deptId,
      departmentName,
      jabatan: jab,
      jabatanName: JABATAN_NAMES[jab] ?? jab,
      templates,
    };
  });
}

/** Format help text for WA/Telegram (no markdown tables) */
export function formatHelpText(jabatan: JabatanLevel): string {
  const groups = getHelpGroups(jabatan);
  const parts: string[] = ['📋 *Daftar Perintah Tersedia*\n'];

  for (const group of groups) {
    parts.push(`━━━ ${group.departmentName} • ${group.jabatanName} ━━━`);
    for (const t of group.templates) {
      parts.push(`${t.command} — ${t.title}`);
      parts.push(`   ${t.description}`);
      parts.push('');
    }
  }

  parts.push('💡 *Tips:*');
  parts.push('Ketik /help untuk lihat semua perintah');
  parts.push('Ketik /[perintah] untuk langsung eksekusi');
  parts.push('Ketik /templates [departemen] untuk lihat per departemen');

  return parts.join('\n');
}
