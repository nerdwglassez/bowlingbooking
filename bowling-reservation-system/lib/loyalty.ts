import { prisma } from './db'

export interface LoyaltySettings {
  pointsPerDollar: number
  /** Cents discount per 100 points redeemed (e.g. 500 = $5 per 100 points) */
  redemptionCentsPer100Points: number
  minRedemptionPoints: number
}

const DEFAULT_LOYALTY: LoyaltySettings = {
  pointsPerDollar: 1,
  redemptionCentsPer100Points: 500, // $5 per 100 points
  minRedemptionPoints: 100,
}

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  try {
    const rows = await prisma.settings.findMany({
      where: {
        key: {
          in: [
            'loyalty_points_per_dollar',
            'loyalty_redemption_cents_per_100',
            'loyalty_redemption_min_points',
          ],
        },
      },
    })
    const map = new Map(rows.map((r) => [r.key, r.value]))
    return {
      pointsPerDollar: parseFloat(map.get('loyalty_points_per_dollar') ?? String(DEFAULT_LOYALTY.pointsPerDollar)),
      redemptionCentsPer100Points: parseInt(
        map.get('loyalty_redemption_cents_per_100') ?? String(DEFAULT_LOYALTY.redemptionCentsPer100Points),
        10
      ),
      minRedemptionPoints: parseInt(
        map.get('loyalty_redemption_min_points') ?? String(DEFAULT_LOYALTY.minRedemptionPoints),
        10
      ),
    }
  } catch (e) {
    console.error('getLoyaltySettings:', e)
    return DEFAULT_LOYALTY
  }
}

/** Tier by total lifetime points (we use current balance for display; could use sum of earns) */
export function getTierFromPoints(points: number): string {
  if (points >= 2000) return 'Gold'
  if (points >= 500) return 'Silver'
  return 'Bronze'
}

/**
 * Discount in dollars when redeeming `points` (based on settings).
 */
export function redemptionDiscountDollars(points: number, settings: LoyaltySettings): number {
  if (points < settings.minRedemptionPoints) return 0
  const centsDiscount = Math.floor(points / 100) * settings.redemptionCentsPer100Points
  return centsDiscount / 100
}

/**
 * Max points that can be applied to a given total (so discount doesn't exceed total).
 */
export function maxRedeemablePoints(
  totalDollars: number,
  settings: LoyaltySettings
): number {
  if (totalDollars <= 0) return 0
  const maxCentsDiscount = Math.floor(totalDollars * 100)
  const pointsPer100Cents = settings.redemptionCentsPer100Points
  const maxPoints = Math.floor((maxCentsDiscount / pointsPer100Cents) * 100)
  return Math.max(0, Math.floor(maxPoints / 100) * 100) // round down to nearest 100
}

/**
 * Award loyalty points for a paid booking. Call after payment is confirmed (status PAID).
 */
export async function awardPointsForBooking(
  userId: string,
  bookingId: string,
  totalPaidDollars: number
): Promise<number> {
  const settings = await getLoyaltySettings()
  const points = Math.floor(totalPaidDollars * settings.pointsPerDollar)
  if (points <= 0) return 0

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: points } },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        userId,
        amount: points,
        type: 'EARN',
        bookingId,
        description: `Earned ${points} points for booking`,
      },
    }),
  ])
  return points
}

/**
 * Redeem points for a booking. Deducts points and creates REDEEM transaction.
 * Call only after payment is confirmed (so we don't deduct if they abandon).
 */
export async function redeemPointsForBooking(
  userId: string,
  bookingId: string,
  points: number,
  discountDollars: number
): Promise<void> {
  if (points <= 0) return

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { decrement: points } },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        userId,
        amount: -points,
        type: 'REDEEM',
        bookingId,
        description: `Redeemed ${points} points for $${discountDollars.toFixed(2)} off`,
      },
    }),
  ])
}
