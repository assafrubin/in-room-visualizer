import { v4 as uuidv4 } from 'uuid'
import { getDb } from './db.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export type EventType =
  // UI: setup flow
  | 'setup_opened'          // user triggered the setup modal
  | 'room_selected'         // user clicked a preset room card
  | 'room_uploaded'         // user uploaded their own room photo
  | 'action_selected'       // user picked a quick-action placement
  | 'setup_confirmed'       // user clicked "See in room" to confirm
  | 'setup_cancelled'       // user dismissed the modal without confirming
  // UI: navigation / discovery
  | 'collection_viewed'     // collection page loaded
  | 'pdp_viewed'            // PDP loaded
  | 'render_image_viewed'   // AI-generated image became visible to the user
  // Server: render pipeline
  | 'render_job_created'    // POST /api/render-jobs accepted (client-side fire)
  | 'render_job_succeeded'  // gpt-image-2 returned a result (server-side fire)
  | 'render_job_failed'     // gpt-image-2 errored (server-side fire)

export interface TrackEventInput {
  anonymousId?: string          // from browser localStorage; NULL for server events
  eventType: EventType
  surface?: 'collection' | 'pdp'
  productId?: string
  roomId?: string
  actionId?: string
  jobId?: string
  properties?: Record<string, unknown>
  // Supplied by server for client events
  userAgent?: string
  ip?: string
}

// ─── Device detection ─────────────────────────────────────────────────────────

export function detectDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase()
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) return 'mobile'
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  return 'desktop'
}

// ─── Session management ───────────────────────────────────────────────────────

function getOrCreateSession(anonymousId: string, userAgent: string, ip: string): string {
  const db = getDb()
  const now = new Date().toISOString()

  const existing = db.prepare<[string], { id: string }>(
    'SELECT id FROM sessions WHERE anonymous_id = ?',
  ).get(anonymousId)

  if (existing) {
    db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(now, existing.id)
    return existing.id
  }

  const id = uuidv4()
  db.prepare(`
    INSERT INTO sessions (id, anonymous_id, device_type, user_agent, ip, first_seen_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, anonymousId, detectDeviceType(userAgent), userAgent, ip, now, now)

  return id
}

// ─── Event insertion ──────────────────────────────────────────────────────────

export function trackEvent(input: TrackEventInput): string {
  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()

  let sessionId: string | null = null
  if (input.anonymousId) {
    sessionId = getOrCreateSession(
      input.anonymousId,
      input.userAgent ?? '',
      input.ip ?? '',
    )
  }

  db.prepare(`
    INSERT INTO events
      (id, session_id, event_type, surface, product_id, room_id, action_id, job_id, properties, created_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    sessionId,
    input.eventType,
    input.surface ?? null,
    input.productId ?? null,
    input.roomId ?? null,
    input.actionId ?? null,
    input.jobId ?? null,
    input.properties ? JSON.stringify(input.properties) : null,
    now,
  )

  return id
}

// ─── Server-side convenience wrappers ─────────────────────────────────────────
// These fire events that originate on the server (no anonymous_id / session).

export function trackRenderJobCreated(jobId: string, productId: string | null, roomId: string, isEditMode: boolean): void {
  trackEvent({ eventType: 'render_job_created', jobId, productId: productId ?? undefined, roomId, properties: { is_edit_mode: isEditMode } })
}

export function trackRenderJobSucceeded(jobId: string, productId: string | null, durationMs: number): void {
  trackEvent({ eventType: 'render_job_succeeded', jobId, productId: productId ?? undefined, properties: { duration_ms: durationMs } })
}

export function trackRenderJobFailed(jobId: string, productId: string | null, error: string, durationMs: number): void {
  trackEvent({ eventType: 'render_job_failed', jobId, productId: productId ?? undefined, properties: { error, duration_ms: durationMs } })
}
