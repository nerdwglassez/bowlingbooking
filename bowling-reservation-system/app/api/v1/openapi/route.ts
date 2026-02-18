import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** OpenAPI 3.0 spec for the public API (v1). */
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'StrikeZone Bowling Reservation API',
    version: '1.0.0',
    description:
      'Partner API for availability and bookings. Authenticate with an API key in the `X-API-Key` header or `Authorization: Bearer <key>`.',
  },
  servers: [{ url: '/api/v1', description: 'API v1 base path' }],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key (prefix: bowl_). Obtain from admin.',
      },
    },
    schemas: {
      TimeSlot: {
        type: 'object',
        properties: {
          time: { type: 'string', example: '14:00' },
          available: { type: 'boolean' },
          availableLanes: { type: 'integer' },
        },
      },
      AvailabilityResponse: {
        type: 'object',
        properties: {
          date: { type: 'string', example: '2026-02-01' },
          slots: { type: 'array', items: { $ref: '#/components/schemas/TimeSlot' } },
        },
      },
      BookingSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          date: { type: 'string' },
          startTime: { type: 'string' },
          duration: { type: 'integer' },
          lane: { type: 'integer' },
          lanes: { type: 'array', items: { type: 'integer' }, nullable: true },
          numBowlers: { type: 'integer' },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'] },
          totalPrice: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          packages: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, quantity: { type: 'integer' } } } },
          products: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, quantity: { type: 'integer' } } } },
        },
      },
      CreateBookingRequest: {
        type: 'object',
        required: ['customer', 'date', 'startTime', 'duration', 'numBowlers'],
        properties: {
          customer: {
            type: 'object',
            required: ['email', 'firstName', 'lastName', 'phone'],
            properties: {
              email: { type: 'string', format: 'email' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              phone: { type: 'string' },
            },
          },
          date: { type: 'string', example: '2026-02-01' },
          startTime: { type: 'string', example: '14:00' },
          duration: { type: 'integer', enum: [60, 90, 120, 150, 180] },
          numLanes: { type: 'integer', minimum: 1, maximum: 5, default: 1 },
          numBowlers: { type: 'integer', minimum: 1, maximum: 10 },
          shoeSizes: { type: 'array', items: { type: 'number' } },
          packageIds: { type: 'array', items: { type: 'string' } },
          productItems: { type: 'array', items: { type: 'object', properties: { productId: { type: 'string' }, quantity: { type: 'integer' } } } },
        },
      },
    },
  },
  paths: {
    '/availability': {
      get: {
        summary: 'Get availability',
        description: 'Returns available time slots for a date. Requires scope `availability`.',
        operationId: 'getAvailability',
        tags: ['Availability'],
        parameters: [
          { name: 'date', in: 'query', required: true, schema: { type: 'string', example: '2026-02-01' }, description: 'Date (YYYY-MM-DD)' },
        ],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AvailabilityResponse' } } } },
          '400': { description: 'Bad request (e.g. missing or invalid date)' },
          '401': { description: 'Missing or invalid API key' },
          '403': { description: 'API key lacks scope' },
        },
      },
    },
    '/bookings': {
      get: {
        summary: 'List bookings by email',
        description: 'Returns bookings for the given customer email. Requires scope `bookings:read`.',
        operationId: 'listBookings',
        tags: ['Bookings'],
        parameters: [
          { name: 'email', in: 'query', required: true, schema: { type: 'string', format: 'email' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { bookings: { type: 'array', items: { $ref: '#/components/schemas/BookingSummary' } } } },
              },
            },
          },
          '400': { description: 'Missing email' },
          '401': { description: 'Missing or invalid API key' },
          '403': { description: 'API key lacks scope' },
        },
      },
      post: {
        summary: 'Create a booking',
        description:
          'Creates a booking for the given customer (finds or creates user by email). Booking is created with status PENDING; customer receives confirmation email and can pay via the web app. Requires scope `bookings:write`. Rate limit: per key (default 60/min).',
        operationId: 'createBooking',
        tags: ['Bookings'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateBookingRequest' } } },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    booking: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        date: { type: 'string' },
                        startTime: { type: 'string' },
                        duration: { type: 'integer' },
                        lane: { type: 'integer' },
                        lanes: { type: 'array', items: { type: 'integer' } },
                        numBowlers: { type: 'integer' },
                        status: { type: 'string' },
                        totalPrice: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error or slot unavailable' },
          '401': { description: 'Missing or invalid API key' },
          '403': { description: 'API key lacks scope' },
        },
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(openApiSpec)
}
