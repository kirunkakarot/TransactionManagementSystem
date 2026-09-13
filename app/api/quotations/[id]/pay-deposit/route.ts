import { NextResponse } from 'next/server';
import { getQuotationById, payQuotationDeposit } from '../../../../../models/quotationModel';
import { createPaymentTransaction } from '../../../../../models/paymentModel';
import { checkAuth } from '../../../../../lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();
    const quotation = await getQuotationById(decodedId);
    if (!quotation) {
      return NextResponse.json({ message: 'Quotation not found' }, { status: 404 });
    }

    const userEmail = (auth.user.email || '').trim().toLowerCase();
    const qEmail = (quotation.clientEmail || '').trim().toLowerCase();
    const inqEmail = (quotation.inquiry?.clientEmail || '').trim().toLowerCase();

    const isOwner = (quotation.userId && quotation.userId === auth.user.id) ||
      (qEmail && qEmail === userEmail) ||
      (quotation.inquiry?.userId && quotation.inquiry.userId === auth.user.id) ||
      (inqEmail && inqEmail === userEmail);

    if (auth.user.role !== 'Administrator' && !isOwner) {
      return NextResponse.json({ message: 'Not authorized to submit payment for this quotation' }, { status: 403 });
    }

    if (quotation.status !== 'Accepted') {
      if (quotation.status === 'Draft' || quotation.status === 'Quotation Sent') {
        return NextResponse.json(
          { message: 'You must review and accept the official quotation before submitting the reservation downpayment.' },
          { status: 400 }
        );
      }
      if (quotation.status === 'Deposit Paid' || quotation.status === 'Confirmed') {
        return NextResponse.json({ message: 'Reservation downpayment has already been settled for this quotation.' }, { status: 409 });
      }
      if (quotation.status === 'Cancelled' || quotation.status === 'Expired' || quotation.status === 'Declined') {
        return NextResponse.json({ message: `Cannot settle deposit on a ${quotation.status.toLowerCase()} quotation.` }, { status: 409 });
      }
    }

    let method = 'GCash QR / Bank Transfer';
    let referenceNumber = `REF-${Date.now().toString().slice(-6)}`;
    let proofUrl: string | null = null;
    let notes: string | null = null;
    let paidAmount = Number(quotation.requiredDownpayment);

    try {
      const body = await req.json();
      if (body.method) method = body.method;
      if (body.referenceNumber) referenceNumber = body.referenceNumber;
      if (body.proofUrl) proofUrl = body.proofUrl;
      if (body.notes) notes = body.notes;
      if (body.amount !== undefined) paidAmount = Number(body.amount);
    } catch {}

    const pendingPayments = quotation.payments?.filter((p: any) => p.status === 'Pending Verification' && !p.verified) || [];
    if (pendingPayments.length > 0) {
      return NextResponse.json({ message: 'A payment proof is already pending verification.' }, { status: 409 });
    }

    if (isNaN(paidAmount) || !Number.isFinite(paidAmount)) {
      return NextResponse.json({ message: 'Invalid payment amount.' }, { status: 400 });
    }
    if (paidAmount <= 0) {
      return NextResponse.json({ message: 'Payment amount must be greater than zero.' }, { status: 400 });
    }
    if (paidAmount < Number(quotation.requiredDownpayment)) {
      return NextResponse.json({ message: 'Payment amount must satisfy the required downpayment.' }, { status: 400 });
    }

    const isAdmin = auth.user.role === 'Administrator';

    // Create payment transaction in database (verified only if submitted by admin, otherwise Pending Verification)
    const paymentRecord = await createPaymentTransaction({
      bookingId: (quotation.bookings && quotation.bookings.length > 0) ? quotation.bookings[0].id : null,
      quotationId: quotation.id,
      clientName: quotation.clientName,
      clientEmail: quotation.clientEmail,
      type: 'Downpayment (50%)',
      amount: paidAmount,
      method,
      referenceNumber,
      verified: isAdmin,
      verifiedBy: isAdmin ? (auth.user.name || 'Admin Director') : null,
      status: isAdmin ? 'Verified' : 'Pending Verification',
      proofUrl,
      notes: notes || `External 50% reservation deposit proof submitted for quotation #${quotation.quotationRef}`,
    });

    let updatedQuotation: any = quotation;
    if (isAdmin) {
      // Update quotation status in database directly if verified by admin
      updatedQuotation = (await payQuotationDeposit(quotation.id)) || quotation;
    }

    return NextResponse.json({
      success: true,
      message: isAdmin
        ? '50% Reservation Downpayment verified and recorded in ledger'
        : 'Payment proof submitted successfully. Pending administrator verification.',
      payment: paymentRecord,
      quotation: updatedQuotation,
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
