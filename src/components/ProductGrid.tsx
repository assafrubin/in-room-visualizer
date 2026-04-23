import type { Product, CollectionSceneBrief } from '../types'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  products: Product[]
  sceneBrief: CollectionSceneBrief | null
  inRoomMode: boolean
}

export function ProductGrid({ products, sceneBrief, inRoomMode }: ProductGridProps) {
  if (inRoomMode && sceneBrief) {
    const personalized = products.filter(p => p.cardState === 'personalized')
    const loading = products.filter(p => p.cardState === 'loading')
    const standard = products.filter(p => p.cardState === 'standard')

    return (
      <div className="product-grid-section">
        {personalized.length > 0 && (
          <section className="product-group">
            <div className="product-group__header">
              <span className="product-group__badge product-group__badge--personalized">✦ Personalized</span>
              <h2 className="product-group__title">Best fits for {sceneBrief.room.name}</h2>
              <p className="product-group__subtitle">
                Sized and styled for "{sceneBrief.action.label.toLowerCase()}"
              </p>
            </div>
            <div className="product-grid">
              {personalized.map(p => (
                <ProductCard key={p.id} product={p} sceneBrief={sceneBrief} inRoomMode={inRoomMode} />
              ))}
            </div>
          </section>
        )}
        {loading.length > 0 && (
          <section className="product-group">
            <div className="product-group__header">
              <span className="product-group__badge product-group__badge--loading">⟳ Rendering</span>
              <h2 className="product-group__title">Preparing your previews</h2>
              <p className="product-group__subtitle">A few more are being placed in your room…</p>
            </div>
            <div className="product-grid">
              {loading.map(p => (
                <ProductCard key={p.id} product={p} sceneBrief={sceneBrief} inRoomMode={inRoomMode} />
              ))}
            </div>
          </section>
        )}
        {standard.length > 0 && (
          <section className="product-group">
            <div className="product-group__header">
              <span className="product-group__badge product-group__badge--standard">Also available</span>
              <h2 className="product-group__title">More in this collection</h2>
              <p className="product-group__subtitle">Standard view — no in-room preview yet</p>
            </div>
            <div className="product-grid">
              {standard.map(p => (
                <ProductCard key={p.id} product={p} sceneBrief={sceneBrief} inRoomMode={inRoomMode} />
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="product-grid">
      {products.map(p => (
        <ProductCard key={p.id} product={p} sceneBrief={null} inRoomMode={false} />
      ))}
    </div>
  )
}
