import {
  DISCOUNT_CODE_UNUSABLE_MESSAGE,
  assertDiscountCodeUsable,
  incrementDiscountRedemption,
  type DiscountCodeRow,
} from '@/lib/discount-codes'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

async function assertRejects(fn: () => Promise<unknown>, message: string) {
  try {
    await fn()
  } catch (error) {
    assert(error instanceof Error, `${message}: expected an Error`)
    assert(error.message === DISCOUNT_CODE_UNUSABLE_MESSAGE, `${message}: unexpected error message`)
    return
  }
  throw new Error(`${message}: expected rejection`)
}

function buildCode(overrides: Partial<DiscountCodeRow> = {}): DiscountCodeRow {
  return {
    id: 'code_1',
    code: 'SAVE10',
    label: null,
    paymentMode: 'ONLINE',
    discountPercent: null,
    discountFixedAmount: null,
    maxRedemptions: 1,
    redemptionCount: 0,
    expiresAt: null,
    isActive: true,
    ...overrides,
  }
}

async function run() {
  assertDiscountCodeUsable(buildCode({ redemptionCount: 0 }))

  try {
    assertDiscountCodeUsable(buildCode({ redemptionCount: 1 }))
    throw new Error('Expected maxed-out code to be rejected')
  } catch (error) {
    assert(error instanceof Error, 'maxed-out code throws an Error')
    assert(error.message === DISCOUNT_CODE_UNUSABLE_MESSAGE, 'maxed-out code uses shared message')
  }

  let executed = false
  await incrementDiscountRedemption({
    $executeRaw: async () => {
      executed = true
      return 1
    },
  } as never, 'code_1')
  assert(executed, 'incrementDiscountRedemption runs a conditional update')

  await assertRejects(
    () =>
      incrementDiscountRedemption({
        $executeRaw: async () => 0,
      } as never, 'code_1'),
    'race-lost redemption'
  )

  console.log('discount code tests passed')
}

void run()
