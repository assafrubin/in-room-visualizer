import type { DetectedZone, RoomProfile } from '../../types'

interface RoomAnalysisProps {
  room: RoomProfile
  zones: DetectedZone[]
  isLoadingZones: boolean
  onChangeRoom: () => void
}

function RoomPreview({ room }: { room: RoomProfile }) {
  return (
    <svg width="100%" height="140" viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect width="320" height="140" fill={room.bgColor} />
      <rect x="0" y="106" width="320" height="34" fill={room.floorColor} />
      <rect x="0" y="102" width="320" height="5" fill={room.accentColor} opacity="0.3" />
      <rect x="30" y="24" width="72" height="48" rx="2" fill="#1a1a1a" opacity="0.8" />
      <rect x="62" y="72" width="8" height="8" fill="#333" opacity="0.6" />
      <text x="66" y="70" fontFamily="sans-serif" fontSize="9" fill="white" opacity="0.4" textAnchor="middle">TV</text>
      <rect x="30" y="20" width="30" height="14" rx="3" fill="#2563EB" opacity="0.9" />
      <text x="45" y="30" fontFamily="sans-serif" fontSize="8" fill="white" textAnchor="middle" fontWeight="600">TV</text>
      <rect x="140" y="58" width="44" height="48" rx="2" fill={room.accentColor} opacity="0.65" />
      <line x1="162" y1="58" x2="162" y2="106" stroke={room.bgColor} strokeWidth="1.5" opacity="0.6" />
      <circle cx="155" cy="84" r="3" fill={room.bgColor} opacity="0.5" />
      <circle cx="169" cy="84" r="3" fill={room.bgColor} opacity="0.5" />
      <rect x="126" y="48" width="70" height="14" rx="3" fill="#7C3AED" opacity="0.9" />
      <text x="161" y="58" fontFamily="sans-serif" fontSize="8" fill="white" textAnchor="middle" fontWeight="600">Cabinet</text>
      <rect x="295" y="0" width="8" height="106" fill={room.accentColor} opacity="0.2" />
      <rect x="288" y="36" width="22" height="14" rx="3" fill="#059669" opacity="0.9" />
      <text x="299" y="46" fontFamily="sans-serif" fontSize="7" fill="white" textAnchor="middle" fontWeight="600">R.Wall</text>
      <rect x="188" y="82" width="88" height="28" rx="4" fill={room.accentColor} opacity="0.4" />
      <rect x="188" y="76" width="88" height="10" rx="3" fill={room.accentColor} opacity="0.3" />
      <rect x="0" y="0" width="320" height="6" fill={room.accentColor} opacity="0.15" />
      <rect x="8" y="4" width="50" height="14" rx="3" fill="#D97706" opacity="0.9" />
      <text x="33" y="14" fontFamily="sans-serif" fontSize="7" fill="white" textAnchor="middle" fontWeight="600">Back Wall</text>
    </svg>
  )
}

export function RoomAnalysis({ room, zones, isLoadingZones, onChangeRoom }: RoomAnalysisProps) {
  return (
    <div className="room-analysis">
      <div className="room-analysis__header">
        <div className="room-analysis__room-info">
          <span className="room-analysis__room-name">{room.name}</span>
          <button className="btn btn--ghost btn--xs" onClick={onChangeRoom}>
            Change room
          </button>
        </div>
      </div>

      <div className="room-analysis__preview">
        <RoomPreview room={room} />
      </div>

      <div className="room-analysis__zones">
        {isLoadingZones ? (
          <p className="room-analysis__zones-label">Analysing room…</p>
        ) : (
          <>
            <p className="room-analysis__zones-label">
              <span className="room-analysis__check">✓</span>
              We found {zones.length} placement zones in your room
            </p>
            <div className="zone-chips">
              {zones.map(zone => (
                <span key={zone.label} className="zone-chip" title={zone.description}>
                  <span className="zone-chip__icon">{zone.icon}</span>
                  {zone.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
