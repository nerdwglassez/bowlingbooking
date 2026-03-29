'use client'

import { useRef, useEffect, useState } from 'react'

/**
 * Wraps content with entry animation: opacity 0→1, translateY(20px)→0.
 * Optionally scrolls into view when revealed. Respects prefers-reduced-motion.
 * Timing: 200–400ms ease-out (entry).
 */
interface RevealSectionProps {
  isVisible: boolean
  scrollIntoViewWhenVisible?: boolean
  children: React.ReactNode
  className?: string
  /** When true, section collapses to 0 height when hidden to avoid reflow. */
  collapseWhenHidden?: boolean
  /** Max height when expanded (for collapse transition). */
  maxHeightExpanded?: number
}

export default function RevealSection({
  isVisible,
  scrollIntoViewWhenVisible = true,
  children,
  className = '',
  collapseWhenHidden = false,
  maxHeightExpanded = 600,
}: RevealSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    if (!isVisible) return
    const id = requestAnimationFrame(() => {
      setHasAnimated(true)
    })
    return () => cancelAnimationFrame(id)
  }, [isVisible])

  useEffect(() => {
    if (!scrollIntoViewWhenVisible || !isVisible || !ref.current) return
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media?.matches) return
    ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [isVisible, scrollIntoViewWhenVisible])

  return (
    <div
      ref={ref}
      className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out motion-reduce:transition-none ${className}`}
      style={{
        maxHeight: collapseWhenHidden ? (isVisible ? maxHeightExpanded : 0) : undefined,
        opacity: collapseWhenHidden ? undefined : 1,
      }}
      aria-hidden={!isVisible}
    >
      <div
        className={`
          transition-[transform,opacity] duration-300 ease-out
          motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0
          ${hasAnimated && isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}
        `}
      >
        {children}
      </div>
    </div>
  )
}
