import { NextResponse } from 'next/server';
import { cancelBooking } from '../../../../../models/bookingModel';
import { checkAuth } from '../../../../../lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const reason = body.reason || 'Cancelled per administrative review';

    const updated = await cancelBooking(id, reason);
    return NextResponse.json({
      success: true,
      message: 'Booking cancelled and schedule slots released successfully',
      booking: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 400 });
  }
}
