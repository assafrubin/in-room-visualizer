import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import type { CollectionSceneBrief, EnhancedSceneBrief } from '../types'
import { MOCK_PRODUCTS } from '../data/mocks'
import { SiteHeader } from '../components/SiteHeader'
import { ProductGrid } from '../components/ProductGrid'
import { InRoomBanner } from '../components/InRoomBanner'
import { useSetupFlow, SetupModal } from '../setup'
import { api, isTerminalStatus } from '../api'
import type { RenderJob } from '../api'
import { track } from '../analytics'

const COLLECTION_NAME = 'Side Cabinets'

// Products that get a real render job when a brief is active.
const RENDER_PRODUCT_IDS = new Set(['p1', 'p4', 'p7', 'p10'])

interface LocationState {
  importedBrief?: CollectionSceneBrief
}

export function CollectionPage() {
  const location = useLocation()
  const importedBrief = (location.state as LocationState)?.importedBrief ?? null

  const [sceneBrief, setSceneBrief] = useState<EnhancedSceneBrief | null>(null)
  const [renderJobs, setRenderJobs] = useState<Map<string, RenderJob>>(new Map())
  const inRoomMode = sceneBrief !== null

  // Upgrade an imported brief from the PDP bridge and seed render jobs
  useEffect(() => {
    if (!importedBrief) return
    api.createSceneBrief({
      roomId: importedBrief.room.id,
      actionId: importedBrief.action.id,
      refinementText: importedBrief.refinementText,
      collectionName: importedBrief.collectionName,
    })
      .then(record => setSceneBrief({ ...importedBrief, ...record }))
      .catch(err => console.error('[CollectionPage] import brief failed:', err))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Create per-product render jobs whenever the active brief changes
  useEffect(() => {
    if (!sceneBrief) {
      setRenderJobs(new Map())
      return
    }

    const briefId = sceneBrief.id
    let cancelled = false
    setRenderJobs(new Map())

    const renderProducts = MOCK_PRODUCTS.filter(p => RENDER_PRODUCT_IDS.has(p.id))

    Promise.all(
      renderProducts.map(p =>
        api.createRenderJob({
          briefId,
          productId: p.id,
          product: { title: p.title, material: p.material, cabinetColor: p.cabinetColor },
        })
          .then(job => [p.id, job] as const)
          .catch(err => {
            console.error(`[CollectionPage] render job failed for ${p.id}:`, err)
            return null
          }),
      ),
    ).then(results => {
      if (cancelled) return
      const map = new Map<string, RenderJob>()
      for (const r of results) {
        if (r) map.set(r[0], r[1])
      }
      setRenderJobs(map)
    })

    return () => { cancelled = true }
  }, [sceneBrief?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll non-terminal jobs every 3 seconds
  useEffect(() => {
    const active = [...renderJobs.entries()].filter(([, j]) => !isTerminalStatus(j.status))
    if (!active.length) return

    const timer = setInterval(() => {
      active.forEach(async ([productId, job]) => {
        try {
          const updated = await api.getRenderJob(job.jobId)
          setRenderJobs(prev => new Map(prev).set(productId, updated))
        } catch (err) {
          console.error('[CollectionPage] poll failed for', job.jobId, err)
        }
      })
    }, 3000)

    return () => clearInterval(timer)
  }, [renderJobs])

  useEffect(() => {
    track('collection_viewed', { surface: 'collection' })
  }, [])

  const { openSetup, bindings } = useSetupFlow({
    activeBrief: sceneBrief,
    collectionName: COLLECTION_NAME,
    surface: 'collection',
    onConfirm: async (draft: CollectionSceneBrief) => {
      const record = await api.createSceneBrief({
        roomId: draft.room.id,
        actionId: draft.action.id,
        refinementText: draft.refinementText,
        collectionName: draft.collectionName,
      })
      setSceneBrief({ ...draft, ...record })
      // Render jobs are created by the useEffect above once sceneBrief.id changes
    },
  })

  const { isOpen, ...modalProps } = bindings

  return (
    <div className="app">
      <SiteHeader />

      {inRoomMode && sceneBrief && (
        <InRoomBanner
          brief={sceneBrief}
          onEdit={() => openSetup('edit')}
          onClear={() => { setSceneBrief(null); setRenderJobs(new Map()) }}
        />
      )}

      <div className="collection-hero">
        <div className="collection-hero__inner">
          <div className="breadcrumb">
            <a href="#">Home</a><span>›</span>
            <a href="#">Storage</a><span>›</span>
            <span>Side Cabinets</span>
          </div>
          <div className="collection-hero__content">
            <div className="collection-hero__text">
              <h1 className="collection-hero__title">{COLLECTION_NAME}</h1>
              <p className="collection-hero__desc">
                Stylish dressoirs and storage cabinets for every interior.
                Available in oak, dark wood, black lacquer, and industrial finishes.
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
                  <button className="btn btn--primary btn--lg" onClick={() => openSetup('get_started')}>Get started</button>
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
          <div className="pdp-demo-link">
            <span>Try the PDP experience →</span>
            <Link to="/products/p1" className="btn btn--outline btn--sm">
              View Dressoir Lucca
            </Link>
          </div>
          <ProductGrid
            products={MOCK_PRODUCTS}
            sceneBrief={sceneBrief}
            inRoomMode={inRoomMode}
            renderJobs={renderJobs}
          />
        </div>
      </main>

      <footer className="site-footer">
        <p>© 2026 Forma Home · Shopify Visualizer Prototype</p>
      </footer>

      {isOpen && <SetupModal {...modalProps} contextLabel={COLLECTION_NAME} />}
    </div>
  )
}
