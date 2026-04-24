import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { api } from './index'

function mockFetch(data: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response)
}

describe('api.getRooms', () => {
  beforeEach(() => { vi.stubGlobal('fetch', mockFetch({ rooms: [{ id: 'living-room' }] })) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('fetches /api/rooms and returns the rooms array', async () => {
    const rooms = await api.getRooms()
    expect(rooms).toEqual([{ id: 'living-room' }])
    expect(fetch).toHaveBeenCalledWith('/api/rooms', expect.any(Object))
  })
})

describe('api.uploadRoom', () => {
  const uploaded = { id: 'uploaded-room', name: 'my-room', bgColor: '#D0CFC4', accentColor: '#7A7A6A', floorColor: '#B8B5A5', isUploaded: true }
  beforeEach(() => { vi.stubGlobal('fetch', mockFetch({ room: uploaded })) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('POSTs to /api/rooms/upload and returns the room', async () => {
    const result = await api.uploadRoom({ imageDataUrl: 'data:image/png;base64,abc', filename: 'my-room.png' })
    expect(result).toEqual(uploaded)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/api/rooms/upload')
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({ filename: 'my-room.png' })
  })
})

describe('api.analyzeRoom', () => {
  const zones = [{ label: 'TV', icon: '📺', description: 'Left wall' }]
  beforeEach(() => { vi.stubGlobal('fetch', mockFetch({ zones })) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('POSTs to /api/rooms/:roomId/analysis and returns zones', async () => {
    const result = await api.analyzeRoom('living-room')
    expect(result).toEqual(zones)
    expect(fetch).toHaveBeenCalledWith('/api/rooms/living-room/analysis', expect.objectContaining({ method: 'POST' }))
  })
})

describe('api.createSceneBrief', () => {
  const brief = { id: 'brief-1', normalizedIntent: 'Near TV', renderPrompt: 'A room.', roomId: 'living-room', actionId: 'near-tv', refinementText: '', collectionName: 'Side Cabinets', createdAt: '' }
  beforeEach(() => { vi.stubGlobal('fetch', mockFetch({ brief })) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('POSTs to /api/scene-briefs and returns the brief record', async () => {
    const result = await api.createSceneBrief({ roomId: 'living-room', actionId: 'near-tv', refinementText: '', collectionName: 'Side Cabinets' })
    expect(result).toEqual(brief)
    expect(fetch).toHaveBeenCalledWith('/api/scene-briefs', expect.objectContaining({ method: 'POST' }))
  })
})

describe('api.createRenderJob', () => {
  const job = { jobId: 'job-1', briefId: 'brief-1', status: 'submitted' }
  beforeEach(() => { vi.stubGlobal('fetch', mockFetch({ job })) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('POSTs to /api/render-jobs and returns the job', async () => {
    const result = await api.createRenderJob({ briefId: 'brief-1', productId: 'p1', product: { title: 'T', material: 'M', cabinetColor: '#c' } })
    expect((result as typeof job).jobId).toBe('job-1')
  })
})

describe('api.getRenderJob', () => {
  const job = { jobId: 'job-1', status: 'processing' }
  beforeEach(() => { vi.stubGlobal('fetch', mockFetch({ job })) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('GETs /api/render-jobs/:jobId and returns the job', async () => {
    const result = await api.getRenderJob('job-1')
    expect((result as typeof job).status).toBe('processing')
    expect(fetch).toHaveBeenCalledWith('/api/render-jobs/job-1', expect.any(Object))
  })
})

describe('error handling', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'Room not found' }, false))
    await expect(api.analyzeRoom('bad-room')).rejects.toThrow('API 400')
  })
})
