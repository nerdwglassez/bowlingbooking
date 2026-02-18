import { prisma } from './db'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0,O,1,I
const CODE_PART_LEN = 4
const CODE_PREFIX = 'BOWL'

function randomPart(len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return s
}

/** Generate a unique gift card code like BOWL-XXXX-XXXX */
export async function generateGiftCardCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = `${CODE_PREFIX}-${randomPart(CODE_PART_LEN)}-${randomPart(CODE_PART_LEN)}`
    const existing = await prisma.giftCard.findUnique({ where: { code } })
    if (!existing) return code
  }
  throw new Error('Could not generate unique gift card code')
}

/** Normalize code: uppercase, trim */
export function normalizeCode(code: string): string {
  return code.replace(/\s/g, '').toUpperCase()
}

/** Validate code and return current balance; throws if invalid */
export async function validateGiftCard(code: string): Promise<{ id: string; balance: number }> {
  const normalized = normalizeCode(code)
  const card = await prisma.giftCard.findUnique({
    where: { code: normalized },
  })
  if (!card) throw new Error('Gift card not found')
  if (card.status !== 'ACTIVE') throw new Error('Gift card is no longer active')
  const balance = Number(card.balance)
  if (balance <= 0) throw new Error('Gift card has no balance')
  return { id: card.id, balance }
}

/** Deduct amount from gift card (call after payment confirmed) */
export async function applyGiftCardToBooking(
  giftCardId: string,
  amount: number
): Promise<void> {
  if (amount <= 0) return
  const card = await prisma.giftCard.findUnique({ where: { id: giftCardId } })
  if (!card) throw new Error('Gift card not found')
  const balance = Number(card.balance)
  if (balance < amount) throw new Error('Gift card balance insufficient')
  const newBalance = balance - amount
  await prisma.giftCard.update({
    where: { id: giftCardId },
    data: {
      balance: newBalance,
      status: newBalance <= 0 ? 'EMPTY' : 'ACTIVE',
    },
  })
}
