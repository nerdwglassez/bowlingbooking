'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

import { Input } from '@/components/base/input/input'
import type { AddressSuggestion } from '@/lib/address-autocomplete'
import { cx } from '@/utils/cx'

export interface StreetAddressFields {
  street: string
  city: string
  state: string
  zip: string
}

export interface StreetAddressAutocompleteProps {
  value: string
  onChange: (street: string) => void
  /** Called when the user picks a suggestion — fills city/state/ZIP too. */
  onSelectAddress: (fields: StreetAddressFields) => void
  isDisabled?: boolean
  isRequired?: boolean
  'aria-label'?: string
}

type AutocompleteResponse = {
  suggestions?: AddressSuggestion[]
  error?: string
}

export function StreetAddressAutocomplete({
  value,
  onChange,
  onSelectAddress,
  isDisabled,
  isRequired,
  'aria-label': ariaLabel = 'Street address',
}: StreetAddressAutocompleteProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const abortRef = useRef<AbortController | null>(null)
  const skipFetchRef = useRef(false)

  useEffect(() => {
    if (isDisabled) return

    if (skipFetchRef.current) {
      skipFetchRef.current = false
      return
    }

    const q = value.trim()
    const timer = window.setTimeout(() => {
      void (async () => {
        if (q.length < 3) {
          setSuggestions([])
          setOpen(false)
          setLoading(false)
          return
        }

        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        setLoading(true)
        try {
          const res = await fetch(
            `/api/address/autocomplete?q=${encodeURIComponent(q)}`,
            { signal: controller.signal },
          )
          if (!res.ok) {
            setSuggestions([])
            setOpen(false)
            return
          }
          const data = (await res.json()) as AutocompleteResponse
          const next = data.suggestions ?? []
          setSuggestions(next)
          setActiveIndex(next.length > 0 ? 0 : -1)
          setOpen(next.length > 0)
        } catch (err) {
          if ((err as Error).name === 'AbortError') return
          setSuggestions([])
          setOpen(false)
        } finally {
          setLoading(false)
        }
      })()
    }, q.length < 3 ? 0 : 300)

    return () => {
      window.clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [value, isDisabled])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  function applySuggestion(suggestion: AddressSuggestion) {
    skipFetchRef.current = true
    setOpen(false)
    setSuggestions([])
    setActiveIndex(-1)
    onSelectAddress({
      street: suggestion.street,
      city: suggestion.city,
      state: suggestion.state,
      zip: suggestion.zip,
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open || suggestions.length === 0 || isDisabled) {
      if (event.key === 'Escape') setOpen(false)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
      return
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      applySuggestion(suggestions[activeIndex]!)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    }
  }

  const showList = !isDisabled && open && suggestions.length > 0

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <Input
        type="text"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={showList}
        autoComplete="street-address"
        value={value}
        onChange={(street) => {
          onChange(street)
        }}
        onFocus={() => {
          if (!isDisabled && suggestions.length > 0) setOpen(true)
        }}
        isDisabled={isDisabled}
        isRequired={isRequired}
        placeholder="Start typing a street address"
      />

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Address suggestions"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-primary py-1 shadow-lg ring-1 ring-secondary"
        >
          {suggestions.map((suggestion, index) => {
            const active = index === activeIndex
            return (
              <li key={suggestion.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={cx(
                    'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left',
                    active ? 'bg-secondary' : 'hover:bg-secondary',
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => applySuggestion(suggestion)}
                >
                  <span className="text-sm font-medium text-primary">
                    {suggestion.label}
                  </span>
                  {suggestion.description ? (
                    <span className="text-xs text-tertiary">
                      {suggestion.description}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {loading ? (
        <p className="sr-only" aria-live="polite">
          Loading address suggestions
        </p>
      ) : null}
    </div>
  )
}
