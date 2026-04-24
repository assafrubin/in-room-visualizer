export interface RoomProfile {
  id: string
  name: string
  bgColor: string
  accentColor: string
  floorColor: string
  isUploaded?: boolean
  /** Data URL of the user's uploaded photo — replaces the SVG thumbnail when present */
  imageDataUrl?: string
}

export type QuickActionId =
  | 'replace-existing'
  | 'near-tv'
  | 'right-wall'
  | 'back-wall'
  | 'front-existing'

export interface QuickAction {
  id: QuickActionId
  label: string
  zone: string
  icon: string
}

export interface DetectedZone {
  label: string
  icon: string
  description: string
}

export interface CollectionSceneBrief {
  room: RoomProfile
  action: QuickAction
  refinementText: string
  collectionName: string
}

export type ProductCardDisplayState = 'standard' | 'loading' | 'personalized'

export interface Product {
  id: string
  title: string
  price: number
  priceDisplay: string
  cabinetColor: string
  cabinetAccent: string
  cardState: ProductCardDisplayState
  rating: number
  reviewCount: number
  material: string
  imageUrl?: string
}

export type SetupStep = 'room-select' | 'actions'

/**
 * The client-side brief extended with server-assigned fields from POST /api/scene-briefs.
 * normalizedIntent and renderPrompt are produced by the language model;
 * id and createdAt are assigned by the server.
 */
export interface EnhancedSceneBrief extends CollectionSceneBrief {
  id: string
  normalizedIntent: string
  renderPrompt: string
  createdAt: string
}
