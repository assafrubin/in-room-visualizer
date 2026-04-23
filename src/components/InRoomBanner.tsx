import type { CollectionSceneBrief } from '../types'
import { SceneBriefChips } from '../setup'

interface InRoomBannerProps {
  brief: CollectionSceneBrief
  onEdit: () => void
  onClear: () => void
}

export function InRoomBanner({ brief, onEdit, onClear }: InRoomBannerProps) {
  return (
    <div className="in-room-banner">
      <div className="in-room-banner__inner">
        <div className="in-room-banner__left">
          <div
            className="in-room-banner__room-swatch"
            style={{ backgroundColor: brief.room.bgColor, borderColor: brief.room.accentColor }}
          >
            <div
              className="in-room-banner__room-floor"
              style={{ backgroundColor: brief.room.floorColor }}
            />
          </div>
          <div className="in-room-banner__info">
            <div className="in-room-banner__top-line">
              <span className="in-room-banner__label">In-room view</span>
              <span className="in-room-banner__dot">·</span>
              <span className="in-room-banner__collection">{brief.collectionName}</span>
              <span className="in-room-banner__scope-note">
                (this collection only)
              </span>
            </div>
            <div className="in-room-banner__bottom-line">
              <SceneBriefChips brief={brief} variant="plain" />
            </div>
          </div>
        </div>
        <div className="in-room-banner__actions">
          <button className="btn btn--ghost btn--sm" onClick={onEdit}>
            Edit
          </button>
          <button className="btn btn--ghost btn--sm in-room-banner__clear" onClick={onClear} title="Exit in-room view">
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
