import type {
  RoomsResponse,
  RoomAnalysisResponse,
  RoomUploadRequest,
  RoomUploadResponse,
  SceneBriefRequest,
  SceneBriefResponse,
  CreateRenderJobRequest,
  RenderJobResponse,
} from './types'

export type { SceneBriefRecord, RenderJob, ProductDetails } from './types'
export { isTerminalStatus } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  getRooms: () =>
    request<RoomsResponse>('/rooms').then(r => r.rooms),

  uploadRoom: (body: RoomUploadRequest) =>
    request<RoomUploadResponse>('/rooms/upload', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(r => r.room),

  analyzeRoom: (roomId: string) =>
    request<RoomAnalysisResponse>(`/rooms/${roomId}/analysis`, { method: 'POST' })
      .then(r => r.zones),

  createSceneBrief: (body: SceneBriefRequest) =>
    request<SceneBriefResponse>('/scene-briefs', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(r => r.brief),

  createRenderJob: (body: CreateRenderJobRequest) =>
    request<RenderJobResponse>('/render-jobs', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(r => r.job),

  getRenderJob: (jobId: string) =>
    request<RenderJobResponse>(`/render-jobs/${jobId}`).then(r => r.job),
}
