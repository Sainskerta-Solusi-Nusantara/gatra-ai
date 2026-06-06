import { config } from '../config.js';
import { Goals, migrate } from '../memory/memory.js';
import { logger } from '../logger.js';
import { Departments, Users, seedRbac } from '../rbac/index.js';
import { Templates } from '../templates/store.js';

migrate();

// Seed RBAC first so the sample goal has a department to live in.
const rbacResult = seedRbac();
logger.info(rbacResult, 'rbac seeded');

// Seed the use case template catalogue. Idempotent: every run wipes and
// re-inserts from the in-memory CATALOG, so deleted templates fall away
// and new ones appear automatically.
const templatesResult = Templates.seedFromCatalog();
logger.info(templatesResult, 'use case templates seeded');

// Sample resigned user — useful for the dashboard Resignation view.
const SAMPLE_RESIGNED_WA = '+62-811-0009-9999';
const hrd = Departments.getByName('HRD');
if (hrd) {
  const existing = Users.getByWa(SAMPLE_RESIGNED_WA);
  if (!existing) {
    Users.create({
      waNumber: SAMPLE_RESIGNED_WA,
      name: 'Budi Santoso (resigned sample)',
      departmentId: hrd.id,
      jabatan: 'staff',
      isActive: true,
    });
    try {
      Users.resign(SAMPLE_RESIGNED_WA, 'Sample seed — pindah perusahaan');
      logger.info({ wa: SAMPLE_RESIGNED_WA }, 'seeded resigned sample user');
    } catch (err) {
      logger.warn({ err }, 'failed to seed resigned sample');
    }
  }
}

const finance = Departments.getByName('Finance');

const sample = Goals.create({
  title: 'Daily liquidity reconciliation — Bank Mandiri pilot',
  spec: {
    objective:
      'Reconcile the overnight liquidity position by reading the cash-flow report and writing a summary file.',
    successCriteria: [
      { kind: 'tool_output_contains', tool: 'fs.write', pattern: 'wrote' },
    ],
    language: 'id-ID',
    context: { tenant: 'pilot-mandiri' },
  },
  budget: {
    maxSteps: config.defaults.maxSteps,
    maxTokens: config.defaults.maxTokens,
    maxWallClockSeconds: config.defaults.maxWallClockSeconds,
    maxCostUsd: config.defaults.maxCostUsd,
  },
  policy: { allowedTools: ['noop', 'fs.write', 'fs.read'] },
  createdBy: 'seed',
  departmentId: finance?.id ?? null,
});

logger.info({ id: sample.id, title: sample.title, departmentId: sample.departmentId }, 'seeded goal');
process.exit(0);
