import { vi, describe, it, expect, beforeEach } from 'vitest'
import supertest from 'supertest'

// These mocks must be declared before importing the app.
// Vitest hoists vi.mock() calls to the top of the file automatically.

vi.mock('./openai.js', () => ({
  interpretSceneBrief: vi.fn().mockResolvedValue({
    normalizedIntent: 'Place cabinet near the TV.',
    renderPrompt: 'A living room with the cabinet placed near the TV.',
  }),
}))

vi.mock('./renderPipeline.js', () => ({
  compileRenderPrompt: vi.fn().mockReturnValue('compiled-prompt'),
  compileEditPrompt: vi.fn().mockReturnValue('edit-prompt'),
  processRenderJob: vi.fn().mockResolvedValue(undefined),
  imageBuffers: new Map(),
  roomImages: new Map(),
}))

const { app } = await import('./index.js')

const request = supertest(app)

// ─── GET /api/rooms ──────────────────────────────────────────────────────────

describe('GET /api/rooms', () => {
  it('returns 200 with a rooms array', async () => {
    const res = await request.get('/api/rooms')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.rooms)).toBe(true)
    expect(res.body.rooms.length).toBeGreaterThan(0)
  })

  it('each room has id, name, and color fields', async () => {
    const res = await request.get('/api/rooms')
    for (const room of res.body.rooms) {
      expect(room).toHaveProperty('id')
      expect(room).toHaveProperty('name')
      expect(room).toHaveProperty('bgColor')
      expect(room).toHaveProperty('accentColor')
      expect(room).toHaveProperty('floorColor')
    }
  })
})

// ─── POST /api/rooms/upload ───────────────────────────────────────────────────

describe('POST /api/rooms/upload', () => {
  const validPayload = {
    imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    filename: 'my-room.png',
  }

  it('returns 200 with uploaded-room profile', async () => {
    const res = await request.post('/api/rooms/upload').send(validPayload)
    expect(res.status).toBe(200)
    expect(res.body.room.id).toBe('uploaded-room')
    expect(res.body.room.isUploaded).toBe(true)
  })

  it('uses the filename (without extension) as the room name', async () => {
    const res = await request.post('/api/rooms/upload').send({ ...validPayload, filename: 'summer-house.jpg' })
    expect(res.body.room.name).toBe('summer-house')
  })

  it('returns 400 for an invalid data URL', async () => {
    const res = await request.post('/api/rooms/upload').send({ imageDataUrl: 'not-a-data-url', filename: 'bad.jpg' })
    expect(res.status).toBe(400)
  })
})

// ─── POST /api/rooms/:roomId/analysis ─────────────────────────────────────────

describe('POST /api/rooms/:roomId/analysis', () => {
  it('returns zones for a known room', async () => {
    const res = await request.post('/api/rooms/living-room/analysis')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.zones)).toBe(true)
    expect(res.body.zones.length).toBeGreaterThan(0)
    expect(res.body.zones[0]).toHaveProperty('label')
  })

  it('returns 404 for an unknown room', async () => {
    const res = await request.post('/api/rooms/no-such-room/analysis')
    expect(res.status).toBe(404)
  })

  it('returns zones for uploaded-room', async () => {
    const res = await request.post('/api/rooms/uploaded-room/analysis')
    expect(res.status).toBe(200)
    expect(res.body.zones.length).toBeGreaterThan(0)
  })
})

// ─── POST /api/scene-briefs ───────────────────────────────────────────────────

