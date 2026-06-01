'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export type SettingsSavePhase = 'idle' | 'saving' | 'saved' | 'error'

function stableSerialize(value: unknown): string {
  return JSON.stringify(value)
}

export function useSettingsFormState<T>(initial: T) {
  const [values, setValues] = useState(initial)
  const [baseline, setBaseline] = useState(() => stableSerialize(initial))
  const [phase, setPhase] = useState<SettingsSavePhase>('idle')

  const dirty = useMemo(
    () => stableSerialize(values) !== baseline,
    [values, baseline],
  )

  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const commitBaseline = useCallback((next?: T) => {
    const snapshot = next ?? values
    setBaseline(stableSerialize(snapshot))
    setPhase('saved')
    const timer = setTimeout(() => setPhase('idle'), 2000)
    return () => clearTimeout(timer)
  }, [values])

  const resetToBaseline = useCallback(() => {
    setValues(JSON.parse(baseline) as T)
    setPhase('idle')
  }, [baseline])

  const startSaving = useCallback(() => setPhase('saving'), [])
  const setError = useCallback(() => setPhase('error'), [])

  return {
    values,
    setValues,
    dirty,
    phase,
    startSaving,
    commitBaseline,
    resetToBaseline,
    setError,
  }
}
