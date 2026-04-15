export function getPackageCategoryOptions() {
  return [
    { value: null, label: 'All' },
    { value: 'PARTY', label: 'Party Packages' },
    { value: 'FOOD', label: 'Food & Drinks' },
    { value: 'ARCADE', label: 'Arcade' },
  ] as const
}

export function filterPackagesByCategory<T extends { type: string }>(
  packages: T[],
  category: string | null
) {
  if (!category) return packages
  return packages.filter((pkg) => {
    if (category === 'FOOD') return pkg.type === 'FOOD' || pkg.type === 'DRINK'
    return pkg.type === category
  })
}

export function togglePackageSelection(current: string[], packageId: string): string[] {
  if (current.includes(packageId)) {
    return current.filter((id) => id !== packageId)
  }
  return [...current, packageId]
}

export function selectedPackageData<T extends { id: string }>(packages: T[], selectedIds: string[]) {
  return packages.filter((pkg) => selectedIds.includes(pkg.id))
}

export function packagePriceList<T extends { id: string; price: number }>(
  packages: T[],
  selectedIds: string[]
) {
  return selectedIds.map((id) => Number(packages.find((pkg) => pkg.id === id)?.price ?? 0))
}

export function packageTotalPrice(packages: Array<{ price: number }>) {
  return packages.reduce((sum, pkg) => sum + Number(pkg.price), 0)
}

