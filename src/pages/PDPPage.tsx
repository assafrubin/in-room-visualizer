import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { CollectionSceneBrief, EnhancedSceneBrief } from '../types'
import { MOCK_PRODUCTS } from '../data/mocks'
import { SiteHeader } from '../components/SiteHeader'
import { BridgeCTA } from '../components/pdp/BridgeCTA'
import { PDPInlineSummary } from '../components/pdp/PDPInlineSummary'
import { CabinetSVG, PDPRoomScene } from '../components/CabinetImage'
import { useSetupFlow, SetupModal } from '../setup'
import { api, isTerminalStatus } from '../api'
import type { RenderJob } from '../api'

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
  const { productId } = useParams<{ productId: string }>()
  const PRODUCT = MOCK_PRODUCTS.find(p => p.id === productId) ?? MOCK_PRODUCTS[0]

  const navigate = useNavigate()
  const [pdpBrief, setPdpBrief] = useState<EnhancedSceneBrief | null>(null)
  const [renderJob, setRenderJob] = useState<RenderJob | null>(null)
  const [activeThumb, setActiveThumb] = useState(0)

  // Create a render job whenever the brief changes
  useEffect(() => {
    if (!pdpBrief) { setRenderJob(null); return }
    let cancelled = false
    setRenderJob(null)

    api.createRenderJob({
      briefId: pdpBrief.id,
      productId: PRODUCT.id,
      product: { title: PRODUCT.title, material: PRODUCT.material, cabinetColor: PRODUCT.cabinetColor },
    })
      .then(job => { if (!cancelled) setRenderJob(job) })
      .catch(err => console.error('[PDPPage] create render job failed:', err))

    return () => { cancelled = true }
  }, [pdpBrief?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll until terminal
  useEffect(() => {
    if (!renderJob || isTerminalStatus(renderJob.status)) return

    const timer = setInterval(async () => {
      try {
        const updated = await api.getRenderJob(renderJob.jobId)
        setRenderJob(updated)
      } catch (err) {
        console.error('[PDPPage] poll failed:', err)
      }
    }, 3000)

    return () => clearInterval(timer)
  }, [renderJob?.jobId, renderJob?.status])

  const { openSetup, bindings } = useSetupFlow({
    activeBrief: pdpBrief,
    collectionName: COLLECTION_NAME,
    onConfirm: async (draft: CollectionSceneBrief) => {
      const record = await api.createSceneBrief({
        roomId: draft.room.id,
        actionId: draft.action.id,
        refinementText: draft.refinementText,
        collectionName: draft.collectionName,
      })
      setPdpBrief({ ...draft, ...record })
      // Render job created by the useEffect above once pdpBrief.id changes
    },
  })

  const { isOpen, ...modalProps } = bindings

  const handleClear = useCallback(() => {
    setPdpBrief(null)
    setRenderJob(null)
  }, [])

  const handleNavigateToCollection = useCallback(() => {
    if (!pdpBrief) return
    navigate('/', { state: { importedBrief: pdpBrief satisfies CollectionSceneBrief } })
  }, [navigate, pdpBrief])

  // Determine what to show in the main media area
  function renderMedia() {
    if (!pdpBrief) {
      if (PRODUCT.imageUrl) {
        return (
          <img
            src={PRODUCT.imageUrl}
            alt={PRODUCT.title}
            className="pdp-render-img"
          />
        )
      }
      return <CabinetSVG color={PRODUCT.cabinetColor} accentColor={PRODUCT.cabinetAccent} size={480} />
    }
    if (renderJob?.status === 'succeeded' && renderJob.imageUrl) {
      return (
        <img
          src={renderJob.imageUrl}
          alt={`${PRODUCT.title} in ${pdpBrief.room.name}`}
          className="pdp-render-img"
        />
      )
    }
    if (renderJob?.status === 'failed') {
      // Fallback to SVG scene on error — brief is still active
      return (
        <div className="pdp-render-failed">
          <PDPRoomScene
            cabinetColor={PRODUCT.cabinetColor}
            cabinetAccent={PRODUCT.cabinetAccent}
            room={pdpBrief.room}
            actionId={pdpBrief.action.id}
          />
          <div className="pdp-render-failed__note">
            Render failed — showing preview
          </div>
        </div>
      )
    }
    // submitted / processing — SVG placeholder while generation runs
    return (
      <div className="pdp-render-loading">
        <PDPRoomScene
          cabinetColor={PRODUCT.cabinetColor}
          cabinetAccent={PRODUCT.cabinetAccent}
          room={pdpBrief.room}
          actionId={pdpBrief.action.id}
        />
        <div className="pdp-render-loading__overlay">
          <div className="pdp-render-loading__spinner" />
          <span>Generating your room view…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <SiteHeader />

      <div className="pdp-breadcrumb-bar">
        <div className="pdp-breadcrumb-bar__inner">
          <div className="breadcrumb">
            <a href="#">Home</a><span>›</span>
            <Link to="/">Side Cabinets</Link><span>›</span>
            <span>{PRODUCT.title}</span>
          </div>
        </div>
      </div>

      <div className="pdp-hero">
        <div className="pdp-hero__inner">

          <div className="pdp-media">
            <div className="pdp-media__main">
              {renderMedia()}
            </div>

            <div className="pdp-media__thumbs">
              {[PRODUCT.imageUrl ?? null, '#E8DCC8', '#D8E8E4'].map((thumb, i) => (
                <button
                  key={i}
                  className={`pdp-thumb ${activeThumb === i ? 'pdp-thumb--active' : ''}`}
                  onClick={() => setActiveThumb(i)}
                  style={{ background: typeof thumb === 'string' && !thumb.startsWith('http') ? thumb : '#F2EDE6' }}
                >
                  {typeof thumb === 'string' && thumb.startsWith('http') ? (
                    <img src={thumb} alt={PRODUCT.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                      <rect width="60" height="60" fill={typeof thumb === 'string' ? thumb : '#F2EDE6'} />
                      <rect x="12" y="18" width="36" height="30" rx="2" fill={PRODUCT.cabinetColor} />
                      <rect x="10" y="15" width="40" height="5" rx="1" fill={PRODUCT.cabinetAccent} />
                      <line x1="30" y1="18" x2="30" y2="48" stroke={PRODUCT.cabinetAccent} strokeWidth="1" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {!pdpBrief ? (
              <div className="pdp-room-cta">
                <div className="pdp-room-cta__icon">✦</div>
                <div className="pdp-room-cta__text">
                  <strong>See this in your room</strong>
                  <span>Free instant preview — no app needed</span>
                </div>
                <button className="btn btn--primary" onClick={openSetup}>Try it</button>
              </div>
            ) : (
              <PDPInlineSummary brief={pdpBrief} onEdit={openSetup} onClear={handleClear} />
            )}
          </div>

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
                <span className="pdp-dims-grid__label">Width</span><span className="pdp-dims-grid__value">80 cm</span>
                <span className="pdp-dims-grid__label">Height</span><span className="pdp-dims-grid__value">72 cm</span>
                <span className="pdp-dims-grid__label">Depth</span><span className="pdp-dims-grid__value">42 cm</span>
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

      {pdpBrief && (
        <BridgeCTA brief={pdpBrief} onNavigateToCollection={handleNavigateToCollection} />
      )}

      <section className="pdp-related">
        <div className="pdp-related__inner">
          <h2 className="pdp-related__title">More from Side Cabinets</h2>
          <div className="pdp-related__grid">
            {MOCK_PRODUCTS.filter(p => p.id !== PRODUCT.id).slice(0, 4).map(p => (
              <Link to={`/products/${p.id}`} key={p.id} className="pdp-related-card">
                <div className="pdp-related-card__img">
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <CabinetSVG color={p.cabinetColor} accentColor={p.cabinetAccent} size={160} />
                  }
                </div>
                <p className="pdp-related-card__material">{p.material}</p>
                <p className="pdp-related-card__title">{p.title}</p>
                <p className="pdp-related-card__price">{p.priceDisplay}</p>
              </Link>
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

      {isOpen && <SetupModal {...modalProps} contextLabel={PRODUCT.title} singleProduct />}
    </div>
  )
}
