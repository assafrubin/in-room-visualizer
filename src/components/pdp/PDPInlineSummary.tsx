import type { CollectionSceneBrief } from '../../types'
import { SceneBriefChips } from '../../setup'

interface PDPInlineSummaryProps {
  brief: CollectionSceneBrief
  onEdit: () => void
  onClear: () => void
}

export function PDPInlineSummary({ brief, onEdit, onClear }: PDPInlineSummaryProps) {
  return (
    <div className="pdp-inline-summary">
      <div className="pdp-inline-summary__left">
        <span className="pdp-inline-summary__label">✦ Showing in your room</span>
        <div className="pdp-inline-summary__chips">
          <SceneBriefChips brief={brief} variant="pill" />
        </div>
      </div>
      <div className="pdp-inline-summary__actions">
        <button className="btn btn--ghost btn--sm" onClick={onEdit}>Edit</button>
        <button className="btn btn--ghost btn--sm" onClick={onClear} aria-label="Exit room view">✕</button>
      </div>
    </div>
  )
}
