# POS / Lane Management Integration

This document describes how to integrate the bowling reservation system with an external **point-of-sale (POS)** or **lane management** system. Integration is vendor-dependent; this doc provides the contract and stubs.

## Goals

- **Export bookings** to the POS/lane system (e.g. daily schedule, lane assignments).
- **Sync products/pricing** (optional): push packages or receive product catalog from POS.
- **Webhook or polling**: POS can call our API, or we push to an external URL when bookings change.

## Stub API

The following endpoint is available for future implementation:

- **POST /api/webhooks/pos** – Outbound: called by our system when sending booking updates to a configured POS endpoint (not implemented; configure `POS_WEBHOOK_URL` when ready).
- **GET /api/admin/pos-export** – Export today’s (or date-range) bookings in a POS-friendly format (e.g. JSON or CSV). Returns 501 Not Implemented until a specific vendor format is chosen.

When you have a vendor API (e.g. specific lane management or POS provider), implement:

1. **Export format** – Map our `Booking` + `User` + packages to the vendor’s schema.
2. **Auth** – Use API key or OAuth as required by the vendor.
3. **Schedule** – Cron to push daily schedule or real-time webhook on booking create/update/cancel.

## Data we can export

- **Bookings**: `id`, `date`, `startTime`, `duration`, `lane`/`lanes`, `numBowlers`, `status`, `totalPrice`, customer name/email/phone, packages and products.
- **Packages/Products**: `id`, `name`, `price`, `type` (for menu/sync).

## Example: daily export JSON

```json
{
  "date": "2026-01-15",
  "bookings": [
    {
      "id": "clx...",
      "startTime": "14:00",
      "duration": 120,
      "lanes": [1, 2],
      "numBowlers": 6,
      "customerName": "Jane Doe",
      "customerEmail": "jane@example.com",
      "totalPrice": 89.00,
      "packages": ["Birthday Package"],
      "status": "PAID"
    }
  ]
}
```

Implement the actual export and webhook in `app/api/admin/pos-export/route.ts` and `app/api/webhooks/pos/route.ts` once a vendor is selected.
