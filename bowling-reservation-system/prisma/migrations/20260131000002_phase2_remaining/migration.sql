-- User: tier, tierDiscount, newsletterOptIn
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tier" TEXT DEFAULT 'REGULAR';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tier_discount" DECIMAL(5,2);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "newsletter_opt_in" BOOLEAN NOT NULL DEFAULT false;

-- Product and BookingProduct
CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "booking_products" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "booking_products_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "booking_products_booking_id_idx" ON "booking_products"("booking_id");
CREATE INDEX IF NOT EXISTS "booking_products_product_id_idx" ON "booking_products"("product_id");

ALTER TABLE "booking_products" ADD CONSTRAINT "booking_products_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_products" ADD CONSTRAINT "booking_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Booking: override approval workflow
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "override_status" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "proposed_total_price" DECIMAL(10,2);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "proposed_reason_code" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "proposed_notes" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "proposed_by" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "proposed_at" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "override_approved_by" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "override_approved_at" TIMESTAMP(3);
