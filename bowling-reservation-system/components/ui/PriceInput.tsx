'use client'

import { useEffect, useState } from 'react'

/**
 * Price (or numeric) input. With showDollar=true, shows "$" in the field.
 * Uses string state so the user can clear and type values like "8" without
 * being stuck with "08" (no forced leading zero).
 */
export default function PriceInput({
  value,
  onChange,
  disabled,
  className = '',
  id,
  showDollar = true,
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
  id?: string
  /** Show "$" prefix (default true). Set false for e.g. tax rate. */
  showDollar?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const [str, setStr] = useState(() => formatDisplay(value))

  useEffect(() => {
    if (!focused) {
      setStr(formatDisplay(value))
    }
  }, [value, focused])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.value
    if (s !== '' && !/^\d*\.?\d*$/.test(s)) return
    setStr(s)
    const n = parseFloat(s)
    onChange(Number.isFinite(n) ? n : 0)
  }

  return (
    <div className={`flex rounded-[14px] border border-slate-300 bg-white ${disabled ? 'bg-slate-50' : ''} ${className}`}>
      {showDollar && (
        <span className="flex items-center pl-3 text-sm text-slate-500" aria-hidden>
          $
        </span>
      )}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={str}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={handleChange}
        className={`w-full min-w-0 border-0 bg-transparent py-2.5 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-70 ${showDollar ? 'pr-3 pl-1' : 'px-3'}`}
        placeholder="0"
      />
    </div>
  )
}

function formatDisplay(value: number): string {
  if (!Number.isFinite(value)) return ''
  if (value === 0) return ''
  return String(value)
}
