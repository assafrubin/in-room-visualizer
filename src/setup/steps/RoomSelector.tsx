import { useRef } from 'react'
import type { RoomProfile } from '../../types'

interface RoomSelectorProps {
  room: RoomProfile | null
  rooms: RoomProfile[]
  isLoading: boolean
  onSelect: (room: RoomProfile) => void
  onUpload: (file: File) => void
}

function RoomThumbnail({ room }: { room: RoomProfile }) {
  if (room.imageDataUrl) {
    return (
      <img
        src={room.imageDataUrl}
        alt={room.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    )
  }
  return (
    <svg width="160" height="110" viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="110" fill={room.bgColor} />
      <rect x="0" y="82" width="160" height="28" fill={room.floorColor} />
      <rect x="0" y="79" width="160" height="4" fill={room.accentColor} opacity="0.3" />
      <rect x="110" y="12" width="36" height="48" rx="2" fill="rgba(255,255,255,0.4)" stroke={room.accentColor} strokeWidth="1" opacity="0.6" />
      <line x1="128" y1="12" x2="128" y2="60" stroke={room.accentColor} strokeWidth="1" opacity="0.4" />
      <line x1="110" y1="36" x2="146" y2="36" stroke={room.accentColor} strokeWidth="1" opacity="0.4" />
      <rect x="12" y="62" width="70" height="22" rx="4" fill={room.accentColor} opacity="0.5" />
      <rect x="12" y="56" width="70" height="10" rx="3" fill={room.accentColor} opacity="0.35" />
      <rect x="10" y="38" width="26" height="26" rx="2" fill={room.accentColor} opacity="0.55" />
      <line x1="23" y1="38" x2="23" y2="64" stroke={room.bgColor} strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export function RoomSelector({ room, rooms, isLoading, onSelect, onUpload }: RoomSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    // Reset so selecting the same file again still fires onChange
    e.target.value = ''
  }

  return (
    <div className="room-selector">
      <div className="setup-section-header">
        <h3 className="setup-section-title">Choose a room</h3>
        <p className="setup-section-subtitle">
          We'll place each cabinet into your space so you can see how it fits.
        </p>
      </div>

      {isLoading ? (
        <div className="setup-loading">Loading rooms…</div>
      ) : (
        <div className="room-grid">
          {rooms.map(r => (
            <button
              key={r.id + (r.imageDataUrl ? '-uploaded' : '')}
              className={`room-card ${room?.id === r.id && room?.imageDataUrl === r.imageDataUrl ? 'room-card--selected' : ''}`}
              onClick={() => onSelect(r)}
            >
              <div className="room-card__thumbnail">
                <RoomThumbnail room={r} />
                {r.isUploaded && !r.imageDataUrl && (
                  <span className="room-card__uploaded-tag">Uploaded</span>
                )}
                {r.isUploaded && r.imageDataUrl && (
                  <span className="room-card__uploaded-tag">Your photo</span>
                )}
                {room?.id === r.id && room?.imageDataUrl === r.imageDataUrl && (
                  <div className="room-card__check">✓</div>
                )}
              </div>
              <span className="room-card__name">{r.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="upload-zone">
        <div className="upload-zone__icon">⬆</div>
        <div className="upload-zone__text">
          <strong>Upload a room photo</strong>
          <span>JPG or PNG — your photo stays private</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          className="btn btn--outline btn--sm"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose file
        </button>
      </div>
    </div>
  )
}
