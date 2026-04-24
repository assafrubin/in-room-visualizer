import { describe, it, expect } from 'vitest'
import { ROOMS, getRoomById, getZonesForRoom, getActionById } from './data.js'

describe('ROOMS', () => {
  it('includes all three preset rooms', () => {
    const ids = ROOMS.map(r => r.id)
    expect(ids).toContain('living-room')
    expect(ids).toContain('tv-room')
    expect(ids).toContain('uploaded-room')
  })

  it('marks uploaded-room with isUploaded', () => {
    const uploaded = ROOMS.find(r => r.id === 'uploaded-room')
    expect(uploaded?.isUploaded).toBe(true)
  })

  it('every room has required color fields', () => {
    for (const room of ROOMS) {
      expect(room.bgColor).toMatch(/^#/)
      expect(room.accentColor).toMatch(/^#/)
      expect(room.floorColor).toMatch(/^#/)
    }
  })
})

describe('getRoomById', () => {
  it('returns the correct room for a known id', () => {
    const room = getRoomById('living-room')
    expect(room?.id).toBe('living-room')
    expect(room?.name).toBe('Living Room')
  })

  it('returns undefined for an unknown id', () => {
    expect(getRoomById('does-not-exist')).toBeUndefined()
  })

  it('finds uploaded-room', () => {
    expect(getRoomById('uploaded-room')).toBeDefined()
  })
})

describe('getZonesForRoom', () => {
  it('returns zones with required fields for a known room', () => {
    const zones = getZonesForRoom('living-room')
    expect(zones.length).toBeGreaterThan(0)
    for (const zone of zones) {
      expect(zone).toHaveProperty('label')
      expect(zone).toHaveProperty('icon')
      expect(zone).toHaveProperty('description')
    }
  })

  it('returns distinct zones for tv-room vs living-room', () => {
    const living = getZonesForRoom('living-room')
    const tv = getZonesForRoom('tv-room')
    // They have different zone sets
    expect(living.map(z => z.label)).not.toEqual(tv.map(z => z.label))
  })

  it('returns uploaded-room zones for that id', () => {
    const zones = getZonesForRoom('uploaded-room')
    expect(zones.length).toBeGreaterThan(0)
  })

  it('falls back to living-room zones for an unknown room', () => {
    const fallback = getZonesForRoom('unknown-xyz')
    const livingRoom = getZonesForRoom('living-room')
    expect(fallback).toEqual(livingRoom)
  })
})

describe('getActionById', () => {
  it('returns the correct action for a known id', () => {
    const action = getActionById('near-tv')
    expect(action?.id).toBe('near-tv')
    expect(action?.label).toBeDefined()
  })

  it('returns undefined for an unknown id', () => {
    expect(getActionById('not-real')).toBeUndefined()
  })

  it('finds all five quick actions', () => {
    const ids = ['replace-existing', 'near-tv', 'right-wall', 'back-wall', 'front-existing']
    for (const id of ids) {
      expect(getActionById(id)?.id).toBe(id)
    }
  })
})
