import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoomSelector } from './RoomSelector'
import type { RoomProfile } from '../../types'

const ROOMS: RoomProfile[] = [
  { id: 'living-room', name: 'Living Room', bgColor: '#D4C5A9', accentColor: '#8B7355', floorColor: '#C4A882' },
  { id: 'tv-room', name: 'TV Room', bgColor: '#C8D4E0', accentColor: '#4A6FA5', floorColor: '#9EA8B5' },
  { id: 'uploaded-room', name: 'My Upload', bgColor: '#D0CFC4', accentColor: '#7A7A6A', floorColor: '#B8B5A5', isUploaded: true },
]

function renderSelector(selected: RoomProfile | null = null, onSelect = vi.fn(), onUpload = vi.fn()) {
  return render(
    <RoomSelector
      room={selected}
      rooms={ROOMS}
      isLoading={false}
      onSelect={onSelect}
      onUpload={onUpload}
    />,
  )
}

describe('RoomSelector — room list', () => {
  it('renders a card for every room', () => {
    renderSelector()
    expect(screen.getByText('Living Room')).toBeInTheDocument()
    expect(screen.getByText('TV Room')).toBeInTheDocument()
    expect(screen.getByText('My Upload')).toBeInTheDocument()
  })

  it('shows the section heading', () => {
    renderSelector()
    expect(screen.getByText('Choose a room')).toBeInTheDocument()
  })

  it('shows a loading indicator when isLoading is true', () => {
    render(<RoomSelector room={null} rooms={[]} isLoading={true} onSelect={vi.fn()} onUpload={vi.fn()} />)
    expect(screen.getByText(/Loading rooms/i)).toBeInTheDocument()
  })
})

describe('RoomSelector — room selection', () => {
  it('calls onSelect with the room when a card is clicked', async () => {
    const onSelect = vi.fn()
    renderSelector(null, onSelect)
    await userEvent.click(screen.getByText('Living Room'))
    expect(onSelect).toHaveBeenCalledWith(ROOMS[0])
  })

  it('marks the currently selected room with a check', () => {
    renderSelector(ROOMS[0])
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('does not show a check when no room is selected', () => {
    renderSelector(null)
    expect(screen.queryByText('✓')).not.toBeInTheDocument()
  })
})

describe('RoomSelector — file upload', () => {
  it('renders the upload zone with a "Choose file" button', () => {
    renderSelector()
    expect(screen.getByText('Upload a room photo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Choose file/i })).toBeInTheDocument()
  })

  it('calls onUpload when a file is selected', async () => {
    const onUpload = vi.fn()
    renderSelector(null, vi.fn(), onUpload)

    const file = new File(['fake'], 'room.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, file)

    expect(onUpload).toHaveBeenCalledWith(file)
  })

  it('shows "Your photo" badge for an uploaded room with imageDataUrl', () => {
    const uploadedWithPhoto: RoomProfile = {
      ...ROOMS[2],
      imageDataUrl: 'data:image/jpeg;base64,abc',
    }
    render(
      <RoomSelector
        room={null}
        rooms={[uploadedWithPhoto]}
        isLoading={false}
        onSelect={vi.fn()}
        onUpload={vi.fn()}
      />,
    )
    expect(screen.getByText('Your photo')).toBeInTheDocument()
  })
})
