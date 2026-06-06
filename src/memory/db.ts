import Database, { type Database as DB } from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { SCHEMA_SQL } from './schema.js';
import { logger } from '../logger.js';

let _db: DB | null = null;

export function openDb(): DB {
  if (_db) return _db;

  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  const db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);

  _db = db;
  logger.info({ dbPath: config.dbPath }, 'sqlite opened');
  return db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export function withTx<T>(fn: (db: DB) => T): T {
  const db = openDb();
  const tx = db.transaction(fn);
  return tx(db);
}
