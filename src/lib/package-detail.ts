import { formatPrice } from '@/lib/pricing'
import {
  getPackageIncludedAddons,
  type PackageInclusionIcon,
} from '@/lib/package-addons'
import type { Package, PartyType } from '@/types'

/** Tenant row for lane-only open bowling — not shown in customer package picker. */
export function isLaneOnlyDefaultPackage(pkg: Package): boolean {
  return (
    pkg.basePrice === 0 &&
    !pkg.gameIncluded &&
    !pkg.shoesIncluded &&
    pkg.partyTypes.length === 1 &&
    pkg.partyTypes[0] === 'OPEN'
  )
}

export type PackageCardPrice = {
  amountCents: number
  clarifier: string
}

/**
 * Card price row aligned with `booking-step2-refined.html` until Migration 4
 * adds explicit pricingType on Package.
 */
export function getPackageCardPrice(pkg: Package): PackageCardPrice {
  const isFlatBundle =
    pkg.basePrice > 0 &&
    pkg.gameIncluded &&
    pkg.shoesIncluded &&
    pkg.gameCostPer == null

  if (isFlatBundle) {
    return { amountCents: pkg.basePrice, clarifier: 'flat' }
  }

  const amountCents =
    pkg.basePrice > 0 ? pkg.basePrice : (pkg.gameCostPer ?? 0)

  return { amountCents, clarifier: '/ person / hr' }
}

function titleCaseParty(name: PartyType): string {
  return name.charAt(0) + name.slice(1).toLowerCase()
}

/** Neutral tag chips aligned with `booking-step2-refined.html` `pkg-tag` rows. */
export function packageSummaryTags(pkg: Package): string[] {
  const tags: string[] = []
  if (pkg.shoesIncluded) {
    tags.push('Shoes included')
  } else if (pkg.shoeCostPer != null) {
    tags.push('Shoes not included')
  }
  if (pkg.gameIncluded) {
    tags.push('Games included')
  } else if (pkg.gameCostPer != null) {
    tags.push('Games add-on')
  }
  if (pkg.partyTypes[0]) {
    tags.push(titleCaseParty(pkg.partyTypes[0]!))
  }
  return tags.slice(0, 6)
}

/** Bullets under "What's included" in the detail sheet (domain: `Package` + pricing). */
export function packageInclusionLines(pkg: Package): string[] {
  const lines: string[] = []
  if (pkg.gameIncluded) {
    lines.push('Games included with your lane reservation')
  } else if (pkg.gameCostPer != null) {
    lines.push(
      `Games billed separately - ${formatPrice(pkg.gameCostPer)} per game`,
    )
  }
  if (pkg.shoesIncluded) {
    lines.push('Shoe rental included for everyone in your party')
  } else if (pkg.shoeCostPer != null) {
    lines.push(
      `Shoe rental not included - add ${formatPrice(pkg.shoeCostPer)} per pair when you book`,
    )
  }
  if (lines.length === 0) {
    lines.push('Lane time and package pricing follow the summary on your receipt.')
  }
  return lines
}

export type PackageInclusionItem = {
  text: string
  icon: PackageInclusionIcon
}

function inferInclusionIcon(text: string): PackageInclusionIcon {
  const lower = text.toLowerCase()
  if (lower.includes('shoe')) return 'shoes'
  if (lower.includes('lane') || lower.includes('game')) return 'lanes'
  if (lower.includes('pizza') || lower.includes('food') || lower.includes('appetizer')) {
    return 'food'
  }
  if (lower.includes('pitcher') || lower.includes('beer') || lower.includes('wine')) {
    return 'drink'
  }
  if (lower.includes('table') || lower.includes('seat')) return 'seating'
  return 'default'
}

/** Detail sheet rows for wireframe 2c inclusion list. */
export function packageInclusionItems(pkg: Package): PackageInclusionItem[] {
  const fromAddons = getPackageIncludedAddons(pkg)
  if (fromAddons.length > 0) {
    return fromAddons.map((item) => ({
      text: item.subtitle ? `${item.name} — ${item.subtitle}` : item.name,
      icon: item.icon,
    }))
  }
  return packageInclusionLines(pkg).map((text) => ({
    text,
    icon: inferInclusionIcon(text),
  }))
}

export type { PackageInclusionIcon } from '@/lib/package-addons'
