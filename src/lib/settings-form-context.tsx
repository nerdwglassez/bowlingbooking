'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type SettingsFormContextValue = {
  dirty: boolean
  saving: boolean
  setFormState: (state: { dirty: boolean; saving: boolean }) => void
  registerSaveHandler: (handler: (() => void) | null) => void
  requestSave: () => void
}

const SettingsFormContext = createContext<SettingsFormContextValue | null>(
  null,
)

export function SettingsFormProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveHandlerRef = useRef<(() => void) | null>(null)

  const setFormState = useCallback(
    (state: { dirty: boolean; saving: boolean }) => {
      setDirty(state.dirty)
      setSaving(state.saving)
    },
    [],
  )

  const registerSaveHandler = useCallback((handler: (() => void) | null) => {
    saveHandlerRef.current = handler
  }, [])

  const requestSave = useCallback(() => {
    saveHandlerRef.current?.()
  }, [])

  const value = useMemo(
    () => ({
      dirty,
      saving,
      setFormState,
      registerSaveHandler,
      requestSave,
    }),
    [dirty, saving, setFormState, registerSaveHandler, requestSave],
  )

  return (
    <SettingsFormContext.Provider value={value}>
      {children}
    </SettingsFormContext.Provider>
  )
}

export function useSettingsFormContext(): SettingsFormContextValue {
  const ctx = useContext(SettingsFormContext)
  if (!ctx) {
    throw new Error(
      'useSettingsFormContext must be used inside SettingsFormProvider',
    )
  }
  return ctx
}

/** Sync panel dirty/saving state + save handler into settings layout (Phase 1). */
export function useSettingsFormReporter(
  dirty: boolean,
  saving: boolean,
  onSave: () => void,
) {
  const { setFormState, registerSaveHandler } = useSettingsFormContext()
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    setFormState({ dirty, saving })
  }, [dirty, saving, setFormState])

  useEffect(() => {
    registerSaveHandler(() => onSaveRef.current())
    return () => registerSaveHandler(null)
  }, [registerSaveHandler])
}
