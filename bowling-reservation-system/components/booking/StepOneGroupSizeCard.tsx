'use client'

import { useRef, useEffect, useState } from 'react'
import { Users, ChevronDown, Check } from 'lucide-react'

/**
 * Figma 19-381: BookingOptions (19:737) – Group size card + Event type + Continue to details.
 * Entry: opacity 0→1, translateY(20px)→0. Scroll into view when revealed. Respects reduced motion.
 */
interface StepOneGroupSizeCardProps {
  /** Whether date and time are selected (card is visible and animated in). */
  isVisible: boolean
  /** Current number of bowlers (1–10). */
  numBowlers: number
  onNumBowlersChange: (n: number) => void
  /** Whether "This is a party/event" is checked. */
  isPartyEvent: boolean
  onPartyEventChange: (checked: boolean) => void
  /** Party type when isPartyEvent is true. */
  partyType: string
  onPartyTypeChange: (value: string) => void
  onContinue: () => void
  /** Whether Continue button is enabled (e.g. date + time selected). */
  canContinue: boolean
  /** Trigger shake animation (e.g. validation failed). */
  showShake?: boolean
}

export default function StepOneGroupSizeCard({
  isVisible,
  numBowlers,
  onNumBowlersChange,
  isPartyEvent,
  onPartyEventChange,
  partyType,
  onPartyTypeChange,
  onContinue,
  canContinue,
  showShake = false,
}: StepOneGroupSizeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const bowlersSelectRef = useRef<HTMLSelectElement>(null)
  const partyTypeSelectRef = useRef<HTMLSelectElement>(null)
  const [pulseOnce, setPulseOnce] = useState(false)
  const prevCanContinue = useRef(false)

  useEffect(() => {
    const prev = prevCanContinue.current
    prevCanContinue.current = canContinue
    if (canContinue && !prev) {
      setPulseOnce(true)
      const t = setTimeout(() => setPulseOnce(false), 600)
      return () => clearTimeout(t)
    }
  }, [canContinue])

  useEffect(() => {
    if (!isVisible || !cardRef.current) return
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return
    try {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } catch {
      // Fallback for browsers that do not support scroll options.
      cardRef.current.scrollIntoView(true)
    }
  }, [isVisible])

  return (
    <div
      ref={cardRef}
      className="overflow-hidden transition-[max-height,opacity,transform,margin] duration-300 ease-out motion-reduce:transition-none"
      style={{
        opacity: isVisible ? 1 : 0,
        maxHeight: isVisible ? (isPartyEvent ? 820 : 680) : 0,
        marginTop: isVisible ? 0 : -24,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      }}
      aria-hidden={!isVisible}
    >
      {/* layout_TJTSWS: column alignSelf stretch gap 24px; equal padding 25px (Figma had 25 25 1 – equidistant) */}
      <div
        className="flex flex-col"
        style={{
          gap: 24,
          padding: 25,
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          boxShadow: '0px 1px 2px 0px rgba(0, 0, 0, 0.06), 0px 1px 3px 0px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* layout_6XCR7Y: row alignItems center gap 12px */}
        <div className="flex items-center" style={{ gap: 12 }}>
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
            }}
          >
            <Users className="h-5 w-5" stroke="#0F172A" aria-hidden />
          </div>
          {/* style_STASFH fill_RFK6JG: Inter 600 20px #0F172A */}
          <span
            className="font-semibold"
            style={{ fontSize: 20, lineHeight: 1.5, color: '#0F172A', letterSpacing: '-0.01em' }}
          >
            Group size
          </span>
        </div>

        {/* layout_EB6T8E: row gap 24px – desktop: bowlers | event type | party type (in line); mobile: stacked */}
        <div className="flex flex-col md:flex-row flex-wrap" style={{ gap: 24 }}>
          {/* layout_EGWJFQ: column gap 12px width 280 height 85 */}
          <div className="flex flex-col flex-shrink-0" style={{ gap: 12, width: '100%', maxWidth: 280 }}>
            <label
              htmlFor="step1-bowlers"
              className="block"
              style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: '#0F172A' }}
            >
              How many bowlers?
            </label>
            <label
              htmlFor="step1-bowlers"
              className="flex items-center overflow-hidden rounded-full cursor-pointer"
              style={{
                padding: '0 24px',
                minHeight: 48,
                border: '2px solid #E2E8F0',
                background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 100%), linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(59,130,246,0.2) 100%), #FFFFFF',
              }}
              onClick={(e) => {
                if (bowlersSelectRef.current && e.target !== bowlersSelectRef.current) {
                  e.preventDefault()
                  bowlersSelectRef.current.click()
                }
              }}
            >
              <select
                ref={bowlersSelectRef}
                id="step1-bowlers"
                value={numBowlers}
                onChange={(e) => onNumBowlersChange(Number(e.target.value))}
                className="min-w-0 flex-1 appearance-none bg-transparent py-3 pr-2 focus:outline-none focus-visible:ring-0"
                style={{
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: '#0F172A',
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} bowler{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none h-5 w-5 flex-shrink-0 ml-1" stroke="#0F172A" aria-hidden />
            </label>
          </div>

          {/* Event type – same column style as Figma layout_R0MMWW */}
          <div className="flex flex-col flex-shrink-0" style={{ gap: 12, width: '100%', maxWidth: 240.09 }}>
            <span
              className="block"
              style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: '#0F172A' }}
            >
              Event type
            </span>
            <button
              type="button"
              onClick={() => onPartyEventChange(!isPartyEvent)}
              className="flex w-full min-h-[48px] items-center rounded-[14px] border-2 border-transparent text-left transition-[transform,background-color] duration-200 ease-out hover:scale-[1.02] motion-reduce:hover:scale-100"
              style={{
                gap: 12,
                padding: '0 20px',
                minHeight: 48,
                background: '#F9FAFB',
              }}
            >
              <span
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded"
                style={{
                  width: 20,
                  height: 20,
                  background: '#FFFFFF',
                  border: '2px solid #CBD5E1',
                }}
              >
                {isPartyEvent && (
                  <Check className="h-3 w-3" stroke="#64748B" strokeWidth={3} aria-hidden />
                )}
              </span>
              <span
                className="flex-1"
                style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: '#64748B' }}
              >
                This is a party/event
              </span>
            </button>
          </div>

          {/* Party type dropdown – Figma step1-event-type-selected: pill, 0 24px padding, selected text 500 16px #0F172A, chevron 20x20 */}
          {isPartyEvent && (
            <div className="flex flex-col flex-shrink-0" style={{ gap: 12, width: '100%', maxWidth: 280 }}>
              <label
                htmlFor="step1-party-type"
                className="block"
                style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: '#0F172A' }}
              >
                Party type
              </label>
              <label
                htmlFor="step1-party-type"
                className="flex items-center overflow-hidden rounded-full cursor-pointer"
                style={{
                  padding: '0 24px',
                  minHeight: 48,
                  border: '2px solid #E2E8F0',
                  background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 100%), linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(59,130,246,0.2) 100%), #FFFFFF',
                }}
                onClick={(e) => {
                  if (partyTypeSelectRef.current && e.target !== partyTypeSelectRef.current) {
                    e.preventDefault()
                    partyTypeSelectRef.current.click()
                  }
                }}
              >
                <select
                  ref={partyTypeSelectRef}
                  id="step1-party-type"
                  value={partyType}
                  onChange={(e) => onPartyTypeChange(e.target.value)}
                  className="min-w-0 flex-1 appearance-none bg-transparent py-3 pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2 font-medium"
                  style={{
                    fontSize: 16,
                    lineHeight: 1.5,
                    color: partyType ? '#0F172A' : '#64748B',
                  }}
                >
                  <option value="">Select party type</option>
                  <option value="Fundraiser">Fundraiser</option>
                  <option value="Corporate event">Corporate event</option>
                  <option value="Kids birthday">Kids birthday</option>
                  <option value="Adult birthday">Adult birthday</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown
                  className="pointer-events-none flex-shrink-0 ml-1"
                  style={{ width: 20, height: 20 }}
                  stroke={partyType ? '#0F172A' : '#64748B'}
                  aria-hidden
                />
              </label>
            </div>
          )}
        </div>

        {/* Figma 19-1188: Container for lane-assignment messaging – gradient bg, 4px gap, 14px radius */}
        <div
          className="flex flex-col"
          style={{
            gap: 4,
            padding: 17,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.1)',
            borderRadius: 14,
          }}
        >
          <p
            style={{ fontSize: 14, lineHeight: 1.5, color: '#64748B', fontWeight: 500, margin: 0 }}
            aria-live="polite"
          >
            You&apos;ll be assigned {Math.min(5, Math.ceil(numBowlers / 6)) || 1} lane{(Math.min(5, Math.ceil(numBowlers / 6)) || 1) !== 1 ? 's' : ''} for your group.
          </p>
          <p style={{ fontSize: 12, lineHeight: 1.5, color: '#94A3B8', fontWeight: 400, margin: 0 }}>
            Each lane accommodates up to 6 bowlers
          </p>
        </div>
      </div>

      {/* Figma 19-774 BookingFlow: CTA below the card, not inside it */}
      <div className="flex justify-end" style={{ marginTop: 24 }}>
          {/* Spec: enabled = gradient, shadow, pulse on appear; hover scale 1.02; disabled = no hover, cursor not-allowed; shake on validation fail */}
          <button
            type="button"
            onClick={onContinue}
            aria-disabled={!canContinue}
            className={`w-full sm:w-auto rounded-full font-semibold min-h-[48px] px-6 sm:px-8 whitespace-nowrap transition-[transform,box-shadow] duration-150 ease-out motion-reduce:transition-none
              ${canContinue ? 'hover:scale-[1.02] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2' : 'cursor-not-allowed'}`}
            style={{
              maxWidth: 210.84,
              height: 48,
              background: canContinue
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 1) 0%, rgba(59, 130, 246, 1) 100%)'
                : '#E2E8F0',
              boxShadow: canContinue ? '0px 0px 20px 0px rgba(99, 102, 241, 0.3)' : 'none',
              fontSize: 16,
              lineHeight: 1.5,
              color: canContinue ? '#FFFFFF' : '#94A3B8',
              ...(showShake && { animation: 'step1-button-shake 0.4s ease-in-out' }),
              ...(pulseOnce && { animation: 'step1-continue-pulse 0.3s ease-out 1' }),
            }}
          >
            Continue to details
        </button>
      </div>
    </div>
  )
}
