import { NextResponse } from 'next/server';
import { getBookingById, updateBooking, deleteBooking, sanitizeBookingForCustomer } from '../../../../models/bookingModel';
import { checkAuth } from '../../../../lib/auth';
import { validateEventTimeRange } from '../../../../lib/schedulingEngine';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const booking = await getBookingById(id);
    if (!booking) {
      return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }

    if (auth.user.role !== 'Administrator') {
      const userEmail = (auth.user.email || '').trim().toLowerCase();
      const bookingEmail = (booking.clientEmail || '').trim().toLowerCase();
      const isOwner =
        (booking.userId && booking.userId === auth.user.id) ||
        (userEmail && bookingEmail === userEmail);

      if (!isOwner) {
        return NextResponse.json({ message: 'Not authorized to view this booking' }, { status: 403 });
      }
      return NextResponse.json(sanitizeBookingForCustomer(booking));
    }

    return NextResponse.json(booking);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();

    if (body.startTime !== undefined || body.endTime !== undefined) {
      const timeVal = validateEventTimeRange(body.startTime, body.endTime, { required: false });
      if (!timeVal.valid) {
        return NextResponse.json(
          { message: timeVal.message || 'Invalid event time range.' },
          { status: 400 }
        );
      }
    }

    const updated = await updateBooking(id, body);
    if (!updated) {
      return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    const isConflict = error.message && (
      error.message.includes('conflict') ||
      error.message.includes('collision') ||
      error.message.includes('double-booking') ||
      error.message.includes('inventory') ||
      error.message.includes('capacity') ||
      error.message.includes('occupied') ||
      error.message.includes('accommodate')
    );
    return NextResponse.json({ message: error.message || 'Server error' }, { status: isConflict ? 409 : 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await deleteBooking(id);
    return NextResponse.json({ message: 'Booking removed successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 400 });
  }
}
