import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import type { CollectionSceneBrief } from '../types'
import { MOCK_PRODUCTS } from '../data/mocks'
import { SiteHeader } from '../components/SiteHeader'
import { ProductGrid } from '../components/ProductGrid'
import { InRoomBanner } from '../components/InRoomBanner'
import { useSetupFlow, SetupModal } from '../setup'

const COLLECTION_NAME = 'Side Cabinets'

interface LocationState {
  importedBrief?: CollectionSceneBrief
}

export function CollectionPage() {
  const location = useLocation()
  const importedBrief = (location.state as LocationState)?.importedBrief ?? null

  const [sceneBrief, setSceneBrief] = useState<CollectionSceneBrief | null>(importedBrief)
  const inRoomMode = sceneBrief !== null

  // Seed from imported brief the first time we land with one
  useEffect(() => {
    if (importedBrief) setSceneBrief(importedBrief)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { openSetup, bindings } = useSetupFlow({
    activeBrief: sceneBrief,
    collectionName: COLLECTION_NAME,
    onConfirm: (brief) => setSceneBrief(brief),
  })

  const { isOpen, ...modalProps } = bindings

  return (
    <div className="app">
      <SiteHeader />

      {inRoomMode && sceneBrief && (
        <InRoomBanner brief={sceneBrief} onEdit={openSetup} onClear={() => setSceneBrief(null)} />
      )}

      <div className="collection-hero">
        <div className="collection-hero__inner">
          <div className="breadcrumb">
            <a href="#">Home</a>
            <span>›</span>
            <a href="#">Storage</a>
            <span>›</span>
            <span>Side Cabinets</span>
          </div>
          <div className="collection-hero__content">
            <div className="collection-hero__text">
              <h1 className="collection-hero__title">{COLLECTION_NAME}</h1>
              <p className="collection-hero__desc">
                Compact storage for living rooms, bedrooms, and hallways.
                Available in wood, steel, and painted finishes.
              </p>
              <p className="collection-hero__count">{MOCK_PRODUCTS.length} products</p>
            </div>
            {!inRoomMode && (
              <div className="collection-hero__cta">
                <div className="cta-card">
                  <div className="cta-card__icon">✦</div>
                  <div className="cta-card__text">
                    <strong>See these in your room</strong>
                    <span>Visualize any cabinet in your actual space — free, instant preview</span>
                  </div>
                  <button className="btn btn--primary btn--lg" onClick={openSetup}>
                    Get started
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filters-bar__inner">
          <div className="filters-bar__filters">
            <span className="filter-label">Filter:</span>
            <button className="filter-chip filter-chip--active">All</button>
            <button className="filter-chip">Under $200</button>
            <button className="filter-chip">Wood</button>
            <button className="filter-chip">With doors</button>
            <button className="filter-chip">Steel</button>
          </div>
          <div className="filters-bar__right">
            <span className="filter-label">Sort:</span>
            <select className="sort-select">
              <option>{inRoomMode ? 'Best fit for room' : 'Featured'}</option>
              <option>Price: low to high</option>
              <option>Price: high to low</option>
              <option>Top rated</option>
            </select>
          </div>
        </div>
      </div>

      <main className="collection-main">
        <div className="collection-main__inner">
          {/* Demo link to PDP prototype */}
          <div className="pdp-demo-link">
            <span>Try the PDP experience →</span>
            <Link to="/products/malm-side-cabinet" className="btn btn--outline btn--sm">
              View Malm Side Cabinet
            </Link>
          </div>
          <ProductGrid
            products={MOCK_PRODUCTS}
            sceneBrief={sceneBrief}
            inRoomMode={inRoomMode}
          />
        </div>
      </main>

      <footer className="site-footer">
        <p>© 2026 Forma Home · Shopify Visualizer Prototype</p>
      </footer>

      {isOpen && (
        <SetupModal {...modalProps} contextLabel={COLLECTION_NAME} />
      )}
    </div>
  )
}
