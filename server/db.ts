import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH =
  process.env.NODE_ENV === 'test'
    ? ':memory:'
    : (process.env.ANALYTICS_DB_PATH ?? path.join(__dirname, 'analytics.db'))

let _db: InstanceType<typeof Database> | null = null

export function getDb(): InstanceType<typeof Database> {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')   // concurrent reads don't block writes
    _db.pragma('foreign_keys = ON')
    migrate(_db)
  }
  return _db
}

function migrate(db: InstanceType<typeof Database>): void {
  db.exec(`
    -- One row per unique browser / anonymous visitor
    CREATE TABLE IF NOT EXISTS sessions (
      id           TEXT PRIMARY KEY,
      anonymous_id TEXT NOT NULL UNIQUE,
      device_type  TEXT NOT NULL DEFAULT 'desktop',  -- 'mobile' | 'tablet' | 'desktop'
      user_agent   TEXT,
      ip           TEXT,
      first_seen_at TEXT NOT NULL,
      last_seen_at  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_anon ON sessions(anonymous_id);

    -- Every tracked interaction — UI events and server-side render events.
    -- session_id is NULL for system (server-side) events; FK still satisfied
    -- because SQL FK constraints allow NULL on the referencing side.
    CREATE TABLE IF NOT EXISTS events (
      id          TEXT PRIMARY KEY,
      session_id  TEXT REFERENCES sessions(id),
      event_type  TEXT NOT NULL,
      surface     TEXT,        -- 'collection' | 'pdp'
      product_id  TEXT,
      room_id     TEXT,
      action_id   TEXT,
      job_id      TEXT,        -- links client render_job_created to server render_job_succeeded/failed
      properties  TEXT,        -- JSON blob for flexible per-event metadata
      created_at  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_session    ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_type       ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_created    ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_events_job        ON events(job_id);
    CREATE INDEX IF NOT EXISTS idx_events_surface    ON events(surface);
  `)

  // Additive migrations — safe to re-run; ALTER TABLE fails silently if column exists
  for (const sql of [
    `ALTER TABLE sessions ADD COLUMN shop_domain TEXT`,
    `ALTER TABLE events   ADD COLUMN shop_domain TEXT`,
    // render_model records which image generation model was used for succeeded/failed jobs
    `ALTER TABLE events   ADD COLUMN render_model TEXT`,
  ]) {
    try { db.exec(sql) } catch { /* column already exists */ }
  }
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_events_shop  ON events(shop_domain)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_shop ON sessions(shop_domain)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_events_model ON events(render_model)`)
  } catch { /* index already exists */ }

  // Key-value config table — stores default_model and fallback_model
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO model_config (key, value)
      VALUES ('default_model', 'gemini-2.5-flash-image-batch'),
             ('fallback_model', 'gpt-image-2');
  `)
}

import type { ProviderModelId } from './imageProvider.js'

export function getModelConfig(): { defaultModel: ProviderModelId; fallbackModel: ProviderModelId } {
  const db = getDb()
  const rows = db.prepare<[], { key: string; value: string }>('SELECT key, value FROM model_config').all()
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return {
    defaultModel: (map['default_model'] ?? 'gemini-2.5-flash-image-batch') as ProviderModelId,
    fallbackModel: (map['fallback_model'] ?? 'gpt-image-2') as ProviderModelId,
  }
}

export function setModelConfig(defaultModel: ProviderModelId, fallbackModel: ProviderModelId): void {
  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO model_config (key, value) VALUES (?, ?)').run('default_model', defaultModel)
  db.prepare('INSERT OR REPLACE INTO model_config (key, value) VALUES (?, ?)').run('fallback_model', fallbackModel)
}
