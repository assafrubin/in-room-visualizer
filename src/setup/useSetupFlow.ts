import { useState, useCallback, useEffect } from 'react'
import type { CollectionSceneBrief, DetectedZone, QuickAction, RoomProfile, SetupStep } from '../types'
import { api } from '../api'
import { track } from '../analytics'

// ─── Public types ────────────────────────────────────────────────────────────

export interface SetupFlowConfig {
  /** The currently active (committed) scene brief, or null if setup hasn't run yet */
  activeBrief: CollectionSceneBrief | null
  /** Collection name written into the confirmed brief */
  collectionName: string
  /** Which product surface is hosting the setup flow */
  surface: 'collection' | 'pdp'
  /**
   * Called once the user confirms their setup choices with the draft brief.
   * May be async — the hook awaits it and keeps isConfirming true until it resolves.
   */
  onConfirm: (brief: CollectionSceneBrief) => void | Promise<void>
}

/**
 * Props that SetupModal needs — everything except isOpen (pages gate
 * rendering with {bindings.isOpen && <SetupModal {...rest} />}).
 */
export interface SetupModalProps {
  step: SetupStep
  room: RoomProfile | null
  action: QuickAction | null
  refinement: string
  rooms: RoomProfile[]
  zones: DetectedZone[]
  isLoadingRooms: boolean
  isLoadingZones: boolean
  isConfirming: boolean
  onRoomSelect: (room: RoomProfile) => void
  onRoomContinue: () => void
  onActionSelect: (action: QuickAction) => void
  onRefinementChange: (text: string) => void
  onChangeRoom: () => void
  onRoomUpload: (file: File) => void
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
  surface,
  onConfirm,
}: SetupFlowConfig): {
  openSetup: (trigger?: 'get_started' | 'edit' | 'try_it') => void
  bindings: SetupFlowBindings
} {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<SetupStep>('room-select')
  const [room, setRoom] = useState<RoomProfile | null>(null)
  const [action, setAction] = useState<QuickAction | null>(null)
  const [refinement, setRefinement] = useState('')

  const [rooms, setRooms] = useState<RoomProfile[]>([])
  const [zones, setZones] = useState<DetectedZone[]>([])
  const [isLoadingRooms, setIsLoadingRooms] = useState(false)
  const [isLoadingZones, setIsLoadingZones] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  // Fetch room list once on mount
  useEffect(() => {
    setIsLoadingRooms(true)
    api.getRooms()
      .then(setRooms)
      .catch(err => console.error('[useSetupFlow] getRooms failed:', err))
      .finally(() => setIsLoadingRooms(false))
  }, [])

  const openSetup = useCallback((trigger: 'get_started' | 'edit' | 'try_it' = 'get_started') => {
    track('setup_opened', { surface, properties: { trigger } })

    if (activeBrief) {
      setRoom(activeBrief.room)
      setAction(activeBrief.action)
      setRefinement(activeBrief.refinementText)
      setStep('actions')
      // Pre-fetch zones for the active room so the edit flow isn't blank
      setIsLoadingZones(true)
      api.analyzeRoom(activeBrief.room.id)
        .then(setZones)
        .catch(err => console.error('[useSetupFlow] analyzeRoom failed:', err))
        .finally(() => setIsLoadingZones(false))
    } else {
      setRoom(null)
      setAction(null)
      setRefinement('')
      setZones([])
      setStep('room-select')
    }
    setIsOpen(true)
  }, [activeBrief, surface])

  const close = useCallback(() => {
    track('setup_cancelled', { surface })
    setIsOpen(false)
  }, [surface])

  const handleRoomSelect = useCallback((r: RoomProfile) => {
    track('room_selected', { surface, roomId: r.id, properties: { room_name: r.name, is_uploaded: !!r.isUploaded } })
    setRoom(r)
  }, [surface])

  // Advancing to step 2 triggers the room analysis fetch
  const handleRoomContinue = useCallback(() => {
    if (!room) return
    setStep('actions')
    setZones([])
    setIsLoadingZones(true)
    api.analyzeRoom(room.id)
      .then(setZones)
      .catch(err => console.error('[useSetupFlow] analyzeRoom failed:', err))
      .finally(() => setIsLoadingZones(false))
  }, [room])

  const handleChangeRoom = useCallback(() => {
    setStep('room-select')
    setZones([])
  }, [])

  const handleActionSelect = useCallback((a: QuickAction) => {
    track('action_selected', { surface, actionId: a.id, properties: { action_label: a.label } })
    setAction(a)
  }, [surface])

  const handleRoomUpload = useCallback((file: File) => {
    track('room_uploaded', { surface, roomId: 'uploaded-room', properties: { filename: file.name } })

    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageDataUrl = e.target?.result as string

      // Optimistic local profile so the thumbnail shows immediately
      const localRoom: RoomProfile = {
        id: 'uploaded-room',
        name: file.name.replace(/\.[^.]+$/, ''),
        bgColor: '#D0CFC4',
        accentColor: '#7A7A6A',
        floorColor: '#B8B5A5',
        isUploaded: true,
        imageDataUrl,
      }
      setRooms(prev => [...prev.filter(r => r.id !== 'uploaded-room'), localRoom])
      setRoom(localRoom)

      // Send to server so the image is available for images.edit() later
      try {
        const serverRoom = await api.uploadRoom({ imageDataUrl, filename: file.name })
        setRooms(prev =>
          prev.map(r =>
            r.id === 'uploaded-room' ? { ...r, name: serverRoom.name } : r,
          ),
        )
        setRoom(prev =>
          prev?.id === 'uploaded-room' ? { ...prev, name: serverRoom.name } : prev,
        )
      } catch (err) {
        console.error('[useSetupFlow] uploadRoom failed — proceeding with local only:', err)
      }
    }
    reader.readAsDataURL(file)
  }, [surface])

  // Confirm: pass the draft brief to the surface's onConfirm (which may be async),
  // then close. isConfirming stays true while the surface does its API work.
  const handleConfirm = useCallback(async () => {
    if (!room || !action || isConfirming) return
    const draftBrief: CollectionSceneBrief = {
      room,
      action,
      refinementText: refinement,
      collectionName,
    }
    track('setup_confirmed', {
      surface,
      roomId: room.id,
      actionId: action.id,
      properties: { has_refinement: refinement.trim().length > 0 },
    })
    setIsConfirming(true)
    try {
      await onConfirm(draftBrief)
      setIsOpen(false)
    } catch (err) {
      console.error('[useSetupFlow] onConfirm failed:', err)
    } finally {
      setIsConfirming(false)
    }
  }, [room, action, refinement, collectionName, surface, isConfirming, onConfirm])

  return {
    openSetup,
    bindings: {
      isOpen,
      step,
      room,
      action,
      refinement,
      rooms,
      zones,
      isLoadingRooms,
      isLoadingZones,
      isConfirming,
      onRoomSelect: handleRoomSelect,
      onRoomContinue: handleRoomContinue,
      onActionSelect: handleActionSelect,
      onRefinementChange: setRefinement,
      onChangeRoom: handleChangeRoom,
      onRoomUpload: handleRoomUpload,
      onConfirm: handleConfirm,
      onClose: close,
      canConfirm: !!room && !!action && !isConfirming,
    },
  }
}
