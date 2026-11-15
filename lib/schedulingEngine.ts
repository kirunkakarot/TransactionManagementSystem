import { prisma } from './prisma';
import {
  validateEventTimeRange,
  normalizeTime24Hour,
  formatTime12Hour,
  formatEventTimeRange,
  calculateEventDurationLabel,
  calculateEventDurationMinutes,
  resolveEventTimes,
  updateRequirementsWithSchedule,
} from '../components/jad/types';

export {
  validateEventTimeRange,
  normalizeTime24Hour,
  formatTime12Hour,
  formatEventTimeRange,
  calculateEventDurationLabel,
  calculateEventDurationMinutes,
  resolveEventTimes,
  updateRequirementsWithSchedule,
};

export interface CheckAvailabilityParams {
  eventDate: string | Date;
  startTime?: string;
  endTime?: string;
  venue?: string;
  excludeBookingId?: number | null;
  requestedStaffIds?: number[];
  requestedResourceAllocations?: Array<{ resourceId: number; quantity: number }>;
  maxDailyCapacity?: number;
  client?: any;
}

export interface ConflictDetail {
  type: 'Venue Collision' | 'Staff Double-Booking' | 'Equipment Exhaustion' | 'Date Overbooking';
  severity: 'High' | 'Warning';
  message: string;
  conflictingBookingId?: number;
  conflictingBookingRef?: string;
  conflictingTitle?: string;
  timeRange?: string;
  resourceName?: string;
  staffName?: string;
}

export interface AvailabilityResult {
  isAvailable: boolean;
  hasHighConflicts: boolean;
  conflicts: ConflictDetail[];
  activeBookingsCount: number;
  remainingSlots: number;
  venueStatus: 'Available' | 'Occupied';
  staffConflicts: Array<{ staffId: number; staffName: string; bookingRef: string; timeRange: string }>;
  equipmentConflicts: Array<{ resourceId: number; resourceName: string; available: number; requested: number }>;
}

export const MANILA_TIMEZONE = 'Asia/Manila';
export const DEFAULT_MAX_DAILY_CAPACITY = 1;
export const NON_OCCUPYING_BOOKING_STATUSES = ['Cancelled', 'Canceled', 'Rejected'] as const;
export const INTERACTIVE_TX_OPTIONS = { maxWait: 15000, timeout: 30000 } as const;

export function isQualifyingBookingStatus(status?: string | null): boolean {
  if (!status) return true;
  const normalized = status.trim().toLowerCase();
  return normalized !== 'cancelled' && normalized !== 'canceled' && normalized !== 'rejected';
}

