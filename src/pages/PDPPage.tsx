import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { CollectionSceneBrief } from '../types'
import { MOCK_PRODUCTS } from '../data/mocks'
import { SiteHeader } from '../components/SiteHeader'
import { BridgeCTA } from '../components/pdp/BridgeCTA'
import { PDPInlineSummary } from '../components/pdp/PDPInlineSummary'
import { CabinetSVG, PDPRoomScene } from '../components/CabinetImage'
import { useSetupFlow, SetupModal } from '../setup'

const PRODUCT = MOCK_PRODUCTS[0]
const COLLECTION_NAME = 'Side Cabinets'

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="pdp-stars">
      <span className="pdp-stars__icons">
        {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
      </span>
      <span className="pdp-stars__count">{rating} ({count} reviews)</span>
    </div>
  )
}

export function PDPPage() {
  const navigate = useNavigate()
  const [pdpBrief, setPdpBrief] = useState<CollectionSceneBrief | null>(null)
  const [activeThumb, setActiveThumb] = useState(0)

  const { openSetup, bindings } = useSetupFlow({
    activeBrief: pdpBrief,
    collectionName: COLLECTION_NAME,
    onConfirm: (brief) => setPdpBrief(brief),
  })

  const { isOpen, ...modalProps } = bindings

  const handleClear = useCallback(() => {
    setPdpBrief(null)
  }, [])

  const handleNavigateToCollection = useCallback(() => {
    if (!pdpBrief) return
    navigate('/', { state: { importedBrief: pdpBrief } })
  }, [navigate, pdpBrief])

  const thumbColors = ['#F2EDE6', '#E8DCC8', '#D8E8E4']

  return (
    <div className="app">
      <SiteHeader />

      {/* Breadcrumb */}
      <div className="pdp-breadcrumb-bar">
        <div className="pdp-breadcrumb-bar__inner">
          <div className="breadcrumb">
            <a href="#">Home</a>
            <span>›</span>
            <Link to="/">Side Cabinets</Link>
            <span>›</span>
            <span>{PRODUCT.title}</span>
          </div>
        </div>
      </div>

      {/* Product hero */}
      <div className="pdp-hero">
        <div className="pdp-hero__inner">

          {/* ── Left: media panel ── */}
          <div className="pdp-media">

            <div className="pdp-media__main">
              {pdpBrief ? (
                <PDPRoomScene
                  cabinetColor={PRODUCT.cabinetColor}
                  cabinetAccent={PRODUCT.cabinetAccent}
                  room={pdpBrief.room}
                  actionId={pdpBrief.action.id}
                />
              ) : (
                <CabinetSVG
                  color={PRODUCT.cabinetColor}
                  accentColor={PRODUCT.cabinetAccent}
                  size={480}
                />
              )}
            </div>

            {/* Thumbnails */}
            <div className="pdp-media__thumbs">
              {thumbColors.map((bg, i) => (
                <button
                  key={i}
                  className={`pdp-thumb ${activeThumb === i ? 'pdp-thumb--active' : ''}`}
                  onClick={() => setActiveThumb(i)}
                  style={{ background: bg }}
                >
                  <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                    <rect width="60" height="60" fill={bg} />
                    <rect x="12" y="18" width="36" height="30" rx="2" fill={PRODUCT.cabinetColor} />
                    <rect x="10" y="15" width="40" height="5" rx="1" fill={PRODUCT.cabinetAccent} />
                    <line x1="30" y1="18" x2="30" y2="48" stroke={PRODUCT.cabinetAccent} strokeWidth="1" />
                  </svg>
                </button>
              ))}
            </div>

            {/* CTA / inline summary */}
            {!pdpBrief ? (
              <div className="pdp-room-cta">
                <div className="pdp-room-cta__icon">✦</div>
                <div className="pdp-room-cta__text">
                  <strong>See this in your room</strong>
                  <span>Free instant preview — no app needed</span>
                </div>
                <button className="btn btn--primary" onClick={openSetup}>
                  Try it
                </button>
              </div>
            ) : (
              <PDPInlineSummary
                brief={pdpBrief}
                onEdit={openSetup}
                onClear={handleClear}
              />
            )}
          </div>

          {/* ── Right: product info ── */}
          <div className="pdp-info">
            <p className="pdp-info__material">{PRODUCT.material}</p>
            <h1 className="pdp-info__title">{PRODUCT.title}</h1>
            <StarRating rating={PRODUCT.rating} count={PRODUCT.reviewCount} />

            <div className="pdp-info__price">
              <span className="pdp-info__price-main">{PRODUCT.priceDisplay}</span>
              <span className="pdp-info__price-note">Free delivery over $75</span>
            </div>

            <p className="pdp-info__desc">
              The {PRODUCT.title} is designed for compact spaces without compromising on storage.
              Crafted from solid {PRODUCT.material.toLowerCase()}, it features two hinged doors,
              adjustable internal shelving, and soft-close hinges. Pairs well with media units
              and open shelving.
            </p>

            <div className="pdp-info__dims">
              <h3 className="pdp-info__dims-title">Dimensions</h3>
              <div className="pdp-dims-grid">
                <span className="pdp-dims-grid__label">Width</span>
                <span className="pdp-dims-grid__value">80 cm</span>
                <span className="pdp-dims-grid__label">Height</span>
                <span className="pdp-dims-grid__value">72 cm</span>
                <span className="pdp-dims-grid__label">Depth</span>
                <span className="pdp-dims-grid__value">42 cm</span>
              </div>
            </div>

            <div className="pdp-info__finishes">
              <h3 className="pdp-info__finishes-title">Finish</h3>
              <div className="pdp-finish-swatches">
                {[
                  { color: PRODUCT.cabinetColor, label: 'Oak', active: true },
                  { color: '#C8C8C8', label: 'White' },
                  { color: '#5E7A5E', label: 'Green' },
                ].map(f => (
                  <button
                    key={f.label}
                    className={`pdp-swatch ${f.active ? 'pdp-swatch--active' : ''}`}
                    style={{ backgroundColor: f.color }}
                    title={f.label}
                  />
                ))}
              </div>
            </div>

            <div className="pdp-info__actions">
              <button className="btn btn--primary btn--lg pdp-add-cart">Add to cart</button>
              <button className="btn btn--outline btn--lg">Save to wishlist</button>
            </div>

            <ul className="pdp-perks">
              <li>✓ Free delivery on orders over $75</li>
              <li>✓ 30-day free returns</li>
              <li>✓ 2-year warranty included</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bridge CTA — only after setup */}
      {pdpBrief && (
        <BridgeCTA brief={pdpBrief} onNavigateToCollection={handleNavigateToCollection} />
      )}

      {/* Related products strip */}
      <section className="pdp-related">
        <div className="pdp-related__inner">
          <h2 className="pdp-related__title">More from Side Cabinets</h2>
          <div className="pdp-related__grid">
            {MOCK_PRODUCTS.slice(1, 5).map(p => (
              <div key={p.id} className="pdp-related-card">
                <div className="pdp-related-card__img">
                  <CabinetSVG color={p.cabinetColor} accentColor={p.cabinetAccent} size={160} />
                </div>
                <p className="pdp-related-card__material">{p.material}</p>
                <p className="pdp-related-card__title">{p.title}</p>
                <p className="pdp-related-card__price">{p.priceDisplay}</p>
              </div>
            ))}
          </div>
          <div className="pdp-related__cta">
            <Link to="/" className="btn btn--outline">
              View all Side Cabinets ({MOCK_PRODUCTS.length})
            </Link>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p>© 2026 Forma Home · Shopify Visualizer Prototype</p>
      </footer>

      {isOpen && (
        <SetupModal {...modalProps} contextLabel={PRODUCT.title} singleProduct />
      )}
    </div>
  )
}
