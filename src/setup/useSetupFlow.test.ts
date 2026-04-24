import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { CollectionSceneBrief } from '../types'

// ─── API mock ─────────────────────────────────────────────────────────────────

const ROOMS = [
  { id: 'living-room', name: 'Living Room', bgColor: '#D4C5A9', accentColor: '#8B7355', floorColor: '#C4A882' },
  { id: 'uploaded-room', name: 'Uploaded Room', bgColor: '#D0CFC4', accentColor: '#7A7A6A', floorColor: '#B8B5A5', isUploaded: true },
]

const ZONES = [
  { label: 'TV', icon: '📺', description: 'Left wall' },
]

const BRIEF_RECORD = {
  id: 'brief-1',
  roomId: 'living-room',
  actionId: 'near-tv' as const,
  refinementText: '',
  collectionName: 'Side Cabinets',
  normalizedIntent: 'Cabinet near TV.',
  renderPrompt: 'A living room with cabinet near TV.',
  createdAt: '2026-01-01T00:00:00Z',
}

vi.mock('../api', () => ({
  api: {
    getRooms: vi.fn(),
    analyzeRoom: vi.fn(),
    uploadRoom: vi.fn(),
    createSceneBrief: vi.fn(),
    createRenderJob: vi.fn(),
    getRenderJob: vi.fn(),
  },
  isTerminalStatus: (s: string) => s === 'succeeded' || s === 'failed',
}))

import { api } from '../api'
import { useSetupFlow } from './useSetupFlow'

const ACTION = { id: 'near-tv' as const, label: 'Put near the TV', zone: 'TV zone', icon: '📺' }

function makeConfig(onConfirm = vi.fn()) {
  return {
    activeBrief: null as CollectionSceneBrief | null,
    collectionName: 'Side Cabinets',
    onConfirm,
  }
}

beforeEach(() => {
  vi.mocked(api.getRooms).mockResolvedValue(ROOMS as any)
  vi.mocked(api.analyzeRoom).mockResolvedValue(ZONES)
  vi.mocked(api.uploadRoom).mockResolvedValue({ id: 'uploaded-room', name: 'my-room' } as any)
  vi.mocked(api.createSceneBrief).mockResolvedValue(BRIEF_RECORD as any)
})

describe('useSetupFlow — initial state', () => {
  it('starts closed with step room-select', async () => {
    const { result } = renderHook(() => useSetupFlow(makeConfig()))
    expect(result.current.bindings.isOpen).toBe(false)
    expect(result.current.bindings.step).toBe('room-select')
    expect(result.current.bindings.room).toBeNull()
  })

  it('fetches rooms on mount and populates the rooms list', async () => {
    const { result } = renderHook(() => useSetupFlow(makeConfig()))
    await waitFor(() => expect(result.current.bindings.rooms.length).toBeGreaterThan(0))
    expect(result.current.bindings.rooms.map((r: { id: string }) => r.id)).toContain('living-room')
  })
})

describe('useSetupFlow — openSetup', () => {
  it('opens the modal', async () => {
    const { result } = renderHook(() => useSetupFlow(makeConfig()))
    act(() => result.current.openSetup())
    expect(result.current.bindings.isOpen).toBe(true)
  })

  it('resets to room-select step when no active brief', async () => {
    const { result } = renderHook(() => useSetupFlow(makeConfig()))
    act(() => result.current.openSetup())
    expect(result.current.bindings.step).toBe('room-select')
  })

  it('jumps to actions step and pre-fetches zones when brief is active', async () => {
    const activeBrief: CollectionSceneBrief = {
      room: ROOMS[0] as any,
      action: ACTION,
      refinementText: '',
      collectionName: 'Side Cabinets',
    }
    const { result } = renderHook(() =>
      useSetupFlow({ ...makeConfig(), activeBrief }),
    )
    act(() => result.current.openSetup())
    expect(result.current.bindings.step).toBe('actions')
    await waitFor(() => expect(api.analyzeRoom).toHaveBeenCalledWith('living-room'))
  })
})

