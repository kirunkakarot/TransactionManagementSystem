import { NextResponse } from 'next/server';
import {
  checkScheduleAvailability,
  getDailyAvailabilityRadar,
  getTodayManilaDateStr,
  validateEventTimeRange,
} from '../../../../lib/schedulingEngine';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const todayManila = getTodayManilaDateStr();
    const [defaultYear, defaultMonth] = todayManila.split('-').map(Number);
    const year = parseInt(searchParams.get('year') || defaultYear.toString(), 10);
    const month = parseInt(searchParams.get('month') || defaultMonth.toString(), 10);

    const radar = await getDailyAvailabilityRadar(year, month);
    return NextResponse.json({
      year,
      month,
      days: radar,
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      eventDate,
      startTime = '17:00',
      endTime = '23:00',
      venue = '',
      excludeBookingId = null,
      requestedStaffIds = [],
      requestedResourceAllocations = [],
    } = body;

    if (!eventDate) {
      return NextResponse.json({ message: 'Event date is required' }, { status: 400 });
    }

    if (body.startTime !== undefined || body.endTime !== undefined) {
      const timeValidation = validateEventTimeRange(body.startTime, body.endTime, { required: false });
      if (!timeValidation.valid) {
        return NextResponse.json(
          { message: timeValidation.message || 'Invalid event time range.' },
          { status: 400 }
        );
      }
    }

    const checkResult = await checkScheduleAvailability({
      eventDate,
      startTime: startTime ? String(startTime) : '17:00',
      endTime: endTime ? String(endTime) : '23:00',
      venue,
      excludeBookingId: excludeBookingId ? Number(excludeBookingId) : null,
      requestedStaffIds: Array.isArray(requestedStaffIds) ? requestedStaffIds.map(Number) : [],
      requestedResourceAllocations: Array.isArray(requestedResourceAllocations) ? requestedResourceAllocations : [],
    });

    return NextResponse.json(checkResult);
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
