import { NextResponse } from 'next/server';
import { createInquiry, getInquiries, generateTrackingId } from '../../../models/inquiryModel';
import { checkAuth } from '../../../lib/auth';

export async function GET(req: Request) {
  // Requires Administrator privileges to view all inquiries
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';

    const data = await getInquiries(limit, offset, search);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Check optional authentication (if customer is logged in)
    const auth = await checkAuth(req, false);
    const authenticatedUser = !auth.error ? auth.user : null;

    const body = await req.json();
    const {
      eventType,
      eventDate,
      eventVenue,
      venue,
      guestsCount,
      guestCount,
      requirements,
      fullName,
      clientName,
      email,
      clientEmail,
      phone,
      clientPhone,
      selectedServices,
      packageId,
      notes,
      budgetRange,
      estimatedBudget,
      trackingId,
      eventTypeId,
      customEventDescription,
    } = body;

    const effectiveVenue = eventVenue || venue;
    const effectiveGuestsCount = parseInt(String(guestsCount || guestCount), 10);
    const effectiveClientName = clientName || fullName || authenticatedUser?.name || null;
    const effectiveClientEmail = clientEmail || email || authenticatedUser?.email || null;
    const effectiveClientPhone = clientPhone || phone || authenticatedUser?.phone || null;
    const effectiveUserId = authenticatedUser?.id || body.userId || null;

    if (!eventType || !eventDate || !effectiveVenue || isNaN(effectiveGuestsCount) || effectiveGuestsCount <= 0) {
      return NextResponse.json(
        { message: 'Event type, date, venue, and a valid guest count are required' },
        { status: 400 }
      );
    }

    const uniqueTrackingId = trackingId || (await generateTrackingId());

    const inquiry = await createInquiry({
      trackingId: uniqueTrackingId,
      userId: effectiveUserId,
      clientName: effectiveClientName,
      clientEmail: effectiveClientEmail,
      clientPhone: effectiveClientPhone,
      eventType,
      eventTypeId: eventTypeId ? parseInt(String(eventTypeId), 10) : null,
      customEventDescription: customEventDescription || null,
      eventDate,
      eventVenue: effectiveVenue,
      guestsCount: effectiveGuestsCount,
      requirements: requirements || notes || '',
      selectedServices: selectedServices || [],
      packageId: packageId || null,
      notes: notes || requirements || null,
      estimatedBudget: estimatedBudget || budgetRange || null,
      status: 'Pending Review',
    });

    return NextResponse.json({ success: true, trackingId: uniqueTrackingId, inquiry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
