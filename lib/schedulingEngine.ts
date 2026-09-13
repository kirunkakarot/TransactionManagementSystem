import { prisma } from './prisma';

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

export const DEFAULT_MAX_DAILY_CAPACITY = 3;

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

  const dateObj = typeof eventDate === 'string' ? new Date(eventDate) : eventDate;
  // Normalize date to YYYY-MM-DD for SQL comparison
  const dateStr = dateObj.toISOString().split('T')[0];

  const conflicts: ConflictDetail[] = [];
  const staffConflictsList: Array<{ staffId: number; staffName: string; bookingRef: string; timeRange: string }> = [];
  const equipmentConflictsList: Array<{ resourceId: number; resourceName: string; available: number; requested: number }> = [];

  // 1. Fetch all active bookings on the given date (excluding Cancelled)
  const activeBookings = await db.booking.findMany({
    where: {
      eventDate: new Date(dateStr),
      status: { not: 'Cancelled' },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    include: {
      bookingStaff: {
        include: { staff: true },
      },
      bookingResources: {
        include: { resource: true },
      },
    },
  });

  const activeBookingsCount = activeBookings.length;
  const remainingSlots = Math.max(0, maxDailyCapacity - activeBookingsCount);

  // 2. Check Date Overbooking Capacity
  if (activeBookingsCount >= maxDailyCapacity) {
    conflicts.push({
      type: 'Date Overbooking',
      severity: 'Warning',
      message: `Date ${dateStr} has reached maximum crew operational capacity (${activeBookingsCount}/${maxDailyCapacity} active bookings).`,
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

export async function getDailyAvailabilityRadar(year: number, month: number) {
  // month is 1-indexed (1 = Jan, 8 = August, etc.)
  const startDate = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDate = new Date(year, month - 1, daysInMonth);

  const bookingsInMonth = await prisma.booking.findMany({
    where: {
      eventDate: {
        gte: startDate,
        lte: endDate,
      },
      status: { not: 'Cancelled' },
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

  const dailyRadar = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dayBookings = bookingsInMonth.filter(b => {
      const bDateStr = b.eventDate.toISOString().split('T')[0];
      return bDateStr === dayDateStr;
    });

    const activeCount = dayBookings.length;
    const remainingSlots = Math.max(0, DEFAULT_MAX_DAILY_CAPACITY - activeCount);

    let status: 'available' | 'limited' | 'booked' = 'available';
    if (remainingSlots <= 0) {
      status = 'booked';
    } else if (remainingSlots === 1) {
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
