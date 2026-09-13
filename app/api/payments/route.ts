import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getPayments, createPaymentTransaction } from '../../../models/paymentModel';
import { checkAuth } from '../../../lib/auth';

export async function GET(req: Request) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';

    const isCustomer = auth.user.role !== 'Administrator';
    const effectiveSearch = isCustomer ? auth.user.email : search;

    const data = await getPayments(limit, offset, effectiveSearch);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    if (!body.bookingId || !body.type) {
      return NextResponse.json(
        { message: 'Booking ID and payment type are required' },
        { status: 400 }
      );
    }

    const isCustomer = auth.user.role !== 'Administrator';

    // Retrieve target booking by integer ID or bookingRef string
    let booking = null;
    const parsedBookingId = Number(body.bookingId);
    if (!isNaN(parsedBookingId)) {
      booking = await prisma.booking.findUnique({
        where: { id: parsedBookingId },
        include: {
          quotation: true,
          payments: { where: { verified: true } },
        },
      });
    }

    if (!booking && typeof body.bookingId === 'string') {
      booking = await prisma.booking.findUnique({
        where: { bookingRef: body.bookingId },
        include: {
          quotation: true,
          payments: { where: { verified: true } },
        },
      });
    }

    if (!booking) {
      return NextResponse.json({ message: 'Target booking not found' }, { status: 404 });
    }

    // Customer can only pay for their own booking
    if (isCustomer && booking.clientEmail !== auth.user.email && booking.userId !== auth.user.id) {
      return NextResponse.json({ message: 'Not authorized to submit payment for another customer\'s booking' }, { status: 403 });
    }

    if (body.amount !== undefined && (isNaN(Number(body.amount)) || Number(body.amount) <= 0)) {
      return NextResponse.json({ message: 'Payment amount must be greater than zero.' }, { status: 400 });
    }

    // Server-enforced amounts and verification rules
    let paymentAmount = Number(body.amount);
    if (isCustomer) {
      // If customer is submitting a downpayment, server enforces 50% required deposit
      if (body.type.includes('Downpayment') && booking.quotation) {
        paymentAmount = Number(booking.quotation.requiredDownpayment);
      } else if (body.amount === undefined) {
        paymentAmount = Number(booking.totalAmount) * 0.5;
      }
    }

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json({ message: 'Payment amount must be greater than zero.' }, { status: 400 });
    }

    const verifiedTotal = booking.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const remainingBalance = Math.max(0, Number(booking.totalAmount) - verifiedTotal);

    if (isCustomer) {
      if (remainingBalance === 0 && verifiedTotal > 0) {
        return NextResponse.json({ message: 'This booking has already been fully paid and settled in full.' }, { status: 409 });
      }

      if (paymentAmount > remainingBalance && remainingBalance > 0) {
        return NextResponse.json({
          message: `Payment amount (₱${paymentAmount.toLocaleString()}) exceeds remaining booking balance (₱${remainingBalance.toLocaleString()}).`
        }, { status: 400 });
      }

      // Prevent duplicate downpayment
      if (body.type.includes('Downpayment')) {
        const existingDownpayment = booking.payments.find((p: any) => p.type.includes('Downpayment'));
        if (existingDownpayment) {
          return NextResponse.json({ message: 'A verified downpayment already exists for this booking.' }, { status: 409 });
        }
      }
    }

    const isVerified = isCustomer ? false : (body.verified !== undefined ? Boolean(body.verified) : true);

    const payment = await createPaymentTransaction({
      bookingId: booking.id,
      quotationId: booking.quotationId,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      type: body.type,
      amount: paymentAmount,
      method: body.method || 'GCash QR',
      referenceNumber: body.referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
      date: body.date || new Date(),
      verified: isVerified,
      verifiedBy: isVerified ? (auth.user.name || 'Operations Lead') : null,
      proofUrl: body.proofUrl || null,
      notes: body.notes || null,
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
