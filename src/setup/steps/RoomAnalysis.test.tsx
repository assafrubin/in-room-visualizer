import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoomAnalysis } from './RoomAnalysis'
import type { DetectedZone, RoomProfile } from '../../types'

const ROOM: RoomProfile = {
  id: 'living-room',
  name: 'Living Room',
  bgColor: '#D4C5A9',
  accentColor: '#8B7355',
  floorColor: '#C4A882',
}

const ZONES: DetectedZone[] = [
  { label: 'TV', icon: '📺', description: 'Wall-mounted, left side' },
  { label: 'Right wall', icon: '📐', description: '~220 cm clear space' },
]

describe('RoomAnalysis — loading state', () => {
  it('shows "Analysing room…" while zones are loading', () => {
    render(<RoomAnalysis room={ROOM} zones={[]} isLoadingZones={true} onChangeRoom={vi.fn()} />)
    expect(screen.getByText('Analysing room…')).toBeInTheDocument()
  })

  it('does not show zone chips while loading', () => {
    render(<RoomAnalysis room={ROOM} zones={ZONES} isLoadingZones={true} onChangeRoom={vi.fn()} />)
    const zonesSection = screen.getByTestId('zones-section')
    expect(within(zonesSection).queryByText('TV')).not.toBeInTheDocument()
  })
})

describe('RoomAnalysis — loaded state', () => {
  it('shows the room name', () => {
    render(<RoomAnalysis room={ROOM} zones={ZONES} isLoadingZones={false} onChangeRoom={vi.fn()} />)
    expect(screen.getByText('Living Room')).toBeInTheDocument()
  })

  it('shows zone count and chips when loaded', () => {
    render(<RoomAnalysis room={ROOM} zones={ZONES} isLoadingZones={false} onChangeRoom={vi.fn()} />)
    expect(screen.getByText(/We found 2 placement zones/)).toBeInTheDocument()
    const zonesSection = screen.getByTestId('zones-section')
    expect(within(zonesSection).getByText('TV')).toBeInTheDocument()
    expect(within(zonesSection).getByText('Right wall')).toBeInTheDocument()
  })

  it('calls onChangeRoom when "Change room" is clicked', async () => {
    const onChangeRoom = vi.fn()
    render(<RoomAnalysis room={ROOM} zones={ZONES} isLoadingZones={false} onChangeRoom={onChangeRoom} />)
    await userEvent.click(screen.getByText('Change room'))
    expect(onChangeRoom).toHaveBeenCalledOnce()
  })
})
