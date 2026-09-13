import { NextResponse } from 'next/server';
import { checkScheduleAvailability, getDailyAvailabilityRadar } from '../../../../lib/schedulingEngine';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || now.getFullYear().toString(), 10);
    const month = parseInt(searchParams.get('month') || (now.getMonth() + 1).toString(), 10);

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

    const checkResult = await checkScheduleAvailability({
      eventDate,
      startTime,
      endTime,
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
