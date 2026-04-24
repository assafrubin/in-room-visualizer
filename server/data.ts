import type { RoomProfile, QuickAction, DetectedZone } from '../src/types/index.js'

export const ROOMS: RoomProfile[] = [
  {
    id: 'living-room',
    name: 'Living Room',
    bgColor: '#D4C5A9',
    accentColor: '#8B7355',
    floorColor: '#C4A882',
  },
  {
    id: 'tv-room',
    name: 'TV Room',
    bgColor: '#C8D4E0',
    accentColor: '#4A6FA5',
    floorColor: '#9EA8B5',
  },
  {
    id: 'uploaded-room',
    name: 'Uploaded Room (My Place)',
    bgColor: '#D0CFC4',
    accentColor: '#7A7A6A',
    floorColor: '#B8B5A5',
    isUploaded: true,
  },
]

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'replace-existing', label: 'Replace existing cabinet', zone: 'Existing cabinet zone', icon: '🔄' },
  { id: 'near-tv',          label: 'Put near the TV',          zone: 'TV zone',              icon: '📺' },
  { id: 'right-wall',       label: 'Place against the right wall', zone: 'Right wall',       icon: '→'  },
  { id: 'back-wall',        label: 'Place against the back wall',  zone: 'Back wall',        icon: '↑'  },
  { id: 'front-existing',   label: 'Put in front of the existing cabinet', zone: 'Cabinet zone', icon: '⬤' },
]

// Per-room zone sets (server determines these; client no longer has DETECTED_ZONES)
const ZONES_BY_ROOM: Record<string, DetectedZone[]> = {
  'living-room': [
    { label: 'TV',              icon: '📺', description: 'Wall-mounted, left side' },
    { label: 'Existing cabinet',icon: '🗄️', description: '80 × 40 cm approx.' },
    { label: 'Right wall',      icon: '📐', description: '~220 cm clear space' },
    { label: 'Back wall',       icon: '📏', description: 'Full width, 300 cm' },
  ],
  'tv-room': [
    { label: 'TV unit',         icon: '📺', description: 'Central, floor-standing' },
    { label: 'Left alcove',     icon: '📐', description: '~150 cm wide niche' },
    { label: 'Right wall',      icon: '📏', description: '~180 cm clear' },
  ],
  'uploaded-room': [
    { label: 'TV',              icon: '📺', description: 'Detected on left wall' },
    { label: 'Existing cabinet',icon: '🗄️', description: 'Approx. 90 × 45 cm' },
    { label: 'Back wall',       icon: '📏', description: 'Full width available' },
    { label: 'Corner zone',     icon: '📐', description: 'Right corner, ~100 cm' },
  ],
}

export function getZonesForRoom(roomId: string): DetectedZone[] {
  return ZONES_BY_ROOM[roomId] ?? ZONES_BY_ROOM['living-room']
}

export function getRoomById(id: string): RoomProfile | undefined {
  return ROOMS.find(r => r.id === id)
}

export function getActionById(id: string): QuickAction | undefined {
  return QUICK_ACTIONS.find(a => a.id === id)
}
