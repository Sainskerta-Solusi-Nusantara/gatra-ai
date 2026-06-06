// SQLite store for use case templates. Idempotent — `upsertAll` clears and
// reseeds the table from the in-memory CATALOG, so deleted templates fall out
// and new ones appear on the next seed run.

import { openDb } from '../memory/db.js';
import { CATALOG } from './catalog.js';
import type { UseCaseTemplate } from './types.js';

interface TemplateRow {
  id: string;
  department_id: string | null;
  min_jabatan: string;
  command: string;
  category: string;
  title: string;
  description: string;
  example_goal: string;
  output_format: string;
  frequency: string;
  stakeholders: string | null;
  created_at: number;
}

function mapRow(r: TemplateRow): UseCaseTemplate {
  let stakeholders: string[] = [];
  if (r.stakeholders) {
    try {
      const parsed = JSON.parse(r.stakeholders);
      if (Array.isArray(parsed)) stakeholders = parsed.filter((x) => typeof x === 'string');
    } catch {
      // ignore malformed JSON — treat as no stakeholders
    }
  }
  return {
    id: r.id,
    departmentId: (r.department_id ?? null) as UseCaseTemplate['departmentId'],
    minJabatan: r.min_jabatan as UseCaseTemplate['minJabatan'],
    command: r.command,
    category: r.category,
    title: r.title,
    description: r.description,
    exampleGoal: r.example_goal,
    outputFormat: r.output_format as UseCaseTemplate['outputFormat'],
    frequency: r.frequency as UseCaseTemplate['frequency'],
    stakeholders,
  };
}

export interface SeedTemplatesResult {
  cleared: number;
  inserted: number;
}

export const Templates = {
  /**
   * Idempotent seed: wipe e_command_template and re-insert every row from
   * the in-memory CATALOG. Runs inside a single transaction.
   */
  seedFromCatalog(): SeedTemplatesResult {
    const db = openDb();
    const t = Date.now();
    const tx = db.transaction(() => {
      const before = (
        db.prepare('SELECT COUNT(*) AS n FROM e_command_template').get() as { n: number }
      ).n;
      db.prepare('DELETE FROM e_command_template').run();
      const ins = db.prepare(
        `INSERT INTO e_command_template
          (id, department_id, min_jabatan, command, category, title, description,
           example_goal, output_format, frequency, stakeholders, created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      );
      let inserted = 0;
      for (const tpl of CATALOG) {
        ins.run(
          tpl.id,
          tpl.departmentId,
          tpl.minJabatan,
          tpl.command,
          tpl.category,
          tpl.title,
          tpl.description,
          tpl.exampleGoal,
          tpl.outputFormat,
          tpl.frequency,
          JSON.stringify(tpl.stakeholders ?? []),
          t,
        );
        inserted += 1;
      }
      return { cleared: before, inserted };
    });
    return tx();
  },

  /** Return all rows (no filtering). */
  listAll(): UseCaseTemplate[] {
    const db = openDb();
    const rows = db
      .prepare('SELECT * FROM e_command_template ORDER BY department_id, min_jabatan, command')
      .all() as TemplateRow[];
    return rows.map(mapRow);
  },

  /** Count rows currently in the table. */
  count(): number {
    const db = openDb();
    const row = db
      .prepare('SELECT COUNT(*) AS n FROM e_command_template')
      .get() as { n: number };
    return row.n;
  },
};
