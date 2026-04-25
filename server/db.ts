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
  ]) {
    try { db.exec(sql) } catch { /* column already exists */ }
  }
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_events_shop ON events(shop_domain)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_shop ON sessions(shop_domain)`)
  } catch { /* index already exists */ }
}
