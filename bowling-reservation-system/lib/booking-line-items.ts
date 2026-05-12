export type RequestedProductItem = {
  productId: string
  quantity: number
}

export type BillablePackageRow = {
  id: string
  price: unknown
}

export type BillableProductRow = {
  id: string
  price: unknown
}

export type BookingPackageLineItem = {
  packageId: string
  quantity: number
}

export type BookingProductLineItem = {
  productId: string
  quantity: number
}

export class BookingLineItemValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BookingLineItemValidationError'
  }
}

function dollarsToCents(value: unknown): number {
  return Math.round(Number(value) * 100)
}

function incrementCount(counts: Map<string, number>, id: string, quantity = 1) {
  counts.set(id, (counts.get(id) ?? 0) + quantity)
}

export function requestedPackageIds(packageIds: string[] | undefined): string[] {
  if (!packageIds?.length) return []
  return [...new Set(packageIds)]
}

export function buildBookingPackageLineItems(
  packageIds: string[] | undefined,
  packages: BillablePackageRow[]
): { lineItems: BookingPackageLineItem[]; packagePricesCents: number[] } {
  if (!packageIds?.length) {
    return { lineItems: [], packagePricesCents: [] }
  }

  const counts = new Map<string, number>()
  for (const packageId of packageIds) {
    incrementCount(counts, packageId)
  }

  const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg]))
  const missingPackageIds = [...counts.keys()].filter((packageId) => !packageMap.has(packageId))
  if (missingPackageIds.length > 0) {
    throw new BookingLineItemValidationError('One or more selected packages are no longer available')
  }

  const lineItems = [...counts.entries()].map(([packageId, quantity]) => ({
    packageId,
    quantity,
  }))
  const packagePricesCents = lineItems.map((item) => {
    const pkg = packageMap.get(item.packageId)
    if (!pkg) {
      throw new BookingLineItemValidationError('One or more selected packages are no longer available')
    }
    return dollarsToCents(pkg.price) * item.quantity
  })

  return { lineItems, packagePricesCents }
}

export function requestedProductIds(productItems: RequestedProductItem[] | undefined): string[] {
  if (!productItems?.length) return []
  return [...new Set(productItems.map((item) => item.productId))]
}

export function buildBookingProductLineItems(
  productItems: RequestedProductItem[] | undefined,
  products: BillableProductRow[]
): { lineItems: BookingProductLineItem[]; productTotalCents: number } {
  if (!productItems?.length) {
    return { lineItems: [], productTotalCents: 0 }
  }

  const counts = new Map<string, number>()
  for (const item of productItems) {
    incrementCount(counts, item.productId, item.quantity)
  }

  const productMap = new Map(products.map((product) => [product.id, product]))
  const missingProductIds = [...counts.keys()].filter((productId) => !productMap.has(productId))
  if (missingProductIds.length > 0) {
    throw new BookingLineItemValidationError('One or more selected products are no longer available')
  }

  const lineItems = [...counts.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }))
  const productTotalCents = lineItems.reduce((total, item) => {
    const product = productMap.get(item.productId)
    if (!product) {
      throw new BookingLineItemValidationError('One or more selected products are no longer available')
    }
    return total + dollarsToCents(product.price) * item.quantity
  }, 0)

  return { lineItems, productTotalCents }
}
