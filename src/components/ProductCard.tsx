import { Link } from 'react-router-dom'
import type { Product, CollectionSceneBrief } from '../types'
import type { RenderJob } from '../api'
import { CabinetSVG, PersonalizedCabinetImage } from './CabinetImage'

interface ProductCardProps {
  product: Product
  sceneBrief: CollectionSceneBrief | null
  renderJob: RenderJob | null
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="star-rating">
      {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
    </span>
  )
}

function SkeletonCard({ label = 'Rendering…' }: { label?: string }) {
  return (
    <div className="product-card product-card--loading">
      <div className="product-card__image-wrap">
        <div className="skeleton skeleton--image" />
        <div className="skeleton-badge">{label}</div>
      </div>
      <div className="product-card__body">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--subtitle" />
        <div className="skeleton skeleton--price" />
      </div>
    </div>
  )
}

function ProductImage({ product }: { product: Product }) {
  if (product.imageUrl) {
    return (
      <img
        src={product.imageUrl}
        alt={product.title}
        className="product-card__product-img"
      />
    )
  }
  return <CabinetSVG color={product.cabinetColor} accentColor={product.cabinetAccent} size={280} />
}

function CardBody({ product }: { product: Product }) {
  return (
    <div className="product-card__body">
      <p className="product-card__material">{product.material}</p>
      <h3 className="product-card__title">{product.title}</h3>
      <div className="product-card__meta">
        <StarRating rating={product.rating} />
        <span className="product-card__reviews">({product.reviewCount})</span>
      </div>
      <div className="product-card__footer">
        <span className="product-card__price">{product.priceDisplay}</span>
        <button
          className="btn btn--secondary btn--sm"
          onClick={e => e.preventDefault()}
        >
          Add to cart
        </button>
      </div>
    </div>
  )
}

export function ProductCard({ product, sceneBrief, renderJob }: ProductCardProps) {
  const pdpHref = `/products/${product.id}`

  if (renderJob) {
    const { status, imageUrl, error } = renderJob

    if (status === 'submitted' || status === 'processing') {
      return <SkeletonCard label={status === 'submitted' ? 'Queued…' : 'Rendering…'} />
    }

    if (status === 'succeeded' && imageUrl && sceneBrief) {
      return (
        <Link to={pdpHref} className="product-card product-card--personalized product-card--link">
          <div className="product-card__image-wrap">
            <img
              src={imageUrl}
              alt={`${product.title} in ${sceneBrief.room.name}`}
              className="product-card__render-img"
            />
            <div className="personalized-badge">
              <span className="personalized-badge__icon">✦</span>
              In your {sceneBrief.room.name}
            </div>
          </div>
          <CardBody product={product} />
        </Link>
      )
    }

    if (status === 'failed') {
      return (
        <Link to={pdpHref} className="product-card product-card--failed product-card--link">
          <div className="product-card__image-wrap">
            <ProductImage product={product} />
            <div className="render-error-badge" title={error ?? 'Render failed'}>
              Could not render
            </div>
          </div>
          <CardBody product={product} />
        </Link>
      )
    }
  }

  const isPersonalized = sceneBrief !== null

  return (
    <Link to={pdpHref} className={`product-card ${isPersonalized ? 'product-card--personalized' : ''} product-card--link`}>
      <div className="product-card__image-wrap">
        {isPersonalized && sceneBrief ? (
          <PersonalizedCabinetImage
            color={product.cabinetColor}
            accentColor={product.cabinetAccent}
            room={sceneBrief.room}
            size={280}
          />
        ) : (
          <ProductImage product={product} />
        )}
        {isPersonalized && sceneBrief && (
          <div className="personalized-badge">
            <span className="personalized-badge__icon">✦</span>
            In your {sceneBrief.room.name}
          </div>
        )}
      </div>
      <CardBody product={product} />
    </Link>
  )
}
