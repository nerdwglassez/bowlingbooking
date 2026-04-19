import {
  addMonths,
  endOfMonth,
  isAfter,
  isBefore,
  parse,
  startOfDay,
  startOfMonth,
} from 'date-fns'

export type BookingWindow = {
  today: Date
  minViewMonth: Date
  maxViewMonth: Date
  maxBookableDate: Date
}

export function getBookingWindow(referenceDate = new Date()): BookingWindow {
  const today = startOfDay(referenceDate)
  return {
    today,
    minViewMonth: startOfMonth(today),
    maxViewMonth: startOfMonth(addMonths(today, 2)),
    maxBookableDate: endOfMonth(addMonths(today, 2)),
  }
}

export function clampDateToViewWindow(date: Date, window: Pick<BookingWindow, 'minViewMonth' | 'maxViewMonth'>) {
  if (isBefore(date, window.minViewMonth)) return window.minViewMonth
  if (isAfter(date, window.maxViewMonth)) return window.maxViewMonth
  return date
}

export const clampMonthToBookingWindow = clampDateToViewWindow

export function getInitialViewMonthFromSelection(
  selectedDate: string | undefined,
  window: Pick<BookingWindow, 'minViewMonth' | 'maxViewMonth'>
) {
  if (!selectedDate) return window.minViewMonth
  const parsedDate = parse(selectedDate, 'yyyy-MM-dd', new Date())
  return clampDateToViewWindow(startOfMonth(parsedDate), window)
}

export function isDateWithinBookingWindow(date: Date, window: Pick<BookingWindow, 'today' | 'maxBookableDate'>) {
  return !isBefore(date, window.today) && !isAfter(date, window.maxBookableDate)
}

export const isDateInBookingWindow = isDateWithinBookingWindow
