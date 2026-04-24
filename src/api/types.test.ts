import { describe, it, expect } from 'vitest'
import { isTerminalStatus } from './types'

describe('isTerminalStatus', () => {
  it('returns true for succeeded', () => {
    expect(isTerminalStatus('succeeded')).toBe(true)
  })

  it('returns true for failed', () => {
    expect(isTerminalStatus('failed')).toBe(true)
  })

  it('returns false for submitted', () => {
    expect(isTerminalStatus('submitted')).toBe(false)
  })

  it('returns false for processing', () => {
    expect(isTerminalStatus('processing')).toBe(false)
  })
})