describe('useSetupFlow — room selection', () => {
  it('updates room when onRoomSelect is called', () => {
    const { result } = renderHook(() => useSetupFlow(makeConfig()))
    act(() => result.current.bindings.onRoomSelect(ROOMS[0] as any))
    expect(result.current.bindings.room?.id).toBe('living-room')
  })
})

describe('useSetupFlow — room continue', () => {
  it('advances to actions step and fetches zones', async () => {
    const { result } = renderHook(() => useSetupFlow(makeConfig()))

    act(() => result.current.bindings.onRoomSelect(ROOMS[0] as any))
    act(() => result.current.bindings.onRoomContinue())

    expect(result.current.bindings.step).toBe('actions')
    await waitFor(() => expect(result.current.bindings.isLoadingZones).toBe(false))
    expect(result.current.bindings.zones).toEqual(ZONES)
  })

  it('does nothing if no room is selected', () => {
    const { result } = renderHook(() => useSetupFlow(makeConfig()))
    act(() => result.current.bindings.onRoomContinue())
    expect(result.current.bindings.step).toBe('room-select')
  })
})

describe('useSetupFlow — change room', () => {
  it('goes back to room-select step and clears zones', async () => {
    const { result } = renderHook(() => useSetupFlow(makeConfig()))
    act(() => result.current.bindings.onRoomSelect(ROOMS[0] as any))
    act(() => result.current.bindings.onRoomContinue())
    await waitFor(() => expect(result.current.bindings.step).toBe('actions'))

    act(() => result.current.bindings.onChangeRoom())
    expect(result.current.bindings.step).toBe('room-select')
    expect(result.current.bindings.zones).toEqual([])
  })
})

describe('useSetupFlow — close', () => {
  it('closes the modal', () => {
    const { result } = renderHook(() => useSetupFlow(makeConfig()))
    act(() => result.current.openSetup())
    act(() => result.current.bindings.onClose())
    expect(result.current.bindings.isOpen).toBe(false)
  })
})

describe('useSetupFlow — canConfirm', () => {
  it('is false when no room or action is selected', () => {
    const { result } = renderHook(() => useSetupFlow(makeConfig()))
    expect(result.current.bindings.canConfirm).toBe(false)
  })

  it('is true when both room and action are set', () => {
    const { result } = renderHook(() => useSetupFlow(makeConfig()))
    act(() => {
      result.current.bindings.onRoomSelect(ROOMS[0] as any)
      result.current.bindings.onActionSelect(ACTION)
    })
    expect(result.current.bindings.canConfirm).toBe(true)
  })
})

describe('useSetupFlow — confirm', () => {
  it('calls onConfirm with the draft brief and closes the modal', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useSetupFlow({ ...makeConfig(), onConfirm }))

    act(() => {
      result.current.openSetup()
      result.current.bindings.onRoomSelect(ROOMS[0] as any)
      result.current.bindings.onActionSelect(ACTION)
    })

    await act(async () => {
      await result.current.bindings.onConfirm()
    })

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        room: expect.objectContaining({ id: 'living-room' }),
        action: expect.objectContaining({ id: 'near-tv' }),
      }),
    )
    expect(result.current.bindings.isOpen).toBe(false)
  })
})

describe('useSetupFlow — room upload', () => {
  it('adds an uploaded room to the list and selects it', async () => {
    const { result } = renderHook(() => useSetupFlow(makeConfig()))
    await waitFor(() => expect(result.current.bindings.rooms.length).toBeGreaterThan(0))

    const file = new File(['img-data'], 'kitchen.jpg', { type: 'image/jpeg' })

    await act(async () => {
      result.current.bindings.onRoomUpload(file)
      // Flush FileReader async event + API call
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    await waitFor(() =>
      expect(result.current.bindings.room?.isUploaded).toBe(true),
    )
    expect(result.current.bindings.room?.imageDataUrl).toBeDefined()
  })
})
