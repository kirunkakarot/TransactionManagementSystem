import { NextResponse } from 'next/server';
import { getQuotations, createQuotation } from '../../../models/quotationModel';
import { checkAuth } from '../../../lib/auth';

export async function GET(req: Request) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';

    // If user is Customer, filter by their email
    const isCustomer = auth.user.role !== 'Administrator';
    const effectiveSearch = isCustomer ? auth.user.email : search;

    const data = await getQuotations(limit, offset, effectiveSearch);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await checkAuth(req, true); // Only admin creates official quotations
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    if (!body.clientName || !body.clientEmail || !body.eventType || !body.eventDate || !body.venue) {
      return NextResponse.json(
        { message: 'Client name, email, event type, date, and venue are required' },
        { status: 400 }
      );
    }

    const quotation = await createQuotation({
      quotationRef: body.quotationRef,
      inquiryId: body.inquiryId,
      userId: body.userId,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      clientPhone: body.clientPhone,
      eventType: body.eventType,
      eventDate: body.eventDate,
      venue: body.venue,
      guestCount: body.guestCount,
      items: body.items || [],
      subtotal: body.subtotal || 0,
      discounts: body.discounts || [],
      additionalCharges: body.additionalCharges || [],
      grandTotal: body.grandTotal || 0,
      requiredDownpayment: body.requiredDownpayment || (body.grandTotal * 0.5),
      validUntil: body.validUntil,
      validityDays: body.validityDays,
      status: body.status || 'Quotation Sent',
      notes: body.notes,
      terms: body.terms,
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
