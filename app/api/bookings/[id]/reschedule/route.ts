import { NextResponse } from 'next/server';
import { rescheduleBooking } from '../../../../../models/bookingModel';
import { checkAuth } from '../../../../../lib/auth';
import { validateEventTimeRange } from '../../../../../lib/schedulingEngine';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.newDate || !body.newStartTime || !body.newEndTime) {
      return NextResponse.json(
        { message: 'New date, start time, and end time are required' },
        { status: 400 }
      );
    }

    const timeVal = validateEventTimeRange(body.newStartTime, body.newEndTime, { required: true });
    if (!timeVal.valid || !timeVal.normalizedStartTime || !timeVal.normalizedEndTime) {
      return NextResponse.json(
        { message: timeVal.message || 'Invalid event start time and end time.' },
        { status: 400 }
      );
    }

    const reason = body.reason || 'Rescheduled per client/operational request';
    const updated = await rescheduleBooking(
      id,
      body.newDate,
      timeVal.normalizedStartTime,
      timeVal.normalizedEndTime,
      reason
    );

    return NextResponse.json({
      success: true,
      message: 'Booking rescheduled successfully',
      booking: updated,
    });
  } catch (error: any) {
    const isConflict = error.message && (
      error.message.includes('conflict') ||
      error.message.includes('occupied') ||
      error.message.includes('accommodate')
    );
    return NextResponse.json({ message: error.message || 'Server error' }, { status: isConflict ? 409 : 400 });
  }
}
