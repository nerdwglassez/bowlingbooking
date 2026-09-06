-- Round A: scope audit logs by tenant for multi-tenant safety.
-- Adds nullable tenant_id, backfills from booking / user / Tenant entity rows,
-- then indexes for tenant-scoped reads.

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;

UPDATE "AuditLog" AS a
SET "tenant_id" = b."tenant_id"
FROM "Booking" b
WHERE a."booking_id" = b."id"
  AND a."tenant_id" IS NULL;

UPDATE "AuditLog" AS a
SET "tenant_id" = u."tenant_id"
FROM "User" u
WHERE a."user_id" = u."id"
  AND a."tenant_id" IS NULL
  AND u."tenant_id" IS NOT NULL;

UPDATE "AuditLog"
SET "tenant_id" = "entity_id"
WHERE "tenant_id" IS NULL
  AND "entity_type" = 'Tenant';

CREATE INDEX IF NOT EXISTS "AuditLog_tenant_id_created_at_idx"
  ON "AuditLog" ("tenant_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_tenant_id_fkey'
  ) THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
