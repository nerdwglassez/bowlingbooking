import { formatPrice } from '@/lib/pricing'
import type { Package, PartyType } from '@/types'

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
