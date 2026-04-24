import { webcrypto } from 'node:crypto'
import { File as NodeFile } from 'node:buffer'
// Node.js v18 doesn't expose Web Crypto API or the File class as bare globals.
// The OpenAI SDK (v6+) needs both. These polyfills are no-ops on Node.js v20+.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
}
if (!globalThis.File) {
  Object.defineProperty(globalThis, 'File', { value: NodeFile })
}

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { ROOMS, getZonesForRoom, getRoomById, getActionById } from './data.js'
import { interpretSceneBrief } from './openai.js'
import {
  compileRenderPrompt,
  compileEditPrompt,
  processRenderJob,
  imageBuffers,
  roomImages,
  type RenderJobRecord,
  type ProductDetails,
} from './renderPipeline.js'
import type { QuickActionId } from '../src/types/index.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '20mb' }))

// ─── In-memory stores ────────────────────────────────────────────────────────

interface BriefRecord {
  id: string
  roomId: string
  actionId: QuickActionId
  refinementText: string
  collectionName: string
  normalizedIntent: string
  renderPrompt: string
  createdAt: string
}

const briefs = new Map<string, BriefRecord>()
const renderJobs = new Map<string, RenderJobRecord>()

// ─── GET /api/rooms ──────────────────────────────────────────────────────────

app.get('/api/rooms', (_req, res) => {
  res.json({ rooms: ROOMS })
})

// ─── POST /api/rooms/upload ───────────────────────────────────────────────────
// Accepts a data URL of the user's room photo and stores it server-side for
// use with images.edit() during render job processing.

app.post('/api/rooms/upload', (req, res) => {
  const { imageDataUrl, filename } = req.body as { imageDataUrl: string; filename: string }

  const match = imageDataUrl?.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) { res.status(400).json({ error: 'Invalid image data URL' }); return }

  const [, contentType, b64] = match
  const buffer = Buffer.from(b64, 'base64')

  // Single slot — overwrites any previous upload
  roomImages.set('uploaded-room', { data: buffer, contentType })

  const name = (filename ?? '').replace(/\.[^.]+$/, '') || 'My Room'
  console.info(`[rooms/upload] stored ${buffer.length} bytes as uploaded-room (${contentType})`)

  const room = getRoomById('uploaded-room')!
  res.json({ room: { ...room, name } })
})

// ─── POST /api/rooms/:roomId/analysis ────────────────────────────────────────

app.post('/api/rooms/:roomId/analysis', (req, res) => {
  const room = getRoomById(req.params.roomId)
  if (!room) { res.status(404).json({ error: 'Room not found' }); return }
  res.json({ zones: getZonesForRoom(req.params.roomId) })
})

// ─── POST /api/scene-briefs ───────────────────────────────────────────────────

app.post('/api/scene-briefs', async (req, res) => {
  const { roomId, actionId, refinementText = '', collectionName } = req.body as {
    roomId: string
    actionId: QuickActionId
    refinementText?: string
    collectionName: string
  }

  const room = getRoomById(roomId)
  const action = getActionById(actionId)
  if (!room || !action) { res.status(400).json({ error: 'Invalid roomId or actionId' }); return }

  try {
    const { normalizedIntent, renderPrompt } = await interpretSceneBrief(
      room, action, refinementText, collectionName,
    )
    const brief: BriefRecord = {
      id: uuidv4(), roomId, actionId, refinementText, collectionName,
      normalizedIntent, renderPrompt, createdAt: new Date().toISOString(),
    }
    briefs.set(brief.id, brief)
    res.json({ brief })
  } catch (err) {
    console.error('[scene-briefs] OpenAI error:', err)
    res.status(502).json({ error: 'Failed to interpret scene brief' })
  }
})

// ─── POST /api/render-jobs ────────────────────────────────────────────────────
// Returns immediately with status "submitted", then processes asynchronously.

app.post('/api/render-jobs', (req, res) => {
  const { briefId, productId = null, product } = req.body as {
    briefId: string
    productId?: string | null
    product: ProductDetails
  }

  const brief = briefs.get(briefId)
  if (!brief) { res.status(404).json({ error: 'Brief not found' }); return }

  const compiledPrompt = compileRenderPrompt(brief.renderPrompt, product)
  const editPrompt = compileEditPrompt(product)

  const job: RenderJobRecord = {
    jobId: uuidv4(),
    briefId,
    roomId: brief.roomId,
    productId,
    briefRenderPrompt: brief.renderPrompt,
    compiledPrompt,
    editPrompt,
    model: 'gpt-image-2',
    size: '1024x1024',
    quality: 'auto',
    status: 'submitted',
    imageUrl: null,
    revisedPrompt: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  renderJobs.set(job.jobId, job)
  console.info(`[render-jobs] created ${job.jobId} for product ${productId ?? 'collection'}`)

  // Kick off generation asynchronously — response returns before it starts
  setImmediate(() => processRenderJob(job.jobId, renderJobs))

  res.json({ job })
})

// ─── GET /api/render-jobs/:jobId ─────────────────────────────────────────────

app.get('/api/render-jobs/:jobId', (req, res) => {
  const job = renderJobs.get(req.params.jobId)
  if (!job) { res.status(404).json({ error: 'Render job not found' }); return }
  res.json({ job })
})

// ─── GET /api/render-jobs/:jobId/image ───────────────────────────────────────
// Serves the buffered image bytes — keeps polling responses lean and URLs permanent.

app.get('/api/render-jobs/:jobId/image', (req, res) => {
  const img = imageBuffers.get(req.params.jobId)
  if (!img) { res.status(404).json({ error: 'Image not ready' }); return }
  res.set('Content-Type', img.contentType)
  res.set('Cache-Control', 'public, max-age=86400')
  res.send(img.data)
})

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3001)
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
