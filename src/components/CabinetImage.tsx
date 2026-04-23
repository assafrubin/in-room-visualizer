import type { QuickActionId } from '../types'

interface CabinetImageProps {
  color: string
  accentColor: string
  size?: number
}

export function CabinetSVG({ color, accentColor, size = 200 }: CabinetImageProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#F2EDE6" />
      <rect x="40" y="60" width="120" height="110" rx="3" fill={color} />
      <rect x="36" y="55" width="128" height="10" rx="2" fill={accentColor} />
      <rect x="50" y="168" width="12" height="18" rx="2" fill={accentColor} />
      <rect x="138" y="168" width="12" height="18" rx="2" fill={accentColor} />
      <line x1="100" y1="65" x2="100" y2="168" stroke={accentColor} strokeWidth="2" />
      <circle cx="88" cy="115" r="4" fill={accentColor} />
      <circle cx="112" cy="115" r="4" fill={accentColor} />
      <ellipse cx="100" cy="188" rx="55" ry="5" fill="rgba(0,0,0,0.08)" />
    </svg>
  )
}

interface PersonalizedImageProps {
  color: string
  accentColor: string
  room: { bgColor: string; floorColor: string; accentColor: string }
  size?: number
}

export function PersonalizedCabinetImage({ color, accentColor, room, size = 200 }: PersonalizedImageProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill={room.bgColor} />
      <rect x="0" y="148" width="200" height="52" fill={room.floorColor} />
      <rect x="0" y="145" width="200" height="5" fill={room.accentColor} opacity="0.4" />
      <rect x="8" y="60" width="40" height="28" rx="2" fill="#1a1a1a" opacity="0.7" />
      <rect x="24" y="88" width="8" height="6" fill="#333" opacity="0.5" />
      <rect x="68" y="90" width="90" height="58" rx="2" fill={color} />
      <rect x="65" y="86" width="96" height="7" rx="2" fill={accentColor} />
      <rect x="76" y="146" width="10" height="10" rx="1" fill={accentColor} />
      <rect x="148" y="146" width="10" height="10" rx="1" fill={accentColor} />
      <line x1="113" y1="93" x2="113" y2="148" stroke={accentColor} strokeWidth="1.5" />
      <circle cx="103" cy="119" r="3" fill={accentColor} />
      <circle cx="123" cy="119" r="3" fill={accentColor} />
      <ellipse cx="113" cy="156" rx="40" ry="4" fill="rgba(0,0,0,0.12)" />
    </svg>
  )
}

/* ── PDP landscape room scene ───────────────────────────── */

interface PDPRoomSceneProps {
  cabinetColor: string
  cabinetAccent: string
  room: { bgColor: string; floorColor: string; accentColor: string }
  actionId: QuickActionId
}

function Cabinet({
  x, y, w = 90, h = 60,
  color, accent,
  highlight = false,
}: {
  x: number; y: number; w?: number; h?: number
  color: string; accent: string
  highlight?: boolean
}) {
  return (
    <g>
      {highlight && (
        <rect
          x={x - 4} y={y - 4}
          width={w + 8} height={h + 16}
          rx="5"
          fill="rgba(37,99,235,0.10)"
          stroke="rgba(37,99,235,0.45)"
          strokeWidth="2"
          strokeDasharray="6 3"
        />
      )}
      <rect x={x} y={y} width={w} height={h} rx="2" fill={color} />
      <rect x={x - 2} y={y - 5} width={w + 4} height={6} rx="1.5" fill={accent} />
      <rect x={x + 6} y={y + h} width={9} height={10} rx="1" fill={accent} />
      <rect x={x + w - 15} y={y + h} width={9} height={10} rx="1" fill={accent} />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={accent} strokeWidth="1.2" />
      <circle cx={x + w / 2 - 9} cy={y + h / 2} r="2.5" fill={accent} />
      <circle cx={x + w / 2 + 9} cy={y + h / 2} r="2.5" fill={accent} />
      <ellipse cx={x + w / 2} cy={y + h + 10} rx={w / 2 - 4} ry="4" fill="rgba(0,0,0,0.10)" />
    </g>
  )
}

