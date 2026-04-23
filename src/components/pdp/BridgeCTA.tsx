import type { CollectionSceneBrief } from '../../types'

interface BridgeCTAProps {
  brief: CollectionSceneBrief
  onNavigateToCollection: () => void
}

export function BridgeCTA({ brief, onNavigateToCollection }: BridgeCTAProps) {
  return (
    <section className="bridge-cta" aria-label="Browse collection in this setup">
      <div className="bridge-cta__inner">
        <div className="bridge-cta__left">
          <div className="bridge-cta__eyebrow">
            <span className="bridge-cta__spark">✦</span>
            Your room setup is ready
          </div>

          <h2 className="bridge-cta__title">
            Want to see more Side Cabinets in your {brief.room.name}?
          </h2>
          <p className="bridge-cta__body">
            The same room, placement, and preferences you just chose will apply
            to the full <strong>Side Cabinets</strong> collection automatically.
            Browse all options with your personalised view already applied.
          </p>

          {/* Scene brief summary */}
          <div className="bridge-cta__brief">
            <div
              className="bridge-cta__room-swatch"
              style={{ backgroundColor: brief.room.bgColor, borderColor: brief.room.accentColor }}
            >
              <div className="bridge-cta__room-floor" style={{ backgroundColor: brief.room.floorColor }} />
            </div>
            <div className="bridge-cta__chips">
              <span className="bridge-chip bridge-chip--room">{brief.room.name}</span>
              <span className="bridge-chip bridge-chip--action">{brief.action.label}</span>
              {brief.refinementText && (
                <span className="bridge-chip bridge-chip--refinement">
                  "{brief.refinementText}"
                </span>
              )}
            </div>
          </div>

          <div className="bridge-cta__actions">
            <button className="btn btn--primary btn--lg bridge-cta__btn" onClick={onNavigateToCollection}>
              Browse Side Cabinets in your {brief.room.name} →
            </button>
            <p className="bridge-cta__footnote">
              Your room and placement preferences carry over. Edit anytime from the collection.
            </p>
          </div>
        </div>

        <div className="bridge-cta__right">
          <div className="bridge-cta__preview-label">What you'll see in the collection</div>
          <div className="bridge-cta__card-previews">
            {['Oak Veneer', 'Bamboo', 'Walnut'].map((mat, i) => (
              <div key={mat} className={`bridge-preview-card ${i === 0 ? 'bridge-preview-card--visible' : ''}`}>
                <div
                  className="bridge-preview-card__img"
                  style={{ backgroundColor: brief.room.bgColor }}
                >
                  <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                    <rect width="80" height="80" fill={brief.room.bgColor} />
                    <rect x="0" y="58" width="80" height="22" fill={brief.room.floorColor} />
                    <rect x="0" y="56" width="80" height="3" fill={brief.room.accentColor} opacity="0.3" />
                    <rect x="16" y="30" width="48" height="30" rx="2"
                      fill={['#8B7355','#B89A7A','#8CA08C'][i]} />
                    <rect x="14" y="26" width="52" height="5" rx="1.5"
                      fill={['#6A5740','#967D5E','#6F836F'][i]} />
                    <line x1="40" y1="30" x2="40" y2="60"
                      stroke={['#6A5740','#967D5E','#6F836F'][i]} strokeWidth="1" />
                    <rect x="22" y="60" width="7" height="6" rx="1"
                      fill={['#6A5740','#967D5E','#6F836F'][i]} />
                    <rect x="51" y="60" width="7" height="6" rx="1"
                      fill={['#6A5740','#967D5E','#6F836F'][i]} />
                  </svg>
                  <span className="bridge-preview-card__badge">✦</span>
                </div>
                <p className="bridge-preview-card__mat">{mat}</p>
              </div>
            ))}
            <div className="bridge-preview-card bridge-preview-card--more">
              <div className="bridge-preview-card__img bridge-preview-card__img--count">
                +7 more
              </div>
              <p className="bridge-preview-card__mat">All materials</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