export function getTodayManilaDateStr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function normalizeEventDateStr(input: string | Date): string {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/i.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid event date: "${input}"`);
    }
    return getTodayManilaDateStr(parsed);
  }

  if (input instanceof Date) {
    if (isNaN(input.getTime())) {
      throw new Error('Invalid event date');
    }
    return getTodayManilaDateStr(input);
  }

  throw new Error('Invalid event date');
}

export function toEventDateDbValue(input: string | Date): Date {
  const dateStr = normalizeEventDateStr(input);
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function isPastManilaDate(input: string | Date, now: Date = new Date()): boolean {
  const dateStr = normalizeEventDateStr(input);
  const todayStr = getTodayManilaDateStr(now);
  return dateStr < todayStr;
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const [hours, minutes] = clean.split(':').map(val => parseInt(val, 10) || 0);
  return hours * 60 + minutes;
}

export function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timeToMinutes(startA || '17:00');
  const eA = timeToMinutes(endA || '23:00');
  const sB = timeToMinutes(startB || '17:00');
  const eB = timeToMinutes(endB || '23:00');

  // Proper interval intersection logic: startA < endB && endA > startB
  return sA < eB && eA > sB;
}

export async function checkScheduleAvailability(params: CheckAvailabilityParams): Promise<AvailabilityResult> {
  const {
    eventDate,
    startTime = '17:00',
    endTime = '23:00',
    venue = '',
    excludeBookingId = null,
    requestedStaffIds = [],
    requestedResourceAllocations = [],
    maxDailyCapacity = DEFAULT_MAX_DAILY_CAPACITY,
    client,
  } = params;

  const db = client || prisma;

  // Normalize date to YYYY-MM-DD in Asia/Manila for consistent SQL comparison
  const dateStr = normalizeEventDateStr(eventDate);
  const dbEventDate = toEventDateDbValue(dateStr);

  const conflicts: ConflictDetail[] = [];
  const staffConflictsList: Array<{ staffId: number; staffName: string; bookingRef: string; timeRange: string }> = [];
  const equipmentConflictsList: Array<{ resourceId: number; resourceName: string; available: number; requested: number }> = [];

  const needStaffJoin = Array.isArray(requestedStaffIds) && requestedStaffIds.length > 0;
  const needResourceJoin =
    Array.isArray(requestedResourceAllocations) && requestedResourceAllocations.length > 0;

  // 1. Fetch all active qualifying bookings on the given date (excluding Cancelled/Rejected)
  const rawBookingsOnDate = await db.booking.findMany({
    where: {
      eventDate: dbEventDate,
      status: { notIn: [...NON_OCCUPYING_BOOKING_STATUSES] },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    ...(needStaffJoin || needResourceJoin
      ? {
          include: {
            ...(needStaffJoin ? { bookingStaff: { include: { staff: true } } } : {}),
            ...(needResourceJoin ? { bookingResources: { include: { resource: true } } } : {}),
          },
        }
      : {
          select: {
            id: true,
            bookingRef: true,
            eventTitle: true,
            eventDate: true,
            startTime: true,
            endTime: true,
            venue: true,
            status: true,
          },
        }),
  });

  const activeBookings = rawBookingsOnDate.filter((b: any) => isQualifyingBookingStatus(b.status));
  const activeBookingsCount = activeBookings.length;
  const remainingSlots = Math.max(0, maxDailyCapacity - activeBookingsCount);

  // 2. Check One-Booking-Per-Day / Daily Capacity Rule (High severity so it blocks booking creation/confirmation)
  if (activeBookingsCount >= maxDailyCapacity) {
    const occupyingBooking = activeBookings[0];
    const occupyingDetail = occupyingBooking
      ? ` by Booking [${occupyingBooking.bookingRef}] "${occupyingBooking.eventTitle}"`
      : '';
    conflicts.push({
      type: 'Date Overbooking',
      severity: 'High',
      message: `Date ${dateStr} is already occupied${occupyingDetail}. JAD Events can only accommodate ${maxDailyCapacity} booking per calendar day (${activeBookingsCount}/${maxDailyCapacity} occupied).`,
      conflictingBookingId: occupyingBooking?.id,
      conflictingBookingRef: occupyingBooking?.bookingRef,
      conflictingTitle: occupyingBooking?.eventTitle,
      timeRange: occupyingBooking ? `${occupyingBooking.startTime || '17:00'} - ${occupyingBooking.endTime || '23:00'}` : undefined,
    });
  }

  // 3. Check Venue Collision
  let isVenueOccupied = false;
  if (venue && venue.trim().length > 0) {
    const trimmedVenue = venue.trim().toLowerCase();

    for (const b of activeBookings) {
      if (b.venue && b.venue.trim().toLowerCase() === trimmedVenue) {
        if (isTimeOverlapping(startTime, endTime, b.startTime, b.endTime)) {
          isVenueOccupied = true;
          conflicts.push({
            type: 'Venue Collision',
            severity: 'High',
            message: `Venue collision at "${b.venue}". Already booked by [${b.bookingRef}] "${b.eventTitle}" (${b.startTime} - ${b.endTime}).`,
            conflictingBookingId: b.id,
            conflictingBookingRef: b.bookingRef,
            conflictingTitle: b.eventTitle,
            timeRange: `${b.startTime} - ${b.endTime}`,
          });
        }
      }
    }
  }

  // 4. Check Staff Double-Booking
  if (requestedStaffIds && requestedStaffIds.length > 0) {
    for (const staffId of requestedStaffIds) {
      for (const b of activeBookings) {
        const assignedStaffItem = b.bookingStaff.find((bs: any) => bs.staffId === staffId);
        if (assignedStaffItem) {
          if (isTimeOverlapping(startTime, endTime, b.startTime, b.endTime)) {
            const staffName = assignedStaffItem.staff.name;
            staffConflictsList.push({
              staffId,
              staffName,
              bookingRef: b.bookingRef,
              timeRange: `${b.startTime} - ${b.endTime}`,
            });
            conflicts.push({
              type: 'Staff Double-Booking',
              severity: 'High',
              message: `Staff member ${staffName} is already assigned to [${b.bookingRef}] (${b.startTime} - ${b.endTime}).`,
              conflictingBookingId: b.id,
              conflictingBookingRef: b.bookingRef,
              conflictingTitle: b.eventTitle,
              staffName,
              timeRange: `${b.startTime} - ${b.endTime}`,
            });
          }
        }
      }
    }
  }

  // 5. Check Equipment Resource Exhaustion
  if (requestedResourceAllocations && requestedResourceAllocations.length > 0) {
    for (const reqAlloc of requestedResourceAllocations) {
      const resourceRecord = await db.equipmentResource.findUnique({
        where: { id: reqAlloc.resourceId },
      });

      if (resourceRecord) {
        let currentlyAllocated = 0;
        for (const b of activeBookings) {
          if (isTimeOverlapping(startTime, endTime, b.startTime, b.endTime)) {
            const resItem = b.bookingResources.find((br: any) => br.resourceId === reqAlloc.resourceId);
            if (resItem) {
              currentlyAllocated += resItem.quantity;
            }
          }
        }

        const availableUnits = Math.max(0, resourceRecord.quantity - currentlyAllocated);

        if (reqAlloc.quantity > availableUnits) {
          equipmentConflictsList.push({
            resourceId: resourceRecord.id,
            resourceName: resourceRecord.name,
            available: availableUnits,
            requested: reqAlloc.quantity,
          });

          conflicts.push({
            type: 'Equipment Exhaustion',
            severity: 'High',
            message: `Insufficient inventory for "${resourceRecord.name}". Requested: ${reqAlloc.quantity}, Available: ${availableUnits} (Total stock: ${resourceRecord.quantity}, Currently Allocated: ${currentlyAllocated}).`,
            resourceName: resourceRecord.name,
          });
        }
      }
    }
  }

  const hasHighConflicts = conflicts.some(c => c.severity === 'High');
  const isAvailable = !hasHighConflicts && remainingSlots > 0;

  return {
    isAvailable,
    hasHighConflicts,
    conflicts,
    activeBookingsCount,
    remainingSlots,
    venueStatus: isVenueOccupied ? 'Occupied' : 'Available',
    staffConflicts: staffConflictsList,
    equipmentConflicts: equipmentConflictsList,
  };
}

export async function getDailyAvailabilityRadar(year: number, month: number, client?: any) {
  const db = client || prisma;
  // month is 1-indexed (1 = Jan, 8 = August, etc.)
  const monthStr = month.toString().padStart(2, '0');
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daysInMonthStr = daysInMonth.toString().padStart(2, '0');

  // Use deterministic UTC date boundaries matching PostgreSQL @db.Date
  const startDate = new Date(`${year}-${monthStr}-01T00:00:00.000Z`);
  const endDate = new Date(`${year}-${monthStr}-${daysInMonthStr}T00:00:00.000Z`);

  const rawBookingsInMonth = await db.booking.findMany({
    where: {
      eventDate: {
        gte: startDate,
        lte: endDate,
      },
      status: { notIn: [...NON_OCCUPYING_BOOKING_STATUSES] },
    },
    select: {
      id: true,
      bookingRef: true,
      eventDate: true,
      startTime: true,
      endTime: true,
      venue: true,
      status: true,
    },
  });

  const bookingsInMonth = rawBookingsInMonth.filter((b: any) => isQualifyingBookingStatus(b.status));
  const dailyRadar = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDateStr = `${year}-${monthStr}-${day.toString().padStart(2, '0')}`;
    const dayBookings = bookingsInMonth.filter((b: any) => {
      const bDateStr = normalizeEventDateStr(b.eventDate);
      return bDateStr === dayDateStr;
    });

    const activeCount = dayBookings.length;
    const remainingSlots = Math.max(0, DEFAULT_MAX_DAILY_CAPACITY - activeCount);

    let status: 'available' | 'limited' | 'booked' = 'available';
    if (remainingSlots <= 0) {
      status = 'booked';
    } else if (DEFAULT_MAX_DAILY_CAPACITY > 1 && remainingSlots === 1) {
      status = 'limited';
    } else {
      status = 'available';
    }

    dailyRadar.push({
      date: dayDateStr,
      dayNumber: day,
      status,
      slotsRemaining: remainingSlots,
      activeBookingsCount: activeCount,
    });
  }

  return dailyRadar;
}
