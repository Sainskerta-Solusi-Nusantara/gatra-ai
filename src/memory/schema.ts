// SQL schema. Idempotent — applied by migrate.ts on every startup.
// Conventions: TEXT for ulid/json, INTEGER for ms timestamps.

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS e_goal (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  spec_json     TEXT NOT NULL,
  budget_json   TEXT NOT NULL,
  policy_json   TEXT NOT NULL,
  status        TEXT NOT NULL,
  created_by    TEXT NOT NULL,
  department_id TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_goal_status ON e_goal(status);
CREATE INDEX IF NOT EXISTS idx_goal_owner  ON e_goal(created_by);
CREATE INDEX IF NOT EXISTS idx_goal_dept   ON e_goal(department_id);

CREATE TABLE IF NOT EXISTS e_agent_run (
  id                  TEXT PRIMARY KEY,
  goal_id             TEXT NOT NULL REFERENCES e_goal(id),
  status              TEXT NOT NULL,
  current_step_id     TEXT,
  last_checkpoint_id  TEXT,
  attempt             INTEGER NOT NULL DEFAULT 0,
  steps_executed      INTEGER NOT NULL DEFAULT 0,
  tokens_used         INTEGER NOT NULL DEFAULT 0,
  cost_usd            REAL    NOT NULL DEFAULT 0,
  started_at          INTEGER,
  ended_at            INTEGER,
  error_message       TEXT,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_run_goal   ON e_agent_run(goal_id);
CREATE INDEX IF NOT EXISTS idx_run_status ON e_agent_run(status);

CREATE TABLE IF NOT EXISTS e_run_lease (
  run_id        TEXT PRIMARY KEY REFERENCES e_agent_run(id),
  holder_id     TEXT NOT NULL,
  acquired_at   INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL,
  heartbeat_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lease_expiry ON e_run_lease(expires_at);

CREATE TABLE IF NOT EXISTS e_run_event (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id  TEXT NOT NULL,
  ts      INTEGER NOT NULL,
  kind    TEXT NOT NULL,
  meta    TEXT
);
CREATE INDEX IF NOT EXISTS idx_run_event_run ON e_run_event(run_id, ts);

CREATE TABLE IF NOT EXISTS e_step (
  id           TEXT PRIMARY KEY,
  run_id       TEXT NOT NULL REFERENCES e_agent_run(id),
  goal_id      TEXT NOT NULL REFERENCES e_goal(id),
  idx          INTEGER NOT NULL,
  tier         TEXT NOT NULL,
  tool         TEXT NOT NULL,
  args_json    TEXT,
  rationale    TEXT,
  status       TEXT NOT NULL,
  result_json  TEXT,
  critique     TEXT,
  tokens_used  INTEGER NOT NULL DEFAULT 0,
  started_at   INTEGER,
  ended_at     INTEGER,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_step_run   ON e_step(run_id, idx);
CREATE INDEX IF NOT EXISTS idx_step_goal  ON e_step(goal_id);

CREATE TABLE IF NOT EXISTS e_checkpoint (
  id                  TEXT PRIMARY KEY,
  goal_id             TEXT NOT NULL,
  run_id              TEXT NOT NULL,
  step_id             TEXT NOT NULL,
  parent_checkpoint   TEXT,
  state_hash          TEXT NOT NULL,
  parent_state_hash   TEXT,
  payload_json        TEXT NOT NULL,
  size_bytes          INTEGER NOT NULL,
  taken_at            INTEGER NOT NULL,
  reason              TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ckpt_run     ON e_checkpoint(run_id, taken_at);
CREATE INDEX IF NOT EXISTS idx_ckpt_goalrun ON e_checkpoint(goal_id, run_id, taken_at);

CREATE TABLE IF NOT EXISTS e_episodic (
  id          TEXT PRIMARY KEY,
  goal_id     TEXT NOT NULL,
  run_id      TEXT NOT NULL,
  step_id     TEXT,
  kind        TEXT NOT NULL,
  content     TEXT NOT NULL,
  tokens      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_epi_run  ON e_episodic(run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_epi_goal ON e_episodic(goal_id, created_at);

CREATE TABLE IF NOT EXISTS e_semantic (
  id          TEXT PRIMARY KEY,
  scope       TEXT NOT NULL,
  scope_id    TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  confidence  REAL NOT NULL DEFAULT 0.5,
  source      TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE(scope, scope_id, key)
);
CREATE INDEX IF NOT EXISTS idx_sem_scope ON e_semantic(scope, scope_id);

CREATE TABLE IF NOT EXISTS e_approval (
  id              TEXT PRIMARY KEY,
  run_id          TEXT NOT NULL,
  step_id         TEXT NOT NULL,
  reason          TEXT NOT NULL,
  requested_role  TEXT NOT NULL,
  requested_at    INTEGER NOT NULL,
  decided_at      INTEGER,
  decided_by      TEXT,
  decision        TEXT NOT NULL DEFAULT 'pending',
  comment         TEXT
);
CREATE INDEX IF NOT EXISTS idx_approval_decision ON e_approval(decision);

CREATE TABLE IF NOT EXISTS e_audit_event (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      INTEGER NOT NULL,
  actor   TEXT NOT NULL,
  action  TEXT NOT NULL,
  target  TEXT NOT NULL,
  meta    TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_ts     ON e_audit_event(ts);
CREATE INDEX IF NOT EXISTS idx_audit_actor  ON e_audit_event(actor);

CREATE TABLE IF NOT EXISTS e_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ===================== RBAC =====================

CREATE TABLE IF NOT EXISTS e_department (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT,
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS e_user (
  id            TEXT PRIMARY KEY,
  wa_number     TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  department_id TEXT NOT NULL REFERENCES e_department(id),
  jabatan       TEXT NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  resigned_at   INTEGER,
  resignation_reason TEXT,
  removed_by    TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_dept     ON e_user(department_id);
CREATE INDEX IF NOT EXISTS idx_user_active   ON e_user(is_active);
CREATE INDEX IF NOT EXISTS idx_user_resigned ON e_user(resigned_at);

CREATE TABLE IF NOT EXISTS e_folder_permission (
  id            TEXT PRIMARY KEY,
  department_id TEXT NOT NULL REFERENCES e_department(id),
  folder_path   TEXT NOT NULL,
  access_level  TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  UNIQUE(department_id, folder_path)
);
CREATE INDEX IF NOT EXISTS idx_folder_perm_dept ON e_folder_permission(department_id);
CREATE INDEX IF NOT EXISTS idx_folder_perm_path ON e_folder_permission(folder_path);
`;
