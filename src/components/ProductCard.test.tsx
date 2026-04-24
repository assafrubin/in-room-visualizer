import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductCard } from './ProductCard'
import type { Product, CollectionSceneBrief } from '../types'
import type { RenderJob } from '../api'

const PRODUCT: Product = {
  id: 'p1',
  title: 'Dressoir Lucca',
  price: 290.5,
  priceDisplay: '€290,50',
  cabinetColor: '#C4A882',
  cabinetAccent: '#A88B65',
  cardState: 'standard',
  rating: 4.6,
  reviewCount: 312,
  material: 'Oak veneer',
  imageUrl: 'https://example.com/product.jpg',
}

const ROOM: CollectionSceneBrief['room'] = {
  id: 'living-room',
  name: 'Living Room',
  bgColor: '#D4C5A9',
  accentColor: '#8B7355',
  floorColor: '#C4A882',
}

const BRIEF: CollectionSceneBrief = {
  room: ROOM,
  action: { id: 'near-tv', label: 'Put near the TV', zone: 'TV zone', icon: '📺' },
  refinementText: '',
  collectionName: 'Side Cabinets',
}

const JOB_BASE = {
  jobId: 'job-1',
  briefId: 'brief-1',
  roomId: 'living-room',
  productId: 'p1',
  briefRenderPrompt: 'A room.',
  compiledPrompt: 'A room with oak veneer.',
  editPrompt: 'Add cabinet to room.',
  model: 'gpt-image-2' as const,
  size: '1024x1024' as const,
  quality: 'auto' as const,
  imageUrl: null,
  revisedPrompt: null,
  error: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function renderCard(product = PRODUCT, brief: CollectionSceneBrief | null = null, job: RenderJob | null = null) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} sceneBrief={brief} renderJob={job} />
    </MemoryRouter>,
  )
}

describe('ProductCard — standard state (no brief, no job)', () => {
  it('shows the product title', () => {
    renderCard()
    expect(screen.getByText('Dressoir Lucca')).toBeInTheDocument()
  })

  it('shows the product price', () => {
    renderCard()
    expect(screen.getByText('€290,50')).toBeInTheDocument()
  })

  it('shows the product material', () => {
    renderCard()
    expect(screen.getByText('Oak veneer')).toBeInTheDocument()
  })

  it('renders the real product image when imageUrl is set', () => {
    renderCard()
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/product.jpg')
    expect(img).toHaveAttribute('alt', 'Dressoir Lucca')
  })

  it('links to the product PDP', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/products/p1')
  })
})

describe('ProductCard — render job: submitted / processing', () => {
  it('shows skeleton with "Queued…" for submitted status', () => {
    renderCard(PRODUCT, BRIEF, { ...JOB_BASE, status: 'submitted' })
    expect(screen.getByText('Queued…')).toBeInTheDocument()
  })

  it('shows skeleton with "Rendering…" for processing status', () => {
    renderCard(PRODUCT, BRIEF, { ...JOB_BASE, status: 'processing' })
    expect(screen.getByText('Rendering…')).toBeInTheDocument()
  })

  it('does not show the product title while rendering (skeleton hides it)', () => {
    renderCard(PRODUCT, BRIEF, { ...JOB_BASE, status: 'processing' })
    expect(screen.queryByText('Dressoir Lucca')).not.toBeInTheDocument()
  })
})

describe('ProductCard — render job: succeeded', () => {
  const succeededJob: RenderJob = {
    ...JOB_BASE,
    status: 'succeeded',
    imageUrl: '/api/render-jobs/job-1/image',
  }

  it('shows the AI-generated image', () => {
    renderCard(PRODUCT, BRIEF, succeededJob)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', '/api/render-jobs/job-1/image')
  })

  it('shows the personalized badge with the room name', () => {
    renderCard(PRODUCT, BRIEF, succeededJob)
    expect(screen.getByText(/In your Living Room/)).toBeInTheDocument()
  })

  it('shows the product title and price', () => {
    renderCard(PRODUCT, BRIEF, succeededJob)
    expect(screen.getByText('Dressoir Lucca')).toBeInTheDocument()
    expect(screen.getByText('€290,50')).toBeInTheDocument()
  })
})

describe('ProductCard — render job: failed', () => {
  const failedJob: RenderJob = {
    ...JOB_BASE,
    status: 'failed',
    error: 'OpenAI timeout',
  }

  it('shows "Could not render" badge', () => {
    renderCard(PRODUCT, BRIEF, failedJob)
    expect(screen.getByText('Could not render')).toBeInTheDocument()
  })

  it('falls back to the real product image (not a skeleton)', () => {
    renderCard(PRODUCT, BRIEF, failedJob)
    // The product image should still be visible as fallback
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/product.jpg')
  })

  it('still shows the product title', () => {
    renderCard(PRODUCT, BRIEF, failedJob)
    expect(screen.getByText('Dressoir Lucca')).toBeInTheDocument()
  })
})

describe('ProductCard — personalized mode (brief active, no job yet)', () => {
  it('shows the personalized badge', () => {
    renderCard(PRODUCT, BRIEF, null)
    expect(screen.getByText(/In your Living Room/)).toBeInTheDocument()
  })

  it('shows the product title', () => {
    renderCard(PRODUCT, BRIEF, null)
    expect(screen.getByText('Dressoir Lucca')).toBeInTheDocument()
  })
})
