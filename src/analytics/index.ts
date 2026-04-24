import type { EventType } from '../../server/analytics.js'

// Re-export so callers only import from one place
export type { EventType }

// ─── Anonymous identity ───────────────────────────────────────────────────────

const ANON_KEY = 'vir_anon_id'

function getAnonymousId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(ANON_KEY, id)
    }
    return id
  } catch {
    // localStorage unavailable (SSR, private mode quota exceeded, etc.)
    return 'anon-unavailable'
  }
}

// ─── Track payload ────────────────────────────────────────────────────────────

export interface TrackOptions {
  surface?: 'collection' | 'pdp'
  productId?: string
  roomId?: string
  actionId?: string
  jobId?: string
  properties?: Record<string, unknown>
}

// ─── Fire-and-forget track call ───────────────────────────────────────────────

export function track(eventType: EventType, options: TrackOptions = {}): void {
  const anonymousId = getAnonymousId()

  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ anonymousId, eventType, ...options }),
    // keepalive lets the request complete even if the page unloads
    keepalive: true,
  }).catch(() => {
    // Analytics must never break the product
  })
}
