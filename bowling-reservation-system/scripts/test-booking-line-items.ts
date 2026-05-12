import assert from 'node:assert/strict'
import {
  BookingLineItemValidationError,
  buildBookingPackageLineItems,
  buildBookingProductLineItems,
  requestedPackageIds,
  requestedProductIds,
} from '../lib/booking-line-items'

function assertValidationError(fn: () => unknown) {
  assert.throws(fn, BookingLineItemValidationError)
}

const packageIds = ['party-pack', 'party-pack', 'snacks']
assert.deepEqual(requestedPackageIds(packageIds), ['party-pack', 'snacks'])

const packageResult = buildBookingPackageLineItems(packageIds, [
  { id: 'party-pack', price: '12.50' },
  { id: 'snacks', price: '4.00' },
])
assert.deepEqual(packageResult.lineItems, [
  { packageId: 'party-pack', quantity: 2 },
  { packageId: 'snacks', quantity: 1 },
])
assert.deepEqual(packageResult.packagePricesCents, [2500, 400])
assertValidationError(() =>
  buildBookingPackageLineItems(['inactive-package'], [])
)

const productItems = [
  { productId: 'pizza', quantity: 2 },
  { productId: 'pizza', quantity: 1 },
  { productId: 'soda', quantity: 3 },
]
assert.deepEqual(requestedProductIds(productItems), ['pizza', 'soda'])

const productResult = buildBookingProductLineItems(productItems, [
  { id: 'pizza', price: 10 },
  { id: 'soda', price: '2.50' },
])
assert.deepEqual(productResult.lineItems, [
  { productId: 'pizza', quantity: 3 },
  { productId: 'soda', quantity: 3 },
])
assert.equal(productResult.productTotalCents, 3750)
assertValidationError(() =>
  buildBookingProductLineItems([{ productId: 'inactive-product', quantity: 1 }], [])
)

console.log('Booking line item normalization tests passed')
