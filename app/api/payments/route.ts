import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getPayments, createPaymentTransaction } from '../../../models/paymentModel';
import { checkAuth } from '../../../lib/auth';
import { verifyPaymentProofForCustomerSubmission } from '../../../lib/paymentProofStorage';

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
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
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

    // Retrieve target booking by integer ID or bookingRef string (including all payments)
    let booking = null;
    const parsedBookingId = Number(body.bookingId);
    if (!isNaN(parsedBookingId)) {
      booking = await prisma.booking.findUnique({
        where: { id: parsedBookingId },
        include: {
          quotation: true,
          payments: true,
        },
      });
    }

    if (!booking && typeof body.bookingId === 'string') {
      booking = await prisma.booking.findUnique({
        where: { bookingRef: body.bookingId },
        include: {
          quotation: true,
          payments: true,
        },
      });
    }

    if (!booking) {
      return NextResponse.json({ message: 'Target booking not found' }, { status: 404 });
    }

    // Customer can only pay for their own booking
    const userEmail = (auth.user.email || '').trim().toLowerCase();
    const bookingEmail = (booking.clientEmail || '').trim().toLowerCase();
    if (isCustomer && bookingEmail !== userEmail && booking.userId !== auth.user.id) {
      return NextResponse.json(
        { message: "Not authorized to submit payment for another customer's booking" },
        { status: 403 }
      );
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

    const verifiedPayments = booking.payments.filter((p: any) => p.verified);
    const verifiedTotal = verifiedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const remainingBalance = Math.max(0, Number(booking.totalAmount) - verifiedTotal);

    let finalProofUrl: string | null =
      typeof body.proofUrl === 'string' && body.proofUrl.trim() ? body.proofUrl.trim() : null;

    if (isCustomer) {
      if (!body.referenceNumber || !String(body.referenceNumber).trim()) {
        return NextResponse.json(
          { message: 'Payment reference or transaction trace number is required.' },
          { status: 400 }
        );
      }

      if (remainingBalance === 0 && verifiedTotal > 0) {
        return NextResponse.json(
          { message: 'This booking has already been fully paid and settled in full.' },
          { status: 409 }
        );
      }

      if (paymentAmount > remainingBalance && remainingBalance > 0) {
        return NextResponse.json(
          {
            message: `Payment amount (₱${paymentAmount.toLocaleString()}) exceeds remaining booking balance (₱${remainingBalance.toLocaleString()}).`,
          },
          { status: 400 }
        );
      }

      // Prevent duplicate pending verification payment on the same booking
      const existingPending = booking.payments.find(
        (p: any) => !p.verified && p.status === 'Pending Verification'
      );
      if (existingPending) {
        return NextResponse.json(
          { message: 'A payment proof is already pending verification for this booking.' },
          { status: 409 }
        );
      }

      // Prevent duplicate downpayment
      if (body.type.includes('Downpayment')) {
        const existingDownpayment = verifiedPayments.find((p: any) => p.type.includes('Downpayment'));
        if (existingDownpayment) {
          return NextResponse.json(
            { message: 'A verified downpayment already exists for this booking.' },
            { status: 409 }
          );
        }
      }

      // Mandatory Payment Proof Image Verification for Customer Submissions
      const proofVerification = await verifyPaymentProofForCustomerSubmission({
        proofUrl: body.proofUrl,
        userId: Number(auth.user.id),
        userEmail: auth.user.email || '',
      });

      if (!proofVerification.valid || !proofVerification.canonicalProofUrl) {
        return NextResponse.json(
          { message: proofVerification.message || 'Valid payment proof image is required.' },
          { status: proofVerification.status || 400 }
        );
      }

      finalProofUrl = proofVerification.canonicalProofUrl;
    }

    const isVerified = isCustomer ? false : body.verified !== undefined ? Boolean(body.verified) : true;

    const payment = await createPaymentTransaction({
      bookingId: booking.id,
      quotationId: booking.quotationId,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      type: body.type,
      amount: paymentAmount,
      method: body.method || 'GCash QR',
      referenceNumber: body.referenceNumber
        ? String(body.referenceNumber).trim()
        : `REF-${Date.now().toString().slice(-6)}`,
      date: body.date || new Date(),
      verified: isVerified,
      verifiedBy: isVerified ? auth.user.name || 'Operations Lead' : null,
      proofUrl: finalProofUrl,
      notes: body.notes || null,
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    // Note: Do NOT delete the uploaded proof file on payment creation failure so the customer can retry
    // without losing their uploaded proof and no concurrent transaction's file is removed.
    const msg = String(error?.message || '');
    const isConflict =
      msg.startsWith('Conflict:') ||
      msg.includes('conflict') ||
      msg.includes('occupied') ||
      msg.includes('accommodate');
    if (isConflict) {
      return NextResponse.json(
        { message: msg.replace(/^Conflict:\s*/, '') },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: 'Unable to record payment transaction due to a server error.' },
      { status: 500 }
    );
  }
}
