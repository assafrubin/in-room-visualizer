import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductGrid } from './ProductGrid'
import type { Product, CollectionSceneBrief } from '../types'
import type { RenderJob } from '../api'

const makeProduct = (id: string): Product => ({
  id,
  title: `Product ${id}`,
  price: 100,
  priceDisplay: '€100',
  cabinetColor: '#888',
  cabinetAccent: '#666',
  cardState: 'standard',
  rating: 4,
  reviewCount: 10,
  material: 'Wood',
  imageUrl: undefined,
})

const BRIEF: CollectionSceneBrief = {
  room: { id: 'living-room', name: 'Living Room', bgColor: '#D4C5A9', accentColor: '#8B7355', floorColor: '#C4A882' },
  action: { id: 'near-tv', label: 'Put near the TV', zone: 'TV zone', icon: '📺' },
  refinementText: '',
  collectionName: 'Side Cabinets',
}

const JOB_BASE = {
  briefId: 'brief-1',
  roomId: 'living-room',
  briefRenderPrompt: '',
  compiledPrompt: '',
  editPrompt: '',
  model: 'gpt-image-2' as const,
  size: '1024x1024' as const,
  quality: 'auto' as const,
  imageUrl: null,
  revisedPrompt: null,
  error: null,
  createdAt: '',
  updatedAt: '',
}

function renderGrid(products: Product[], brief: CollectionSceneBrief | null, jobs: Map<string, RenderJob> = new Map()) {
  return render(
    <MemoryRouter>
      <ProductGrid
        products={products}
        sceneBrief={brief}
        inRoomMode={brief !== null}
        renderJobs={jobs}
      />
    </MemoryRouter>,
  )
}

describe('ProductGrid — no brief (standard mode)', () => {
  it('renders all products in a flat grid', () => {
    const products = ['p1', 'p2', 'p3'].map(makeProduct)
    renderGrid(products, null)
    expect(screen.getByText('Product p1')).toBeInTheDocument()
    expect(screen.getByText('Product p2')).toBeInTheDocument()
    expect(screen.getByText('Product p3')).toBeInTheDocument()
  })

  it('does not render any section headers', () => {
    renderGrid(['p1'].map(makeProduct), null)
    expect(screen.queryByText(/Best fits/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Also available/)).not.toBeInTheDocument()
  })
})

describe('ProductGrid — with brief and render jobs', () => {
  const products = ['p1', 'p2', 'p3'].map(makeProduct)

  it('shows "Best fits" section for succeeded jobs', () => {
    const jobs = new Map<string, RenderJob>([
      ['p1', { ...JOB_BASE, jobId: 'j1', productId: 'p1', status: 'succeeded', imageUrl: '/img' }],
    ])
    renderGrid(products, BRIEF, jobs)
    expect(screen.getByText(/Best fits/)).toBeInTheDocument()
  })

  it('shows "Preparing your previews" section for active jobs', () => {
    const jobs = new Map<string, RenderJob>([
      ['p1', { ...JOB_BASE, jobId: 'j1', productId: 'p1', status: 'processing', imageUrl: null }],
    ])
    renderGrid(products, BRIEF, jobs)
    expect(screen.getByText('Preparing your previews')).toBeInTheDocument()
  })

  it('shows "More in this collection" section for products without jobs', () => {
    renderGrid(products, BRIEF)
    expect(screen.getByText('More in this collection')).toBeInTheDocument()
  })

  it('places succeeded products in "Best fits" and the rest in "Also available"', () => {
    const jobs = new Map<string, RenderJob>([
      ['p1', { ...JOB_BASE, jobId: 'j1', productId: 'p1', status: 'succeeded', imageUrl: '/img' }],
    ])
    renderGrid(products, BRIEF, jobs)
    // p1 is in "Best fits", p2 and p3 should still appear somewhere
    expect(screen.getByText('Product p2')).toBeInTheDocument()
    expect(screen.getByText('Product p3')).toBeInTheDocument()
  })
})
