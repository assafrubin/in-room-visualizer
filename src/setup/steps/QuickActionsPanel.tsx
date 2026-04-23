import type { QuickAction } from '../../types'
import { QUICK_ACTIONS } from '../../data/mocks'

interface QuickActionsPanelProps {
  action: QuickAction | null
  refinement: string
  onSelectAction: (action: QuickAction) => void
  onRefinementChange: (text: string) => void
}

export function QuickActionsPanel({
  action,
  refinement,
  onSelectAction,
  onRefinementChange,
}: QuickActionsPanelProps) {
  return (
    <div className="quick-actions-panel">
      <div className="setup-section-header">
        <h3 className="setup-section-title">Where would you like it?</h3>
        <p className="setup-section-subtitle">
          Choose one placement for the collection. You can edit this anytime.
        </p>
      </div>

      <div className="action-list">
        {QUICK_ACTIONS.map(a => (
          <button
            key={a.id}
            className={`action-option ${action?.id === a.id ? 'action-option--selected' : ''}`}
            onClick={() => onSelectAction(a)}
          >
            <span className="action-option__radio">
              {action?.id === a.id ? '●' : '○'}
            </span>
            <span className="action-option__label">{a.label}</span>
            {action?.id === a.id && (
              <span className="action-option__check">✓</span>
            )}
          </button>
        ))}
      </div>

      <div className="refinement-input">
        <label className="refinement-input__label" htmlFor="refinement">
          Anything else we should keep in mind?
          <span className="refinement-input__optional">Optional</span>
        </label>
        <input
          id="refinement"
          type="text"
          className="refinement-input__field"
          placeholder="e.g. Keep it aligned with the TV"
          value={refinement}
          onChange={e => onRefinementChange(e.target.value)}
          maxLength={120}
        />
      </div>
    </div>
  )
}
