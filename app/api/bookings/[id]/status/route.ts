import { NextResponse } from 'next/server';
import { updateBookingStatus } from '../../../../../models/bookingModel';
import { checkAuth } from '../../../../../lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.status) {
      return NextResponse.json({ message: 'Status is required' }, { status: 400 });
    }

    const bookingId = decodeURIComponent(id);
    const updated = await updateBookingStatus(bookingId, body.status);
    return NextResponse.json({
      success: true,
      message: `Booking status updated to ${body.status}`,
      booking: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 400 });
  }
}
