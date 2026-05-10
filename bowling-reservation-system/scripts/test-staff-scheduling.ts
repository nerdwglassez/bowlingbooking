import {
  buildTimelineEntries,
  detectSchedulingConflicts,
  getBookingEndTime,
  getTimelineSlots,
  minutesToTimeString,
  timeStringToMinutes,
  type StaffSchedulingBooking,
} from '@/lib/staff/scheduling'
import {
  buildBookingLaneAssignment,
  parsePersistedBookingLanes,
} from '@/lib/booking/lanes'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`)
  }
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string) {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  if (actualJson !== expectedJson) {
    throw new Error(`${message}: expected ${expectedJson}, received ${actualJson}`)
  }
}

function run() {
  assertEqual(timeStringToMinutes('10:30'), 630, 'timeStringToMinutes converts hh:mm')
  assertEqual(minutesToTimeString(635), '10:35', 'minutesToTimeString converts minutes')
  assertEqual(getBookingEndTime('10:30', 90), '12:00', 'getBookingEndTime adds duration')

  const slots = getTimelineSlots({ startTime: '10:00', endTime: '12:00', slotMinutes: 30 })
  assertEqual(slots.length, 4, 'getTimelineSlots returns expected count')
  assertDeepEqual(
    slots.map((slot) => slot.startTime),
    ['10:00', '10:30', '11:00', '11:30'],
    'getTimelineSlots returns expected slot boundaries'
  )

  const bookings: StaffSchedulingBooking[] = [
    {
      id: 'b1',
      startTime: '10:00',
      duration: 60,
      lane: 1,
      status: 'CONFIRMED',
      user: { email: 'a@example.com', firstName: 'Alex', lastName: 'One' },
      bookingPackages: [{ package: { name: 'Family Pack' } }],
    },
    {
      id: 'b2',
      startTime: '10:30',
      duration: 60,
      lane: 1,
      status: 'PAID',
      user: { email: 'b@example.com', firstName: 'Blake', lastName: 'Two' },
    },
    {
      id: 'b3',
      startTime: '11:00',
      duration: 60,
      lane: 2,
      lanes: '[2,3]',
      status: 'CONFIRMED',
      user: { email: 'c@example.com', firstName: 'Casey', lastName: 'Three' },
    },
  ]

  const entries = buildTimelineEntries(bookings, {
    startTime: '10:00',
    endTime: '13:00',
    slotMinutes: 30,
  })

  assertEqual(entries.length, 4, 'buildTimelineEntries expands multi-lane bookings')
  assertDeepEqual(
    entries.map((entry) => ({
      bookingId: entry.bookingId,
      lane: entry.lane,
      startSlotIndex: entry.startSlotIndex,
      slotSpan: entry.slotSpan,
    })),
    [
      { bookingId: 'b1', lane: 1, startSlotIndex: 0, slotSpan: 2 },
      { bookingId: 'b2', lane: 1, startSlotIndex: 1, slotSpan: 2 },
      { bookingId: 'b3', lane: 2, startSlotIndex: 2, slotSpan: 2 },
      { bookingId: 'b3', lane: 3, startSlotIndex: 2, slotSpan: 2 },
    ],
    'buildTimelineEntries computes lane entries and slot spans'
  )

  const conflicts = detectSchedulingConflicts(entries)
  assertDeepEqual(
    conflicts,
    [{ lane: 1, firstBookingId: 'b1', secondBookingId: 'b2' }],
    'detectSchedulingConflicts finds overlaps per lane'
  )

  assertDeepEqual(
    parsePersistedBookingLanes({ lane: 4, lanes: '[4,5,6]' }),
    [4, 5, 6],
    'parsePersistedBookingLanes uses persisted multi-lane JSON'
  )
  assertDeepEqual(
    buildBookingLaneAssignment([7, 8, 10], 2),
    { lane: 7, lanes: '[7,8]', laneNumbers: [7, 8] },
    'buildBookingLaneAssignment keeps multi-lane reservations multi-lane'
  )
  assertEqual(
    buildBookingLaneAssignment([9], 2),
    null,
    'buildBookingLaneAssignment rejects insufficient lanes'
  )

  console.log('staff scheduling tests passed')
}

run()
