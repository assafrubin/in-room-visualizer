import OpenAI, { toFile } from 'openai'
import { GoogleGenAI } from '@google/genai'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProviderModelId =
  | 'gemini-2.5-flash-image-batch'
  | 'gemini-2.5-flash-image'
  | 'gpt-image-2'

export const AVAILABLE_MODELS: { id: ProviderModelId; label: string }[] = [
  { id: 'gemini-2.5-flash-image-batch', label: 'Gemini 2.5 Flash Image (Batch — 50% off)' },
  { id: 'gemini-2.5-flash-image',       label: 'Gemini 2.5 Flash Image (Sync)' },
  { id: 'gpt-image-2',                  label: 'GPT Image 2 (OpenAI)' },
]

export interface GenerateParams {
  prompt: string
  size: '1024x1024' | '1792x1024' | '1024x1792'
  quality: 'low' | 'medium' | 'high' | 'auto'
}

export interface EditParams {
  imageBuffer: Buffer
  imageContentType: string
  // Optional pre-cut product image. When provided, both providers receive it
  // as a second image so the model renders the exact product rather than
  // inferring appearance from the text prompt alone.
  cutoutBuffer?: Buffer
  cutoutContentType?: string
  prompt: string
  size: '1024x1024' | '1792x1024' | '1024x1792'
}

export interface ImageResult {
  buffer: Buffer
  contentType: string
}

interface ImageProvider {
  generate(params: GenerateParams): Promise<ImageResult>
  edit(params: EditParams): Promise<ImageResult>
}

// ─── OpenAI (gpt-image-2) ─────────────────────────────────────────────────────

class OpenAIProvider implements ImageProvider {
  private get client() {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }

  async generate(params: GenerateParams): Promise<ImageResult> {
    const response = await this.client.images.generate({
      model: 'gpt-image-2',
      prompt: params.prompt,
      n: 1,
      size: params.size,
      quality: params.quality,
    })
    return extractOpenAIImage(response.data[0], 'generate')
  }

  async edit(params: EditParams): Promise<ImageResult> {
    const roomFile = await toFile(
      new Blob([params.imageBuffer], { type: params.imageContentType }),
      'room.png',
      { type: params.imageContentType },
    )
    const images: Awaited<ReturnType<typeof toFile>>[] = [roomFile]
    if (params.cutoutBuffer && params.cutoutContentType) {
      images.push(await toFile(
        new Blob([params.cutoutBuffer], { type: params.cutoutContentType }),
        'product.png',
        { type: params.cutoutContentType },
      ))
    }
    const response = await this.client.images.edit({
      model: 'gpt-image-2',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      image: images.length === 1 ? images[0] : (images as any),
      prompt: params.prompt,
      n: 1,
      size: params.size,
    })
    return extractOpenAIImage(response.data[0], 'edit')
  }
}

async function extractOpenAIImage(
  imageData: { b64_json?: string | null; url?: string | null } | undefined,
  mode: string,
): Promise<ImageResult> {
  if (!imageData) throw new Error(`gpt-image-2 ${mode} returned empty data array`)
  if (imageData.b64_json) {
    return { buffer: Buffer.from(imageData.b64_json, 'base64'), contentType: 'image/png' }
  }
  if (imageData.url) {
    const imgRes = await fetch(imageData.url)
    if (!imgRes.ok) throw new Error(`Failed to fetch ${mode} image: ${imgRes.status}`)
    return {
      buffer: Buffer.from(await imgRes.arrayBuffer()),
      contentType: imgRes.headers.get('content-type') ?? 'image/png',
    }
  }
  throw new Error(`gpt-image-2 ${mode} response contained neither url nor b64_json`)
}

// ─── Gemini ───────────────────────────────────────────────────────────────────
// Gemini 2.5 Flash with image generation modality.
// Batch mode submits via the Gemini Batch API for a ~50% cost reduction;
// the batch processes asynchronously but typically within seconds to minutes
// for single-item payloads. Falls back to sync if the batch API is unavailable.

const GEMINI_MODEL = 'gemini-2.5-flash-image'

function sizeHint(size: GenerateParams['size']): string {
  if (size === '1792x1024') return 'landscape orientation (16:9)'
  if (size === '1024x1792') return 'portrait orientation (9:16)'
  return 'square format (1:1)'
}

class GeminiProvider implements ImageProvider {
  constructor(private readonly batchMode: boolean) {}

  private get ai() {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' })
  }

