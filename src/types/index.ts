export interface RoomProfile {
  id: string
  name: string
  bgColor: string
  accentColor: string
  floorColor: string
  isUploaded?: boolean
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
}

export type SetupStep = 'room-select' | 'actions'
