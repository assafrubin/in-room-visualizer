import { describe, it, expect } from 'vitest'
import { compileRenderPrompt, compileEditPrompt } from './renderPipeline.js'

const product = {
  title: 'Dressoir Lucca',
  material: 'Oak veneer',
  cabinetColor: '#C4A882',
}

describe('compileRenderPrompt', () => {
  it('starts with the brief render prompt', () => {
    const result = compileRenderPrompt('Place the cabinet near the TV.', product)
    expect(result).toMatch(/^Place the cabinet near the TV\./)
  })

  it('includes the product material in lowercase', () => {
    const result = compileRenderPrompt('Base.', product)
    expect(result).toContain('oak veneer')
    expect(result).not.toContain('Oak veneer')
  })

  it('appends photography quality descriptor', () => {
    const result = compileRenderPrompt('Base.', product)
    expect(result).toContain('Ultra-realistic')
  })

  it('returns a single joined string (no newlines)', () => {
    const result = compileRenderPrompt('Base.', product)
    expect(result).not.toContain('\n')
  })

  it('produces different output for different materials', () => {
    const r1 = compileRenderPrompt('Base.', { ...product, material: 'Solid pine' })
    const r2 = compileRenderPrompt('Base.', { ...product, material: 'Black metal' })
    expect(r1).not.toEqual(r2)
    expect(r1).toContain('solid pine')
    expect(r2).toContain('black metal')
  })
})

describe('compileEditPrompt', () => {
  it('includes the product title', () => {
    const result = compileEditPrompt(product)
    expect(result).toContain('Dressoir Lucca')
  })

  it('includes the material in lowercase', () => {
    const result = compileEditPrompt(product)
    expect(result).toContain('oak veneer')
  })

  it('instructs to preserve the existing room', () => {
    const result = compileEditPrompt(product)
    expect(result).toContain('Keep all existing')
  })

  it('references placing against a wall', () => {
    const result = compileEditPrompt(product)
    expect(result).toContain('wall')
  })

  it('is different from compileRenderPrompt output', () => {
    const render = compileRenderPrompt('A room.', product)
    const edit = compileEditPrompt(product)
    expect(render).not.toEqual(edit)
  })
})
