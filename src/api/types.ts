import type { RoomProfile, DetectedZone, QuickActionId } from '../types'

// ─── Request shapes ───────────────────────────────────────────────────────────

export interface RoomUploadRequest {
  imageDataUrl: string
  filename: string
}

export interface RoomUploadResponse {
  room: { id: string; name: string; bgColor: string; accentColor: string; floorColor: string; isUploaded: boolean }
}

export interface SceneBriefRequest {
  roomId: string
  actionId: QuickActionId
  refinementText: string
  collectionName: string
}

export interface ProductDetails {
  title: string
  material: string
  cabinetColor: string
}

export interface CreateRenderJobRequest {
  briefId: string
  productId: string
  product: ProductDetails
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface RoomsResponse {
  rooms: RoomProfile[]
}

export interface RoomAnalysisResponse {
  zones: DetectedZone[]
}

export interface SceneBriefRecord {
  id: string
  roomId: string
  actionId: QuickActionId
  refinementText: string
  collectionName: string
  normalizedIntent: string
  renderPrompt: string
  createdAt: string
}

export interface SceneBriefResponse {
  brief: SceneBriefRecord
}

/**
 * A render job driven by the gpt-image-2 pipeline.
 *
 * Lifecycle:  submitted → processing → succeeded | failed
 *
 * compiledPrompt is the exact string sent to gpt-image-2 (briefRenderPrompt +
 * product details), so the full generation input is always inspectable.
 * imageUrl resolves to GET /api/render-jobs/:jobId/image once succeeded.
 */
export interface RenderJob {
  jobId: string
  briefId: string
  roomId: string
  productId: string | null
  briefRenderPrompt: string
  compiledPrompt: string
  editPrompt: string
  model: 'gpt-image-2'
  size: '1024x1024' | '1792x1024' | '1024x1792'
  quality: 'low' | 'medium' | 'high' | 'auto'
  status: 'submitted' | 'processing' | 'succeeded' | 'failed'
  imageUrl: string | null
  revisedPrompt: string | null
  error: string | null
  createdAt: string
  updatedAt: string
}

export interface RenderJobResponse {
  job: RenderJob
}

export function isTerminalStatus(status: RenderJob['status']): boolean {
  return status === 'succeeded' || status === 'failed'
}
