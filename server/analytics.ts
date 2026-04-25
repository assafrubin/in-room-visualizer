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
  // UI: camera (mobile)
  | 'camera_opened'         // getUserMedia succeeded; live viewfinder shown
  | 'camera_capture'        // user tapped shutter; photo passed to upload
  | 'camera_denied'         // browser permission denied (NotAllowedError)
  | 'camera_error'          // other getUserMedia failure (no device, etc.)
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
  shopDomain?: string           // merchant identifier; stamped by backoffice proxy
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

function getOrCreateSession(anonymousId: string, userAgent: string, ip: string, shopDomain?: string): string {
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
    INSERT INTO sessions (id, anonymous_id, device_type, user_agent, ip, shop_domain, first_seen_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, anonymousId, detectDeviceType(userAgent), userAgent, ip, shopDomain ?? null, now, now)

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
      input.shopDomain,
    )
  }

  db.prepare(`
    INSERT INTO events
      (id, session_id, event_type, surface, product_id, room_id, action_id, job_id, shop_domain, properties, created_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    sessionId,
    input.eventType,
    input.surface ?? null,
    input.productId ?? null,
    input.roomId ?? null,
    input.actionId ?? null,
    input.jobId ?? null,
    input.shopDomain ?? null,
    input.properties ? JSON.stringify(input.properties) : null,
    now,
  )

  return id
}

// ─── Server-side convenience wrappers ─────────────────────────────────────────
// These fire events that originate on the server (no anonymous_id / session).

export function trackRenderJobCreated(jobId: string, productId: string | null, roomId: string, isEditMode: boolean, shopDomain?: string): void {
  trackEvent({ eventType: 'render_job_created', jobId, productId: productId ?? undefined, roomId, shopDomain, properties: { is_edit_mode: isEditMode } })
}

export function trackRenderJobSucceeded(jobId: string, productId: string | null, durationMs: number, shopDomain?: string): void {
  trackEvent({ eventType: 'render_job_succeeded', jobId, productId: productId ?? undefined, shopDomain, properties: { duration_ms: durationMs } })
}

export function trackRenderJobFailed(jobId: string, productId: string | null, error: string, durationMs: number, shopDomain?: string): void {
  trackEvent({ eventType: 'render_job_failed', jobId, productId: productId ?? undefined, shopDomain, properties: { error, duration_ms: durationMs } })
}

// ─── Analytics queries ────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  rendersByDevice: { device_type: string; count: number }[]
  funnel: { event_type: string; count: number }[]
  rendersByDay: { day: string; count: number }[]
  topProducts: { product_id: string; count: number }[]
}

export function getAnalyticsSummary(shopDomain: string, since?: string): AnalyticsSummary {
  const db = getDb()
  const cutoff = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const rendersByDevice = db.prepare<[string, string], { device_type: string; count: number }>(`
    SELECT s.device_type, COUNT(*) as count
    FROM events e
    JOIN sessions s ON e.session_id = s.id
    WHERE e.event_type = 'render_job_created'
      AND e.shop_domain = ?
      AND e.created_at >= ?
    GROUP BY s.device_type
  `).all(shopDomain, cutoff)

  const funnelEvents: EventType[] = [
    'collection_viewed', 'pdp_viewed', 'setup_opened',
    'camera_opened', 'camera_capture', 'camera_denied', 'camera_error',
    'setup_confirmed', 'render_job_created', 'render_job_succeeded',
  ]
  const funnel = db.prepare<[string, string], { event_type: string; count: number }>(`
    SELECT event_type, COUNT(*) as count
    FROM events
    WHERE shop_domain = ?
      AND created_at >= ?
      AND event_type IN (${funnelEvents.map(() => '?').join(',')})
    GROUP BY event_type
  `).all(shopDomain, cutoff, ...funnelEvents)

  const rendersByDay = db.prepare<[string, string], { day: string; count: number }>(`
    SELECT strftime('%Y-%m-%d', created_at) as day, COUNT(*) as count
    FROM events
    WHERE event_type = 'render_job_created'
      AND shop_domain = ?
      AND created_at >= ?
    GROUP BY day
    ORDER BY day
  `).all(shopDomain, cutoff)

  const topProducts = db.prepare<[string, string], { product_id: string; count: number }>(`
    SELECT product_id, COUNT(*) as count
    FROM events
    WHERE event_type = 'render_job_created'
      AND shop_domain = ?
      AND created_at >= ?
      AND product_id IS NOT NULL
    GROUP BY product_id
    ORDER BY count DESC
    LIMIT 10
  `).all(shopDomain, cutoff)

  return { rendersByDevice, funnel, rendersByDay, topProducts }
}
