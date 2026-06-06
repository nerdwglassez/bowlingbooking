/**
 * Package inclusions + optional add-ons for Step 2 (wireframe 2d).
 * Pre-Migration 3: derived from flags + party type. Replace with Package.inclusions JSON
 * when SCHEMA_MIGRATIONS Migration 3 lands.
 */

import { formatPrice } from '@/lib/format-price'
import type { Package, PartyType } from '@/types'

export type PackageInclusionIcon =
  | 'lanes'
  | 'shoes'
  | 'food'
  | 'drink'
  | 'seating'
  | 'default'

export type PackageIncludedAddon = {
  id: string
  name: string
  subtitle?: string
  icon: PackageInclusionIcon
  /** When true, show a locked pill on the selected package card (e.g. "Food included"). */
  lockedTagLabel?: string
}

export type PackageOptionalAddon = {
  id: string
  name: string
  description: string
  /** Integer cents — flat fee unless perPerson is true. */
  priceCents: number
  perPerson?: boolean
}

export function isFlatBundlePackage(pkg: Package): boolean {
  return (
    pkg.basePrice > 0 &&
    pkg.gameIncluded &&
    pkg.shoesIncluded &&
    pkg.gameCostPer == null
  )
}

function hasPartyType(pkg: Package, type: PartyType): boolean {
  return pkg.partyTypes.includes(type)
}

/** Locked + neutral tag strings for package cards (wireframe 2d `pkg-tags`). */
export function packageCardTags(pkg: Package): {
  neutral: string[]
  locked: string[]
} {
  const neutral: string[] = []
  const locked: string[] = []

  if (pkg.shoesIncluded) {
    neutral.push('Shoes included')
  } else if (pkg.shoeCostPer != null) {
    neutral.push('Shoes not included')
  }

  if (pkg.gameIncluded && !isFlatBundlePackage(pkg)) {
    neutral.push('Games included')
  } else if (!pkg.gameIncluded && pkg.gameCostPer != null) {
    neutral.push('Games add-on')
  }

  if (isFlatBundlePackage(pkg) && hasPartyType(pkg, 'BIRTHDAY')) {
    neutral.push('Up to 8')
    neutral.push('2 hrs')
  }

  for (const item of getPackageIncludedAddons(pkg)) {
    if (item.lockedTagLabel) {
      locked.push(item.lockedTagLabel)
    }
  }

  return { neutral: neutral.slice(0, 6), locked: locked.slice(0, 4) }
}

/** Included rows shown below the package list when a package is selected (wireframe 2d). */
export function getPackageIncludedAddons(pkg: Package): PackageIncludedAddon[] {
  const items: PackageIncludedAddon[] = []
  const flat = isFlatBundlePackage(pkg)

  if (pkg.gameIncluded) {
    if (flat && hasPartyType(pkg, 'BIRTHDAY')) {
      items.push({
        id: 'lanes',
        name: '2 lanes for 2 hours',
        subtitle: 'Reserved for your party',
        icon: 'lanes',
      })
    } else if (flat) {
      items.push({
        id: 'lanes',
        name: 'Lane time included',
        subtitle: 'Duration set by your package',
        icon: 'lanes',
      })
    } else {
      items.push({
        id: 'games',
        name: 'Games included with your lane reservation',
        icon: 'lanes',
      })
    }
  }

  if (pkg.shoesIncluded) {
    items.push({
      id: 'shoes',
      name: 'Shoe rental for all bowlers',
      subtitle: 'Everyone in your party',
      icon: 'shoes',
    })
  }

  if (flat && hasPartyType(pkg, 'BIRTHDAY')) {
    items.push({
      id: 'food',
      name: 'Pizza or appetizer platter',
      subtitle: 'Served at your lane',
      icon: 'food',
      lockedTagLabel: 'Food included',
    })
    items.push({
      id: 'drink',
      name: 'One pitcher',
      subtitle: 'Beer, wine, or soda',
      icon: 'drink',
    })
    items.push({
      id: 'seating',
      name: 'Reserved table alongside your lanes',
      icon: 'seating',
    })
  }

  if (flat && hasPartyType(pkg, 'CORPORATE')) {
    items.push({
      id: 'food',
      name: 'Appetizer platter',
      subtitle: 'Served at your lane',
      icon: 'food',
      lockedTagLabel: 'Food included',
    })
  }

  return items
}

/** Optional add-on catalog for the selected package (wireframe 2d checkboxes). */
export function getPackageOptionalAddons(pkg: Package): PackageOptionalAddon[] {
  if (!isFlatBundlePackage(pkg)) return []

  if (hasPartyType(pkg, 'BIRTHDAY')) {
    return [
      {
        id: 'extra-pitcher',
        name: 'Extra pitcher',
        description: 'Additional round for the group',
        priceCents: 2200,
      },
      {
        id: 'arcade-credits',
        name: 'Arcade Credits',
        description: '$10 credits per person',
        priceCents: 1000,
        perPerson: true,
      },
      {
        id: 'party-room',
        name: 'Party Room',
        description: 'Private room 1 hr before/after',
        priceCents: 7500,
      },
    ]
  }

  if (hasPartyType(pkg, 'CORPORATE')) {
    return [
      {
        id: 'extra-pitcher',
        name: 'Extra pitcher',
        description: 'Additional round for the group',
        priceCents: 2200,
      },
      {
        id: 'party-room',
        name: 'Private meeting room',
        description: '1 hour before or after bowling',
        priceCents: 7500,
      },
    ]
  }

  return []
}

export function packageHasAddonSection(pkg: Package): boolean {
  return (
    getPackageIncludedAddons(pkg).length > 0 ||
    getPackageOptionalAddons(pkg).length > 0
  )
}

export function optionalAddonLineAmount(
  addon: PackageOptionalAddon,
  bowlerCount: number,
): number {
  return addon.perPerson ? addon.priceCents * bowlerCount : addon.priceCents
}

export function formatOptionalAddonPrice(
  addon: PackageOptionalAddon,
): string {
  if (addon.perPerson) {
    const per = formatPrice(addon.priceCents).replace(/\.00$/, '')
    return `${per}/pp`
  }
  return formatPrice(addon.priceCents)
}
