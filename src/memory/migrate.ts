import { openDb } from './db.js';
import { logger } from '../logger.js';

const SCHEMA_VERSION = '3';

interface ColumnInfo {
  name: string;
}

function hasColumn(table: string, column: string): boolean {
  const db = openDb();
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[];
  return cols.some((c) => c.name === column);
}

function addColumnIfMissing(table: string, column: string, ddl: string): void {
  if (hasColumn(table, column)) return;
  const db = openDb();
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  logger.info({ table, column }, 'added column');
}

function applyMigrations(): void {
  // v1 → v2: add department_id to e_goal for tenant isolation.
  addColumnIfMissing('e_goal', 'department_id', 'department_id TEXT');
  // v2 → v3: resignation + offboarding fields on e_user.
  addColumnIfMissing('e_user', 'resigned_at', 'resigned_at INTEGER');
  addColumnIfMissing('e_user', 'resignation_reason', 'resignation_reason TEXT');
  addColumnIfMissing('e_user', 'removed_by', 'removed_by TEXT');
}

function run() {
  const db = openDb();
  const existing = db.prepare(`SELECT value FROM e_meta WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined;

  applyMigrations();

  if (!existing) {
    db.prepare(`INSERT INTO e_meta(key, value) VALUES('schema_version', ?)`).run(SCHEMA_VERSION);
    logger.info({ version: SCHEMA_VERSION }, 'schema initialised');
    return;
  }

  if (existing.value !== SCHEMA_VERSION) {
    db.prepare(`UPDATE e_meta SET value = ? WHERE key = 'schema_version'`).run(SCHEMA_VERSION);
    logger.info(
      { from: existing.value, to: SCHEMA_VERSION },
      'schema version advanced',
    );
  } else {
    logger.info({ version: existing.value }, 'schema up to date');
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  run();
  process.exit(0);
}

export { run as migrate };
