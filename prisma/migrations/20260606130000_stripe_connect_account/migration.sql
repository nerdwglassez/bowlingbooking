-- Migration 9 — Stripe Connect account id on Tenant
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "stripe_connect_account_id" TEXT;
