import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickActionsPanel } from './QuickActionsPanel'
import { QUICK_ACTIONS } from '../../data/mocks'

function renderPanel(
  action = QUICK_ACTIONS[0],
  refinement = '',
  onSelect = vi.fn(),
  onRefinement = vi.fn(),
) {
  return render(
    <QuickActionsPanel
      action={action}
      refinement={refinement}
      onSelectAction={onSelect}
      onRefinementChange={onRefinement}
    />,
  )
}

describe('QuickActionsPanel — action list', () => {
  it('renders all 5 placement options', () => {
    renderPanel(null as any)
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(5)
    for (const a of QUICK_ACTIONS) {
      expect(screen.getByText(a.label)).toBeInTheDocument()
    }
  })

  it('marks the selected action with a filled radio and check icon', () => {
    renderPanel(QUICK_ACTIONS[1])
    // The selected action shows '●' and '✓'
    expect(screen.getByText('●')).toBeInTheDocument()
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('calls onSelectAction with the action when clicked', async () => {
    const onSelect = vi.fn()
    renderPanel(QUICK_ACTIONS[0], '', onSelect)
    await userEvent.click(screen.getByText(QUICK_ACTIONS[2].label))
    expect(onSelect).toHaveBeenCalledWith(QUICK_ACTIONS[2])
  })
})

describe('QuickActionsPanel — refinement input', () => {
  it('renders the refinement text input', () => {
    renderPanel()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows the current refinement value', () => {
    renderPanel(QUICK_ACTIONS[0], 'Keep it near the window')
    expect(screen.getByDisplayValue('Keep it near the window')).toBeInTheDocument()
  })

  it('calls onRefinementChange when the user types', async () => {
    const onRefinement = vi.fn()
    renderPanel(QUICK_ACTIONS[0], '', vi.fn(), onRefinement)
    await userEvent.type(screen.getByRole('textbox'), 'A')
    expect(onRefinement).toHaveBeenCalledWith('A')
  })
})
