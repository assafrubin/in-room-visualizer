import { describe, it, expect, beforeEach } from 'vitest'
import { trackEvent, getAnalyticsSummary, detectDeviceType } from './analytics.js'
import { getDb } from './db.js'

// ─── Reset DB between tests ───────────────────────────────────────────────────
// NODE_ENV=test uses an in-memory SQLite DB (see db.ts), so rows accumulate
// within a test file. Clear them before each test for a clean slate.

function clearDb() {
  const db = getDb()
  db.exec('DELETE FROM events; DELETE FROM sessions;')
}

// ─── detectDeviceType ─────────────────────────────────────────────────────────

describe('detectDeviceType', () => {
  it('returns mobile for iPhone UA', () => {
    expect(detectDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('mobile')
  })

  it('returns mobile for Android UA', () => {
    expect(detectDeviceType('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile')).toBe('mobile')
  })

  it('returns tablet for iPad UA', () => {
    expect(detectDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet')
  })

  it('returns desktop for Chrome on macOS', () => {
    expect(detectDeviceType('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')).toBe('desktop')
  })

  it('returns desktop for empty string', () => {
    expect(detectDeviceType('')).toBe('desktop')
  })
})

// ─── trackEvent ───────────────────────────────────────────────────────────────

describe('trackEvent', () => {
  beforeEach(clearDb)

  it('returns an event id string', () => {
    const id = trackEvent({ eventType: 'pdp_viewed', shopDomain: 'shop.myshopify.com' })
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('stores shopDomain on the event row', () => {
    trackEvent({ eventType: 'setup_opened', shopDomain: 'furniture.myshopify.com' })
    const row = getDb().prepare('SELECT shop_domain FROM events WHERE event_type = ?').get('setup_opened') as { shop_domain: string }
    expect(row.shop_domain).toBe('furniture.myshopify.com')
  })

  it('stores shopDomain on the session row when anonymousId is provided', () => {
    trackEvent({
      eventType: 'collection_viewed',
      anonymousId: 'anon-abc',
      shopDomain: 'mystore.myshopify.com',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
      ip: '1.2.3.4',
    })
    const row = getDb().prepare('SELECT shop_domain FROM sessions WHERE anonymous_id = ?').get('anon-abc') as { shop_domain: string }
    expect(row.shop_domain).toBe('mystore.myshopify.com')
  })

  it('accepts all camera event types', () => {
    const cameraEvents = ['camera_opened', 'camera_capture', 'camera_denied', 'camera_error'] as const
    for (const eventType of cameraEvents) {
      expect(() => trackEvent({ eventType, shopDomain: 'shop.myshopify.com' })).not.toThrow()
    }
    const count = (getDb().prepare('SELECT COUNT(*) as c FROM events WHERE event_type LIKE ?').get('camera_%') as { c: number }).c
    expect(count).toBe(4)
  })

  it('allows null shopDomain for anonymous events', () => {
    expect(() => trackEvent({ eventType: 'render_job_succeeded' })).not.toThrow()
    const row = getDb().prepare('SELECT shop_domain FROM events WHERE event_type = ?').get('render_job_succeeded') as { shop_domain: string | null }
    expect(row.shop_domain).toBeNull()
  })
})

// ─── getAnalyticsSummary ──────────────────────────────────────────────────────

describe('getAnalyticsSummary', () => {
  beforeEach(clearDb)

  it('returns empty arrays for a shop with no events', () => {
    const summary = getAnalyticsSummary('unknown.myshopify.com')
    expect(summary.funnel).toEqual([])
    expect(summary.rendersByDevice).toEqual([])
    expect(summary.rendersByDay).toEqual([])
    expect(summary.topProducts).toEqual([])
  })

  it('counts funnel events scoped to the correct shop', () => {
    const shop = 'myshop.myshopify.com'
    trackEvent({ eventType: 'pdp_viewed',    shopDomain: shop })
    trackEvent({ eventType: 'pdp_viewed',    shopDomain: shop })
    trackEvent({ eventType: 'setup_opened',  shopDomain: shop })
    // Event from a different shop — must not appear in results
    trackEvent({ eventType: 'pdp_viewed',    shopDomain: 'other.myshopify.com' })

    const summary = getAnalyticsSummary(shop)
    const pdpRow = summary.funnel.find(r => r.event_type === 'pdp_viewed')
    expect(pdpRow?.count).toBe(2)
    const openedRow = summary.funnel.find(r => r.event_type === 'setup_opened')
    expect(openedRow?.count).toBe(1)
  })

  it('does not leak events from another shop', () => {
    trackEvent({ eventType: 'render_job_created', shopDomain: 'shop-a.myshopify.com' })
    trackEvent({ eventType: 'render_job_created', shopDomain: 'shop-b.myshopify.com' })

    const summaryA = getAnalyticsSummary('shop-a.myshopify.com')
    const summaryB = getAnalyticsSummary('shop-b.myshopify.com')
    const countA = summaryA.funnel.find(r => r.event_type === 'render_job_created')?.count ?? 0
    const countB = summaryB.funnel.find(r => r.event_type === 'render_job_created')?.count ?? 0
    expect(countA).toBe(1)
    expect(countB).toBe(1)
  })

  it('includes camera events in the funnel results', () => {
    const shop = 'mobile-shop.myshopify.com'
    trackEvent({ eventType: 'camera_opened',  shopDomain: shop })
    trackEvent({ eventType: 'camera_capture', shopDomain: shop })
    trackEvent({ eventType: 'camera_denied',  shopDomain: shop })

    const summary = getAnalyticsSummary(shop)
    expect(summary.funnel.find(r => r.event_type === 'camera_opened')?.count).toBe(1)
    expect(summary.funnel.find(r => r.event_type === 'camera_capture')?.count).toBe(1)
    expect(summary.funnel.find(r => r.event_type === 'camera_denied')?.count).toBe(1)
  })

  it('tracks renders by product and respects the top-10 limit', () => {
    const shop = 'prod-shop.myshopify.com'
    for (let i = 0; i < 15; i++) {
      trackEvent({ eventType: 'render_job_created', shopDomain: shop, productId: `product-${i}` })
    }
    const summary = getAnalyticsSummary(shop)
    expect(summary.topProducts.length).toBeLessThanOrEqual(10)
  })

  it('respects the since cutoff date', () => {
    const shop = 'cutoff-shop.myshopify.com'
    trackEvent({ eventType: 'setup_opened', shopDomain: shop })
    // Query with a future cutoff — the just-inserted event should not appear
    const futureDate = new Date(Date.now() + 60_000).toISOString()
    const summary = getAnalyticsSummary(shop, futureDate)
    expect(summary.funnel.find(r => r.event_type === 'setup_opened')?.count ?? 0).toBe(0)
  })
})
