import type { Product, CollectionSceneBrief } from '../types'
import type { RenderJob } from '../api'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  products: Product[]
  sceneBrief: CollectionSceneBrief | null
  inRoomMode: boolean
  renderJobs: Map<string, RenderJob>
}

export function ProductGrid({ products, sceneBrief, inRoomMode, renderJobs }: ProductGridProps) {
  if (!inRoomMode || !sceneBrief) {
    return (
      <div className="product-grid">
        {products.map(p => (
          <ProductCard key={p.id} product={p} sceneBrief={null} renderJob={null} />
        ))}
      </div>
    )
  }

  // Group by live render-job status
  const rendered  = products.filter(p => renderJobs.get(p.id)?.status === 'succeeded')
  const rendering = products.filter(p => {
    const s = renderJobs.get(p.id)?.status
    return s === 'submitted' || s === 'processing'
  })
  const rest = products.filter(p => {
    const s = renderJobs.get(p.id)?.status
    return !s || s === 'failed'
  })

  return (
    <div className="product-grid-section">
      {rendered.length > 0 && (
        <section className="product-group">
          <div className="product-group__header">
            <span className="product-group__badge product-group__badge--personalized">✦ Personalized</span>
            <h2 className="product-group__title">Best fits for {sceneBrief.room.name}</h2>
            <p className="product-group__subtitle">
              Styled for "{sceneBrief.action.label.toLowerCase()}"
            </p>
          </div>
          <div className="product-grid">
            {rendered.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                sceneBrief={sceneBrief}
                renderJob={renderJobs.get(p.id) ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {rendering.length > 0 && (
        <section className="product-group">
          <div className="product-group__header">
            <span className="product-group__badge product-group__badge--loading">⟳ Rendering</span>
            <h2 className="product-group__title">Preparing your previews</h2>
            <p className="product-group__subtitle">Generating in-room views — this takes about 15–30 seconds</p>
          </div>
          <div className="product-grid">
            {rendering.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                sceneBrief={sceneBrief}
                renderJob={renderJobs.get(p.id) ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="product-group">
          <div className="product-group__header">
            <span className="product-group__badge product-group__badge--standard">Also available</span>
            <h2 className="product-group__title">More in this collection</h2>
            <p className="product-group__subtitle">
              {rendered.length + rendering.length > 0
                ? 'Standard view — previews focused on top picks'
                : 'Standard view'}
            </p>
          </div>
          <div className="product-grid">
            {rest.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                sceneBrief={sceneBrief}
                renderJob={renderJobs.get(p.id) ?? null}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
