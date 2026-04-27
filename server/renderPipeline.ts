import { generateImage, editImage, type ProviderModelId } from './imageProvider.js'
import { getModelConfig } from './db.js'
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
  compiledPrompt: string        // final prompt sent for generate path
  editPrompt: string            // prompt for the edit path (uploaded room)
  // Provider model used (filled once job completes)
  model: ProviderModelId | null
  size: '1024x1024' | '1792x1024' | '1024x1792'
  quality: 'low' | 'medium' | 'high' | 'auto'
  // Lifecycle
  status: 'submitted' | 'processing' | 'succeeded' | 'failed'
  imageUrl: string | null       // /api/render-jobs/:jobId/image once succeeded
  revisedPrompt: string | null
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
  const desc = product.material ? `${product.title} crafted from ${product.material.toLowerCase()}` : product.title
  return [
    `Add a ${desc} to this room.`,
    'Place it naturally against a wall in a visually balanced and realistic position.',
    'Keep all existing walls, floor, ceiling, and other furniture exactly as they are.',
    'Ultra-realistic editorial interior design photography, sharp detail, seamless integration.',
  ].join(' ')
}

// Used when a pre-rendered cutout is available as a second image input.
// The model sees the exact product rather than inferring from text description.
export function compileCutoutEditPrompt(): string {
  return [
    'Image 1 is a room photo. Image 2 is a product cutout — the white areas are transparent background, ignore them.',
    'Composite the furniture piece from Image 2 into the room in Image 1 exactly as it appears: same model, colors, textures, proportions, and design details.',
    'Place it naturally against a wall in a visually balanced position.',
    'Do NOT substitute or invent a different piece of furniture — use the exact product shown in Image 2.',
    'Keep all existing walls, floor, ceiling, and other furniture from Image 1 exactly as they are.',
    'Output a single ultra-realistic interior design photo with seamless lighting and sharp detail.',
  ].join(' ')
}

// ─── Image storage ────────────────────────────────────────────────────────────

export const imageBuffers = new Map<string, { data: Buffer; contentType: string }>()
export const roomImages   = new Map<string, { data: Buffer; contentType: string }>()

// ─── Cutout fetcher ───────────────────────────────────────────────────────────

async function fetchCutout(
  productId: string,
  shopDomain: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const backofficeUrl = process.env.BACKOFFICE_URL
  if (!backofficeUrl) return null
  try {
    const res = await fetch(
      `${backofficeUrl}/api/assets/${encodeURIComponent(productId)}/cutout?shop=${encodeURIComponent(shopDomain)}`,
    )
    if (!res.ok) return null
    return {
      buffer: Buffer.from(await res.arrayBuffer()),
      contentType: res.headers.get('content-type') ?? 'image/png',
    }
  } catch {
    return null
  }
}

// ─── Processing ──────────────────────────────────────────────────────────────

export async function processRenderJob(
  jobId: string,
  jobs: Map<string, RenderJobRecord>,
): Promise<void> {
  const job = jobs.get(jobId)
  if (!job) return

  job.status = 'processing'
  job.updatedAt = new Date().toISOString()
  const startedAt = Date.now()

  const { defaultModel, fallbackModel } = getModelConfig()

  try {
    const roomImg = roomImages.get(job.roomId)
    let usedModel: ProviderModelId

    if (roomImg) {
      // Try to load the pre-generated cutout so the model sees the exact product.
      const cutout = job.productId && job.shopDomain
        ? await fetchCutout(job.productId, job.shopDomain)
        : null

      if (cutout) {
        console.info(`[render-pipeline] job ${jobId} using cutout for product ${job.productId}`)
      }

      const { result, usedModel: m } = await editImage(defaultModel, fallbackModel, {
        imageBuffer: roomImg.data,
        imageContentType: roomImg.contentType,
        cutoutBuffer: cutout?.buffer,
        cutoutContentType: cutout?.contentType,
        prompt: cutout ? compileCutoutEditPrompt() : job.editPrompt,
        size: job.size,
      })
      usedModel = m
      imageBuffers.set(jobId, { data: result.buffer, contentType: result.contentType })
      console.info(`[render-pipeline] job ${jobId} edit succeeded via ${usedModel} (${result.buffer.length} bytes)`)
    } else {
      const { result, usedModel: m } = await generateImage(defaultModel, fallbackModel, {
        prompt: job.compiledPrompt,
        size: job.size,
        quality: job.quality,
      })
      usedModel = m
      imageBuffers.set(jobId, { data: result.buffer, contentType: result.contentType })
      console.info(`[render-pipeline] job ${jobId} generate succeeded via ${usedModel} (${result.buffer.length} bytes)`)
    }

    job.model = usedModel
    job.status = 'succeeded'
    job.imageUrl = `/api/render-jobs/${jobId}/image`
    job.revisedPrompt = null
    job.updatedAt = new Date().toISOString()
    trackRenderJobSucceeded(jobId, job.productId, Date.now() - startedAt, job.shopDomain ?? undefined, usedModel)
  } catch (err) {
    job.status = 'failed'
    job.error = err instanceof Error ? err.message : String(err)
    job.updatedAt = new Date().toISOString()
    console.error(`[render-pipeline] job ${jobId} failed:`, err)
    trackRenderJobFailed(jobId, job.productId, job.error, Date.now() - startedAt, job.shopDomain ?? undefined, job.model ?? undefined)
  }
}