  async generate(params: GenerateParams): Promise<ImageResult> {
    const prompt = `${params.prompt} Render in ${sizeHint(params.size)}.`
    if (this.batchMode) {
      try {
        return await this.batchGenerate(prompt)
      } catch (batchErr) {
        console.warn('[gemini] batch mode failed, falling back to sync:', (batchErr as Error).message)
        return this.syncGenerate(prompt)
      }
    }
    return this.syncGenerate(prompt)
  }

  async edit(params: EditParams): Promise<ImageResult> {
    // Gemini accepts image + text → image; batch mode not used for edits
    // because multipart file upload is not yet supported by the batch REST endpoint.
    const ai = this.ai
    const prompt = `${params.prompt} Render in ${sizeHint(params.size)}.`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [
      { inlineData: { data: params.imageBuffer.toString('base64'), mimeType: params.imageContentType } },
    ]
    if (params.cutoutBuffer && params.cutoutContentType) {
      parts.push({ inlineData: { data: params.cutoutBuffer.toString('base64'), mimeType: params.cutoutContentType } })
    }
    parts.push({ text: prompt })

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: { responseModalities: ['IMAGE', 'TEXT'] },
    })

    return extractGeminiImage(response, 'edit')
  }

  private async syncGenerate(prompt: string): Promise<ImageResult> {
    const response = await this.ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseModalities: ['IMAGE', 'TEXT'] },
    })
    return extractGeminiImage(response, 'generate')
  }

  // batchGenerateContent — the Gemini batch method, supported by this model.
  // Sends requests in a single HTTP call for reduced per-request overhead.
  private async batchGenerate(prompt: string): Promise<ImageResult> {
    const apiKey = process.env.GEMINI_API_KEY ?? ''
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:batchGenerateContent?key=${apiKey}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }],
      }),
    })

    if (!res.ok) {
      throw new Error(`Gemini batchGenerateContent failed ${res.status}: ${await res.text()}`)
    }

    const body = await res.json() as {
      responses?: Array<{
        candidates?: Array<{
          content?: { parts?: Array<{ inlineData?: { data: string; mimeType: string } }> }
        }>
      }>
    }

    for (const resp of body.responses ?? []) {
      for (const candidate of resp.candidates ?? []) {
        for (const part of candidate.content?.parts ?? []) {
          if (part.inlineData?.data && part.inlineData.mimeType) {
            return {
              buffer: Buffer.from(part.inlineData.data, 'base64'),
              contentType: part.inlineData.mimeType,
            }
          }
        }
      }
    }

    throw new Error('Gemini batchGenerateContent returned no image data')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractGeminiImage(response: any, mode: string): ImageResult {
  for (const part of response?.candidates?.[0]?.content?.parts ?? []) {
    if (part?.inlineData?.data && part.inlineData.mimeType) {
      return {
        buffer: Buffer.from(part.inlineData.data as string, 'base64'),
        contentType: part.inlineData.mimeType as string,
      }
    }
  }
  throw new Error(`Gemini ${mode} returned no image data`)
}

// ─── Registry ─────────────────────────────────────────────────────────────────

function getProvider(modelId: ProviderModelId): ImageProvider {
  switch (modelId) {
    case 'gpt-image-2':                  return new OpenAIProvider()
    case 'gemini-2.5-flash-image':       return new GeminiProvider(false)
    case 'gemini-2.5-flash-image-batch': return new GeminiProvider(true)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateImage(
  defaultModel: ProviderModelId,
  fallbackModel: ProviderModelId,
  params: GenerateParams,
): Promise<{ result: ImageResult; usedModel: ProviderModelId }> {
  return runWithFallback(defaultModel, fallbackModel, p => getProvider(p).generate(params))
}

export async function editImage(
  defaultModel: ProviderModelId,
  fallbackModel: ProviderModelId,
  params: EditParams,
): Promise<{ result: ImageResult; usedModel: ProviderModelId }> {
  return runWithFallback(defaultModel, fallbackModel, p => getProvider(p).edit(params))
}

async function runWithFallback(
  defaultModel: ProviderModelId,
  fallbackModel: ProviderModelId,
  call: (model: ProviderModelId) => Promise<ImageResult>,
): Promise<{ result: ImageResult; usedModel: ProviderModelId }> {
  try {
    return { result: await call(defaultModel), usedModel: defaultModel }
  } catch (err) {
    console.warn(`[image-provider] ${defaultModel} failed, falling back to ${fallbackModel}:`, err)
    return { result: await call(fallbackModel), usedModel: fallbackModel }
  }
}
