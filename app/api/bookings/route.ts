import { NextResponse } from 'next/server';
import { getBookings, createBooking } from '../../../models/bookingModel';
import { checkAuth } from '../../../lib/auth';

export async function GET(req: Request) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') || 'ALL';
    const search = searchParams.get('search') || '';

    // If customer, restrict to their email
    const isCustomer = auth.user.role !== 'Administrator';
    const effectiveSearch = isCustomer ? auth.user.email : search;

    const data = await getBookings(limit, offset, status, effectiveSearch);
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
      error.message.includes('Cannot create a booking from a')
    );
    return NextResponse.json({ message: error.message || 'Server error' }, { status: isConflict ? 409 : 400 });
  }
}
