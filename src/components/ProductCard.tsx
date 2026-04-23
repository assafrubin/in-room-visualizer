import type { Product, CollectionSceneBrief } from '../types'
import { CabinetSVG, PersonalizedCabinetImage } from './CabinetImage'

interface ProductCardProps {
  product: Product
  sceneBrief: CollectionSceneBrief | null
  inRoomMode: boolean
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="star-rating">
      {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="product-card product-card--loading">
      <div className="product-card__image-wrap">
        <div className="skeleton skeleton--image" />
        <div className="skeleton-badge">Personalizing...</div>
      </div>
      <div className="product-card__body">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--subtitle" />
        <div className="skeleton skeleton--price" />
      </div>
    </div>
  )
}

export function ProductCard({ product, sceneBrief, inRoomMode }: ProductCardProps) {
  const effectiveState = inRoomMode ? product.cardState : 'standard'

  if (effectiveState === 'loading') return <SkeletonCard />

  const isPersonalized = effectiveState === 'personalized' && sceneBrief !== null

  return (
    <div className={`product-card ${isPersonalized ? 'product-card--personalized' : ''}`}>
      <div className="product-card__image-wrap">
        {isPersonalized && sceneBrief ? (
          <PersonalizedCabinetImage
            color={product.cabinetColor}
            accentColor={product.cabinetAccent}
            room={sceneBrief.room}
            size={280}
          />
        ) : (
          <CabinetSVG
            color={product.cabinetColor}
            accentColor={product.cabinetAccent}
            size={280}
          />
        )}
        {isPersonalized && (
          <div className="personalized-badge">
            <span className="personalized-badge__icon">✦</span>
            In your {sceneBrief!.room.name}
          </div>
        )}
      </div>
      <div className="product-card__body">
        <p className="product-card__material">{product.material}</p>
        <h3 className="product-card__title">{product.title}</h3>
        <div className="product-card__meta">
          <StarRating rating={product.rating} />
          <span className="product-card__reviews">({product.reviewCount})</span>
        </div>
        <div className="product-card__footer">
          <span className="product-card__price">{product.priceDisplay}</span>
          <button className="btn btn--secondary btn--sm">Add to cart</button>
        </div>
      </div>
    </div>
  )
}
