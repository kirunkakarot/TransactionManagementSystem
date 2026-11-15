import { NextResponse } from 'next/server';
import { getQuotationById, payQuotationDeposit } from '../../../../../models/quotationModel';
import { createPaymentTransaction } from '../../../../../models/paymentModel';
import { checkAuth } from '../../../../../lib/auth';
import { checkScheduleAvailability } from '../../../../../lib/schedulingEngine';
import { verifyPaymentProofForCustomerSubmission } from '../../../../../lib/paymentProofStorage';

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

    const isOwner =
      (quotation.userId && quotation.userId === auth.user.id) ||
      (qEmail && qEmail === userEmail) ||
      (quotation.inquiry?.userId && quotation.inquiry.userId === auth.user.id) ||
      (inqEmail && inqEmail === userEmail);

    const isAdmin = auth.user.role === 'Administrator';

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { message: 'Not authorized to submit payment for this quotation' },
        { status: 403 }
      );
    }

    if (quotation.status !== 'Accepted') {
      if (quotation.status === 'Draft' || quotation.status === 'Quotation Sent') {
        return NextResponse.json(
          {
            message:
              'You must review and accept the official quotation before submitting the reservation downpayment.',
          },
          { status: 400 }
        );
      }
      if (quotation.status === 'Deposit Paid' || quotation.status === 'Confirmed') {
        return NextResponse.json(
          { message: 'Reservation downpayment has already been settled for this quotation.' },
          { status: 409 }
        );
      }
      if (
        quotation.status === 'Cancelled' ||
        quotation.status === 'Expired' ||
        quotation.status === 'Declined'
      ) {
        return NextResponse.json(
          { message: `Cannot settle deposit on a ${quotation.status.toLowerCase()} quotation.` },
          { status: 409 }
        );
      }
    }

    let method = 'GCash QR / Bank Transfer';
    let referenceNumber = '';
    let rawProofUrl: unknown = null;
    let notes: string | null = null;
    let paidAmount = Number(quotation.requiredDownpayment);

    try {
      const body = await req.json();
      if (body.method) method = String(body.method).trim();
      if (body.referenceNumber !== undefined) referenceNumber = String(body.referenceNumber).trim();
      if (body.proofUrl !== undefined) rawProofUrl = body.proofUrl;
      if (body.notes) notes = String(body.notes).trim();
      if (body.amount !== undefined) paidAmount = Number(body.amount);
    } catch {}

    if (!isAdmin && !referenceNumber) {
      return NextResponse.json(
        { message: 'Payment reference or transaction trace number is required.' },
        { status: 400 }
      );
    }
    if (!referenceNumber) {
      referenceNumber = `REF-${Date.now().toString().slice(-6)}`;
    }

    const pendingPayments =
      quotation.payments?.filter((p: any) => p.status === 'Pending Verification' && !p.verified) || [];
    if (pendingPayments.length > 0) {
      return NextResponse.json(
        { message: 'A payment proof is already pending verification.' },
        { status: 409 }
      );
    }

    if (isNaN(paidAmount) || !Number.isFinite(paidAmount)) {
      return NextResponse.json({ message: 'Invalid payment amount.' }, { status: 400 });
    }
    if (paidAmount <= 0) {
      return NextResponse.json({ message: 'Payment amount must be greater than zero.' }, { status: 400 });
    }
    if (paidAmount < Number(quotation.requiredDownpayment)) {
      return NextResponse.json(
        { message: 'Payment amount must satisfy the required downpayment.' },
        { status: 400 }
      );
    }

    // Mandatory Payment Proof Image Verification for Customer Submissions
    let finalProofUrl: string | null =
      typeof rawProofUrl === 'string' && rawProofUrl.trim() ? rawProofUrl.trim() : null;
    if (!isAdmin) {
      const proofVerification = await verifyPaymentProofForCustomerSubmission({
        proofUrl: rawProofUrl,
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

    const ownBookingId =
      quotation.bookings && quotation.bookings.length > 0 ? quotation.bookings[0].id : null;

    const availability = await checkScheduleAvailability({
      eventDate: quotation.eventDate,
      excludeBookingId: ownBookingId,
    });
    if (!availability.isAvailable || availability.hasHighConflicts) {
      return NextResponse.json(
        {
          message:
            'Cannot submit reservation downpayment: The event date is already occupied by another booking. JAD Events can only accommodate one booking per day.',
        },
        { status: 409 }
      );
    }

    // Create payment transaction in database (atomic proof-consumption & duplicate-pending lock enforced inside transaction)
    const paymentRecord = await createPaymentTransaction({
      bookingId: ownBookingId,
      quotationId: quotation.id,
      clientName: quotation.clientName,
      clientEmail: quotation.clientEmail,
      type: 'Downpayment (50%)',
      amount: paidAmount,
      method,
      referenceNumber,
      verified: isAdmin,
      verifiedBy: isAdmin ? auth.user.name || 'Admin Director' : null,
      status: isAdmin ? 'Verified' : 'Pending Verification',
      proofUrl: finalProofUrl,
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
      { message: 'Unable to process payment submission due to a server error.' },
      { status: 500 }
    );
  }
}
