-- Align DB with Prisma schema: discount codes, booking marketing/loyalty/gift/check-in fields.
-- Safe to re-run: uses IF NOT EXISTS / exception handlers where needed.

DO $$ BEGIN
    CREATE TYPE "DiscountCodePaymentMode" AS ENUM ('ONLINE', 'INVOICE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "discount_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "payment_mode" "DiscountCodePaymentMode" NOT NULL,
    "discount_percent" DECIMAL(5,2),
    "discount_fixed_amount" DECIMAL(10,2),
    "max_redemptions" INTEGER,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "discount_codes_code_key" ON "discount_codes"("code");

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "post_visit_email_sent_at" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "loyalty_points_redeemed" INTEGER;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "loyalty_discount_amount" DECIMAL(10,2);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "gift_card_id" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "gift_card_amount_applied" DECIMAL(10,2);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "discount_code_id" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "applied_discount_code" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "check_in_token" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "bookings_check_in_token_key" ON "bookings"("check_in_token");

DO $$ BEGIN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_discount_code_id_fkey"
        FOREIGN KEY ("discount_code_id") REFERENCES "discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "bookings_discount_code_id_idx" ON "bookings"("discount_code_id");