const PLACEMENTS: Record<QuickActionId, { x: number; y: number; w?: number; h?: number }> = {
  'near-tv':         { x: 106, y: 150, w: 86 },
  'replace-existing':{ x: 192, y: 150, w: 86 },
  'right-wall':      { x: 356, y: 148, w: 92 },
  'back-wall':       { x: 192, y: 118, w: 82, h: 52 },
  'front-existing':  { x: 185, y: 164, w: 90 },
}

export function PDPRoomScene({ cabinetColor, cabinetAccent, room, actionId }: PDPRoomSceneProps) {
  const pos = PLACEMENTS[actionId]

  return (
    <svg
      width="100%"
      viewBox="0 0 480 300"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Wall */}
      <rect width="480" height="300" fill={room.bgColor} />
      {/* Floor */}
      <rect x="0" y="222" width="480" height="78" fill={room.floorColor} />
      {/* Baseboard */}
      <rect x="0" y="219" width="480" height="5" fill={room.accentColor} opacity="0.35" />
      {/* Ceiling trim */}
      <rect x="0" y="0" width="480" height="6" fill={room.accentColor} opacity="0.18" />

      {/* Window (right) */}
      <rect x="370" y="18" width="88" height="120" rx="3" fill="rgba(255,255,255,0.25)" stroke={room.accentColor} strokeWidth="1" opacity="0.55" />
      <line x1="414" y1="18" x2="414" y2="138" stroke={room.accentColor} strokeWidth="1" opacity="0.3" />
      <line x1="370" y1="78" x2="458" y2="78" stroke={room.accentColor} strokeWidth="1" opacity="0.3" />
      {/* Curtain left */}
      <rect x="364" y="14" width="14" height="126" rx="3" fill={room.accentColor} opacity="0.3" />
      {/* Curtain right */}
      <rect x="456" y="14" width="14" height="126" rx="3" fill={room.accentColor} opacity="0.3" />

      {/* TV (wall-mounted, left) */}
      <rect x="18" y="40" width="78" height="52" rx="2" fill="#111" opacity="0.85" />
      <rect x="22" y="44" width="70" height="44" rx="1" fill="#1a1a2e" opacity="0.9" />
      {/* Screen glow */}
      <rect x="22" y="44" width="70" height="44" rx="1" fill="url(#screenGlow)" opacity="0.35" />
      <defs>
        <linearGradient id="screenGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4080ff" />
          <stop offset="100%" stopColor="#1a1a2e" />
        </linearGradient>
      </defs>
      {/* TV mount */}
      <rect x="52" y="92" width="10" height="14" rx="1" fill="#333" opacity="0.7" />
      {/* TV label */}
      <rect x="18" y="30" width="24" height="13" rx="3" fill="#2563EB" opacity="0.95" />
      <text x="30" y="40" fontFamily="sans-serif" fontSize="8" fill="white" textAnchor="middle" fontWeight="700">TV</text>

      {/* Existing cabinet silhouette (visible unless replacing it) */}
      {actionId !== 'replace-existing' && (
        <g opacity="0.45">
          <rect x="192" y="150" width="86" height="60" rx="2" fill={room.accentColor} />
          <rect x="190" y="145" width="90" height="6" rx="1.5" fill={room.accentColor} />
          <line x1="235" y1="150" x2="235" y2="210" stroke={room.bgColor} strokeWidth="1.2" opacity="0.5" />
          <rect x="200" y="210" width="9" height="10" rx="1" fill={room.accentColor} />
          <rect x="269" y="210" width="9" height="10" rx="1" fill={room.accentColor} />
        </g>
      )}

      {/* Sofa */}
      <rect x="150" y="195" width="200" height="32" rx="6" fill={room.accentColor} opacity="0.38" />
      <rect x="150" y="185" width="200" height="14" rx="4" fill={room.accentColor} opacity="0.28" />
      <rect x="148" y="187" width="14" height="40" rx="4" fill={room.accentColor} opacity="0.28" />
      <rect x="338" y="187" width="14" height="40" rx="4" fill={room.accentColor} opacity="0.28" />

      {/* THE CABINET — highlighted, positioned by action */}
      <Cabinet
        x={pos.x}
        y={pos.y}
        w={pos.w ?? 90}
        h={pos.h ?? 60}
        color={cabinetColor}
        accent={cabinetAccent}
        highlight={true}
      />
    </svg>
  )
}
