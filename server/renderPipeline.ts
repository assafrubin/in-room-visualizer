import OpenAI, { toFile } from 'openai'
import { trackRenderJobSucceeded, trackRenderJobFailed } from './analytics.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductDetails {
  title: string
  material: string
  cabinetColor: string
}

export interface RenderJobRecord {
  jobId: string
  briefId: string
  roomId: string
  productId: string | null
  shopDomain: string | null
  // Prompt compilation — explicit and inspectable
  briefRenderPrompt: string     // raw prompt from the scene-brief GPT step
  compiledPrompt: string        // final prompt sent to gpt-image-2 (generate path)
  editPrompt: string            // prompt for the edit path (uploaded room)
  // gpt-image-2 call contract
  model: 'gpt-image-2'
  size: '1024x1024' | '1792x1024' | '1024x1792'
  quality: 'low' | 'medium' | 'high' | 'auto'
  // Lifecycle
  status: 'submitted' | 'processing' | 'succeeded' | 'failed'
  imageUrl: string | null       // /api/render-jobs/:jobId/image once succeeded
  revisedPrompt: string | null  // returned by gpt-image-2 alongside the image
  error: string | null
  createdAt: string
  updatedAt: string
}

// ─── Prompt compilation ───────────────────────────────────────────────────────

export function compileRenderPrompt(
  briefRenderPrompt: string,
  product: ProductDetails,
): string {
  return [
    briefRenderPrompt,
    `The furniture piece is a side cabinet crafted from ${product.material.toLowerCase()}.`,
    'Ultra-realistic editorial interior design photography, sharp detail, professional product visualization.',
  ].join(' ')
}

export function compileEditPrompt(product: ProductDetails): string {
  return [
    `Add a ${product.title} side cabinet crafted from ${product.material.toLowerCase()} to this room.`,
    'Place it naturally against a wall in a visually balanced and realistic position.',
    'Keep all existing walls, floor, ceiling, and other furniture exactly as they are.',
    'Ultra-realistic editorial interior design photography, sharp detail, seamless integration.',
  ].join(' ')
}

// ─── Image storage ────────────────────────────────────────────────────────────

// Generated output images — keyed by jobId
export const imageBuffers = new Map<string, { data: Buffer; contentType: string }>()

// Uploaded room images — keyed by roomId ('uploaded-room')
export const roomImages = new Map<string, { data: Buffer; contentType: string }>()

// ─── Processing ──────────────────────────────────────────────────────────────

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function processRenderJob(
  jobId: string,
  jobs: Map<string, RenderJobRecord>,
): Promise<void> {
  const job = jobs.get(jobId)
  if (!job) return

  job.status = 'processing'
  job.updatedAt = new Date().toISOString()
  const startedAt = Date.now()

  try {
    const client = getClient()
    const roomImg = roomImages.get(job.roomId)

    let imageBuffer: Buffer
    let contentType = 'image/png'

    if (roomImg) {
      // Uploaded room → edit the photo to place the cabinet inside it
      const imageFile = await toFile(
        new Blob([roomImg.data], { type: roomImg.contentType }),
        'room.png',
        { type: roomImg.contentType },
      )

      const response = await client.images.edit({
        model: job.model,
        image: imageFile,
        prompt: job.editPrompt,
        n: 1,
        size: job.size,
      })

      const imageData = response.data[0]
      if (!imageData) throw new Error('gpt-image-2 edit returned empty data array')

      if (imageData.b64_json) {
        imageBuffer = Buffer.from(imageData.b64_json, 'base64')
      } else if (imageData.url) {
        const imgRes = await fetch(imageData.url)
        if (!imgRes.ok) throw new Error(`Failed to fetch edited image: ${imgRes.status}`)
        const ct = imgRes.headers.get('content-type')
        if (ct) contentType = ct
        imageBuffer = Buffer.from(await imgRes.arrayBuffer())
      } else {
        throw new Error('gpt-image-2 edit response contained neither url nor b64_json')
      }

      console.info(`[render-pipeline] job ${jobId} edit succeeded (${imageBuffer.length} bytes)`)
    } else {
      // Preset room → generate from prompt
      const response = await client.images.generate({
        model: job.model,
        prompt: job.compiledPrompt,
        n: 1,
        size: job.size,
        quality: job.quality,
      })

      const imageData = response.data[0]
      if (!imageData) throw new Error('gpt-image-2 returned empty data array')

      if (imageData.b64_json) {
        imageBuffer = Buffer.from(imageData.b64_json, 'base64')
      } else if (imageData.url) {
        const imgRes = await fetch(imageData.url)
        if (!imgRes.ok) throw new Error(`Failed to fetch generated image: ${imgRes.status}`)
        const ct = imgRes.headers.get('content-type')
        if (ct) contentType = ct
        imageBuffer = Buffer.from(await imgRes.arrayBuffer())
      } else {
        throw new Error('gpt-image-2 response contained neither url nor b64_json')
      }

      console.info(`[render-pipeline] job ${jobId} generate succeeded (${imageBuffer.length} bytes)`)
    }

    imageBuffers.set(jobId, { data: imageBuffer, contentType })

    job.status = 'succeeded'
    job.imageUrl = `/api/render-jobs/${jobId}/image`
    job.revisedPrompt = null
    job.updatedAt = new Date().toISOString()
    trackRenderJobSucceeded(jobId, job.productId, Date.now() - startedAt, job.shopDomain ?? undefined)
  } catch (err) {
    job.status = 'failed'
    job.error = err instanceof Error ? err.message : String(err)
    job.updatedAt = new Date().toISOString()
    console.error(`[render-pipeline] job ${jobId} failed:`, err)
    trackRenderJobFailed(jobId, job.productId, job.error, Date.now() - startedAt, job.shopDomain ?? undefined)
  }
}
