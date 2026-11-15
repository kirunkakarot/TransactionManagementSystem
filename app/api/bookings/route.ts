import { NextResponse } from 'next/server';
import { getBookings, createBooking, sanitizeBookingForCustomer } from '../../../models/bookingModel';
import { checkAuth } from '../../../lib/auth';
import { validateEventTimeRange } from '../../../lib/schedulingEngine';

export async function GET(req: Request) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') || 'ALL';
    const search = searchParams.get('search') || '';

    // If customer, strictly restrict to their userId or case-insensitive email
    const isCustomer = auth.user.role !== 'Administrator';
    const customerFilter = isCustomer
      ? { userId: auth.user.id, email: auth.user.email }
      : undefined;

    const data = await getBookings(limit, offset, status, search, customerFilter);
    if (isCustomer) {
      return NextResponse.json({
        ...data,
        bookings: data.bookings.map(sanitizeBookingForCustomer),
      });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await checkAuth(req, true); // Only admin creates confirmed bookings
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    if (!body.clientName || !body.clientEmail || !body.eventTitle || !body.eventType || !body.eventDate || !body.venue) {
      return NextResponse.json(
        { message: 'Client name, email, event title, type, date, and venue are required' },
        { status: 400 }
      );
    }

    if (body.startTime !== undefined || body.endTime !== undefined) {
      const timeVal = validateEventTimeRange(body.startTime, body.endTime, { required: false });
      if (!timeVal.valid) {
        return NextResponse.json(
          { message: timeVal.message || 'Invalid event time range.' },
          { status: 400 }
        );
      }
    }

    const booking = await createBooking({
      inquiryId: body.inquiryId,
      quotationId: body.quotationId,
      userId: body.userId,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      clientPhone: body.clientPhone,
      eventTitle: body.eventTitle,
      eventType: body.eventType,
      eventDate: body.eventDate,
      startTime: body.startTime,
      endTime: body.endTime,
      venue: body.venue,
      guestCount: body.guestCount,
      totalAmount: body.totalAmount || 0,
      status: body.status || 'Tentative',
      notes: body.notes,
      assignedStaff: body.assignedStaff || [],
      assignedServices: body.assignedServices || [],
      assignedPackages: body.assignedPackages || [],
      assignedEquipment: body.assignedEquipment || [],
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    const isConflict = error.message && (
      error.message.includes('conflict') ||
      error.message.includes('collision') ||
      error.message.includes('double-booking') ||
      error.message.includes('inventory') ||
      error.message.includes('capacity') ||
      error.message.includes('occupied') ||
      error.message.includes('accommodate') ||
      error.message.includes('Cannot create a booking from a')
    );
    return NextResponse.json({ message: error.message || 'Server error' }, { status: isConflict ? 409 : 400 });
  }
}
