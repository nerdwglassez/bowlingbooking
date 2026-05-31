-- Migration: audit remediation — booking line items, policy snapshots, consent,
-- inclusions, CODE_REQUIRED fields, pricing periods, claim tokens, schema hygiene.

-- CreateEnum
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';

-- Tenant policy columns (Migration 1)
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "cancellation_window_hours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "reschedule_window_hours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "check_in_window_minutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "bowlers_per_lane" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "cancellation_refund_percent" INTEGER NOT NULL DEFAULT 100;

-- Booking snapshots + consent + add-ons (Migrations 1-2 + Phase 1)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancellation_window_hours_snapshot" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "reschedule_window_hours_snapshot" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "bowlers_per_lane_snapshot" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancellation_refund_percent_snapshot" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "sms_reminder_consent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "marketing_consent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "selected_addon_ids" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancellation_reason" "CancellationReason";
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "checked_in_at" TIMESTAMP(3);

-- BookingBowler (Phase 1)
CREATE TABLE IF NOT EXISTS "BookingBowler" (
    "booking_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "shoe_size" TEXT,
    CONSTRAINT "BookingBowler_pkey" PRIMARY KEY ("booking_id","index")
);

ALTER TABLE "BookingBowler" DROP CONSTRAINT IF EXISTS "BookingBowler_booking_id_fkey";
ALTER TABLE "BookingBowler" ADD CONSTRAINT "BookingBowler_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Package inclusions + CODE_REQUIRED (Migrations 3-4)
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "inclusions" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "access_type" TEXT NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "pricing_type" TEXT;
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "code_string" TEXT;
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "discount_type" TEXT;
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "discount_value" INTEGER;
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "usage_limit" INTEGER;
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "usage_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "payment_mode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Package_tenant_id_code_string_key" ON "Package"("tenant_id", "code_string");

-- Payment paymentMethod (schema hygiene)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "payment_method" TEXT;

-- Lane + OperatingHours uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS "Lane_tenant_id_number_key" ON "Lane"("tenant_id", "number");
CREATE UNIQUE INDEX IF NOT EXISTS "OperatingHours_tenant_id_day_of_week_key" ON "OperatingHours"("tenant_id", "day_of_week");

-- Booking index
CREATE INDEX IF NOT EXISTS "Booking_tenant_id_status_start_time_idx" ON "Booking"("tenant_id", "status", "start_time");

-- BlockedSlot index
CREATE INDEX IF NOT EXISTS "BlockedSlot_tenant_id_start_time_end_time_idx" ON "BlockedSlot"("tenant_id", "start_time", "end_time");

-- PricingPeriod (Migration 5)
CREATE TABLE IF NOT EXISTS "PricingPeriod" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate_per_person_per_hour" INTEGER NOT NULL,
    "days_of_week" INTEGER[],
    "start_time" TEXT,
    "end_time" TEXT,
    "specific_dates" TIMESTAMP(3)[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PricingPeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PricingPeriod_tenant_id_priority_key" ON "PricingPeriod"("tenant_id", "priority");

ALTER TABLE "PricingPeriod" DROP CONSTRAINT IF EXISTS "PricingPeriod_tenant_id_fkey";
ALTER TABLE "PricingPeriod" ADD CONSTRAINT "PricingPeriod_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ClaimToken (Migration 7)
CREATE TABLE IF NOT EXISTS "ClaimToken" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClaimToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClaimToken_booking_id_key" ON "ClaimToken"("booking_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ClaimToken_token_key" ON "ClaimToken"("token");
CREATE INDEX IF NOT EXISTS "ClaimToken_token_idx" ON "ClaimToken"("token");

ALTER TABLE "ClaimToken" DROP CONSTRAINT IF EXISTS "ClaimToken_booking_id_fkey";
ALTER TABLE "ClaimToken" ADD CONSTRAINT "ClaimToken_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClaimToken" DROP CONSTRAINT IF EXISTS "ClaimToken_tenant_id_fkey";
ALTER TABLE "ClaimToken" ADD CONSTRAINT "ClaimToken_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AuditLog + Payment user FKs
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_user_id_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_refunded_by_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_refunded_by_fkey" FOREIGN KEY ("refunded_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill tenant policy from config JSON where present
UPDATE "Tenant"
SET
  "cancellation_window_hours" = COALESCE(
    ("config"->>'cancellationWindowHours')::INTEGER,
    "cancellation_window_hours"
  ),
  "cancellation_refund_percent" = COALESCE(
    ("config"->>'cancellationRefundPercent')::INTEGER,
    "cancellation_refund_percent"
  )
WHERE "config" IS NOT NULL AND "config"::text != '{}';

-- Backfill existing bookings with current tenant policy snapshots
UPDATE "Booking" b
SET
  "cancellation_window_hours_snapshot" = t."cancellation_window_hours",
  "reschedule_window_hours_snapshot" = t."reschedule_window_hours",
  "bowlers_per_lane_snapshot" = t."bowlers_per_lane",
  "cancellation_refund_percent_snapshot" = t."cancellation_refund_percent"
FROM "Tenant" t
WHERE b."tenant_id" = t."id"
  AND b."cancellation_window_hours_snapshot" IS NULL;

-- Walk-in payments: copy status to payment_method where applicable
UPDATE "Payment"
SET "payment_method" = "status"
WHERE "payment_method" IS NULL
  AND "stripe_payment_intent_id" IS NULL
  AND "status" IN ('cash', 'card_at_counter', 'pending');
