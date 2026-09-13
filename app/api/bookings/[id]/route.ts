import { NextResponse } from 'next/server';
import { getBookingById, updateBooking, deleteBooking } from '../../../../models/bookingModel';
import { checkAuth } from '../../../../lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const booking = await getBookingById(id);
    if (!booking) {
      return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }

    if (auth.user.role !== 'Administrator' && booking.clientEmail !== auth.user.email) {
      return NextResponse.json({ message: 'Not authorized to view this booking' }, { status: 403 });
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
      error.message.includes('inventory')
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
