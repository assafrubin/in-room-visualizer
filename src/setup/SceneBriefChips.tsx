import type { CollectionSceneBrief } from '../types'

interface SceneBriefChipsProps {
  brief: CollectionSceneBrief
  variant: 'plain' | 'pill'
}

export function SceneBriefChips({ brief, variant }: SceneBriefChipsProps) {
  return (
    <span className={`sbc sbc--${variant}`}>
      <span className="sbc__item">{brief.room.name}</span>
      <span className="sbc__sep">·</span>
      <span className="sbc__item">{brief.action.label}</span>
      {brief.refinementText && (
        <>
          <span className="sbc__sep">·</span>
          <span className="sbc__item sbc__item--subtle">"{brief.refinementText}"</span>
        </>
      )}
    </span>
  )
}
