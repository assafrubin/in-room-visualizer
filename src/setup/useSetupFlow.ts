import { useState, useCallback } from 'react'
import type { CollectionSceneBrief, QuickAction, RoomProfile, SetupStep } from '../types'

// ─── Public types ────────────────────────────────────────────────────────────

export interface SetupFlowConfig {
  /** The currently active (committed) scene brief, or null if setup hasn't run yet */
  activeBrief: CollectionSceneBrief | null
  /** Collection name written into the confirmed brief */
  collectionName: string
  /** Called once the user confirms their setup choices */
  onConfirm: (brief: CollectionSceneBrief) => void
}

/**
 * Props that SetupModal needs — everything except isOpen (the page gates
 * rendering with {bindings.isOpen && <SetupModal {...rest} />}).
 */
export interface SetupModalProps {
  step: SetupStep
  room: RoomProfile | null
  action: QuickAction | null
  refinement: string
  onRoomSelect: (room: RoomProfile) => void
  onRoomContinue: () => void
  onActionSelect: (action: QuickAction) => void
  onRefinementChange: (text: string) => void
  onChangeRoom: () => void
  onConfirm: () => void
  onClose: () => void
  canConfirm: boolean
}

/** Full bindings returned by the hook; pages destructure isOpen for gating */
export interface SetupFlowBindings extends SetupModalProps {
  isOpen: boolean
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSetupFlow({
  activeBrief,
  collectionName,
  onConfirm,
}: SetupFlowConfig): {
  /** Call this to open the setup modal (or the edit flow if a brief exists) */
  openSetup: () => void
  /** Destructure isOpen for conditional rendering; spread the rest onto <SetupModal> */
  bindings: SetupFlowBindings
} {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<SetupStep>('room-select')
  const [room, setRoom] = useState<RoomProfile | null>(null)
  const [action, setAction] = useState<QuickAction | null>(null)
  const [refinement, setRefinement] = useState('')

  const openSetup = useCallback(() => {
    if (activeBrief) {
      setRoom(activeBrief.room)
      setAction(activeBrief.action)
      setRefinement(activeBrief.refinementText)
      setStep('actions')
    } else {
      setRoom(null)
      setAction(null)
      setRefinement('')
      setStep('room-select')
    }
    setIsOpen(true)
  }, [activeBrief])

  const close = useCallback(() => setIsOpen(false), [])

  const handleRoomSelect = useCallback((r: RoomProfile) => setRoom(r), [])
  const handleRoomContinue = useCallback(() => setStep('actions'), [])
  const handleChangeRoom = useCallback(() => setStep('room-select'), [])

  // Confirm is owned here: build the brief, call the surface's onConfirm, then close.
  const handleConfirm = useCallback(() => {
    if (!room || !action) return
    onConfirm({ room, action, refinementText: refinement, collectionName })
    setIsOpen(false)
  }, [room, action, refinement, collectionName, onConfirm])

  return {
    openSetup,
    bindings: {
      isOpen,
      step,
      room,
      action,
      refinement,
      onRoomSelect: handleRoomSelect,
      onRoomContinue: handleRoomContinue,
      onActionSelect: setAction,
      onRefinementChange: setRefinement,
      onChangeRoom: handleChangeRoom,
      onConfirm: handleConfirm,
      onClose: close,
      canConfirm: !!room && !!action,
    },
  }
}