describe('POST /api/scene-briefs', () => {
  const validBrief = {
    roomId: 'living-room',
    actionId: 'near-tv',
    refinementText: '',
    collectionName: 'Side Cabinets',
  }

  it('returns 200 with a brief record including id and prompts', async () => {
    const res = await request.post('/api/scene-briefs').send(validBrief)
    expect(res.status).toBe(200)
    expect(res.body.brief).toHaveProperty('id')
    expect(res.body.brief).toHaveProperty('normalizedIntent')
    expect(res.body.brief).toHaveProperty('renderPrompt')
    expect(res.body.brief.roomId).toBe('living-room')
    expect(res.body.brief.actionId).toBe('near-tv')
  })

  it('returns 400 for an invalid roomId', async () => {
    const res = await request.post('/api/scene-briefs').send({ ...validBrief, roomId: 'ghost-room' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid actionId', async () => {
    const res = await request.post('/api/scene-briefs').send({ ...validBrief, actionId: 'fly-to-moon' })
    expect(res.status).toBe(400)
  })

  it('stores the brief so it can be used for render jobs', async () => {
    const briefRes = await request.post('/api/scene-briefs').send(validBrief)
    const briefId = briefRes.body.brief.id

    const jobRes = await request.post('/api/render-jobs').send({
      briefId,
      productId: 'p1',
      product: { title: 'Dressoir Lucca', material: 'Oak veneer', cabinetColor: '#C4A882' },
    })
    expect(jobRes.status).toBe(200)
    expect(jobRes.body.job.briefId).toBe(briefId)
  })
})

// ─── POST /api/render-jobs ────────────────────────────────────────────────────

describe('POST /api/render-jobs', () => {
  let briefId: string

  beforeEach(async () => {
    const res = await request.post('/api/scene-briefs').send({
      roomId: 'living-room',
      actionId: 'near-tv',
      refinementText: '',
      collectionName: 'Side Cabinets',
    })
    briefId = res.body.brief.id
  })

  const product = { title: 'Dressoir Lucca', material: 'Oak veneer', cabinetColor: '#C4A882' }

  it('returns 200 with a submitted job', async () => {
    const res = await request.post('/api/render-jobs').send({ briefId, productId: 'p1', product })
    expect(res.status).toBe(200)
    expect(res.body.job.status).toBe('submitted')
    expect(res.body.job.briefId).toBe(briefId)
    expect(res.body.job.productId).toBe('p1')
  })

  it('assigns a unique jobId', async () => {
    const r1 = await request.post('/api/render-jobs').send({ briefId, productId: 'p1', product })
    const r2 = await request.post('/api/render-jobs').send({ briefId, productId: 'p2', product })
    expect(r1.body.job.jobId).not.toBe(r2.body.job.jobId)
  })

  it('returns 404 for a non-existent briefId', async () => {
    const res = await request.post('/api/render-jobs').send({ briefId: 'no-such-brief', productId: 'p1', product })
    expect(res.status).toBe(404)
  })

  it('sets roomId on the job from the brief', async () => {
    const res = await request.post('/api/render-jobs').send({ briefId, productId: 'p1', product })
    expect(res.body.job.roomId).toBe('living-room')
  })
})

// ─── GET /api/render-jobs/:jobId ─────────────────────────────────────────────

describe('GET /api/render-jobs/:jobId', () => {
  it('returns the job by id', async () => {
    const briefRes = await request.post('/api/scene-briefs').send({
      roomId: 'living-room', actionId: 'near-tv', refinementText: '', collectionName: 'Side Cabinets',
    })
    const jobRes = await request.post('/api/render-jobs').send({
      briefId: briefRes.body.brief.id,
      productId: 'p1',
      product: { title: 'Dressoir Lucca', material: 'Oak veneer', cabinetColor: '#C4A882' },
    })
    const jobId = jobRes.body.job.jobId

    const res = await request.get(`/api/render-jobs/${jobId}`)
    expect(res.status).toBe(200)
    expect(res.body.job.jobId).toBe(jobId)
  })

  it('returns 404 for an unknown jobId', async () => {
    const res = await request.get('/api/render-jobs/nonexistent-id')
    expect(res.status).toBe(404)
  })
})

// ─── GET /api/render-jobs/:jobId/image ───────────────────────────────────────

describe('GET /api/render-jobs/:jobId/image', () => {
  it('returns 404 when image buffer is not yet ready', async () => {
    // processRenderJob is mocked to do nothing, so no image buffer is ever set
    const briefRes = await request.post('/api/scene-briefs').send({
      roomId: 'living-room', actionId: 'near-tv', refinementText: '', collectionName: 'Side Cabinets',
    })
    const jobRes = await request.post('/api/render-jobs').send({
      briefId: briefRes.body.brief.id,
      productId: 'p1',
      product: { title: 'Dressoir Lucca', material: 'Oak veneer', cabinetColor: '#C4A882' },
    })
    const jobId = jobRes.body.job.jobId

    const res = await request.get(`/api/render-jobs/${jobId}/image`)
    expect(res.status).toBe(404)
  })
})

// ─── POST /api/events ─────────────────────────────────────────────────────────

describe('POST /api/events', () => {
  it('returns ok:true for a valid event', async () => {
    const res = await request.post('/api/events').send({
      eventType: 'pdp_viewed',
      shopDomain: 'test.myshopify.com',
      anonymousId: 'anon-test-1',
    })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(typeof res.body.eventId).toBe('string')
  })

  it('returns 400 when eventType is missing', async () => {
    const res = await request.post('/api/events').send({ shopDomain: 'test.myshopify.com' })
    expect(res.status).toBe(400)
  })

  it('accepts camera event types', async () => {
    const cameraEvents = ['camera_opened', 'camera_capture', 'camera_denied', 'camera_error']
    for (const eventType of cameraEvents) {
      const res = await request.post('/api/events').send({ eventType, shopDomain: 'test.myshopify.com' })
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    }
  })

  it('stamps shopDomain on the stored event', async () => {
    await request.post('/api/events').send({
      eventType: 'setup_confirmed',
      shopDomain: 'merchant-x.myshopify.com',
      anonymousId: 'anon-merchant-x',
    })
    // Verify via analytics endpoint
    const res = await request.get('/api/analytics/internal?shop=merchant-x.myshopify.com')
    expect(res.status).toBe(200)
    const confirmed = res.body.funnel?.find((r: { event_type: string }) => r.event_type === 'setup_confirmed')
    expect(confirmed?.count).toBe(1)
  })
})

// ─── GET /api/analytics/internal ─────────────────────────────────────────────

describe('GET /api/analytics/internal', () => {
  it('returns 400 when shop param is missing', async () => {
    const res = await request.get('/api/analytics/internal')
    expect(res.status).toBe(400)
  })

  it('returns a valid summary shape for a known shop', async () => {
    await request.post('/api/events').send({ eventType: 'collection_viewed', shopDomain: 'shape-shop.myshopify.com' })
    const res = await request.get('/api/analytics/internal?shop=shape-shop.myshopify.com')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.funnel)).toBe(true)
    expect(Array.isArray(res.body.rendersByDevice)).toBe(true)
    expect(Array.isArray(res.body.rendersByDay)).toBe(true)
    expect(Array.isArray(res.body.topProducts)).toBe(true)
  })

  it('returns 200 with empty arrays for a shop with no events', async () => {
    const res = await request.get('/api/analytics/internal?shop=no-events.myshopify.com')
    expect(res.status).toBe(200)
    expect(res.body.funnel).toEqual([])
  })

  it('returns 401 when ANALYTICS_SECRET is set and header is missing', async () => {
    process.env.ANALYTICS_SECRET = 'super-secret'
    const res = await request.get('/api/analytics/internal?shop=any.myshopify.com')
    expect(res.status).toBe(401)
    delete process.env.ANALYTICS_SECRET
  })

  it('returns 200 when the correct ANALYTICS_SECRET header is provided', async () => {
    process.env.ANALYTICS_SECRET = 'correct-secret'
    const res = await request
      .get('/api/analytics/internal?shop=any.myshopify.com')
      .set('x-analytics-secret', 'correct-secret')
    expect(res.status).toBe(200)
    delete process.env.ANALYTICS_SECRET
  })
})
