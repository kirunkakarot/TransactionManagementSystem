import { NextResponse } from 'next/server';
import { getQuotationById, acceptQuotation } from '../../../../../models/quotationModel';
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
      return NextResponse.json({ message: 'Not authorized to accept this quotation' }, { status: 403 });
    }

    if (quotation.status === 'Accepted' || quotation.status === 'Deposit Paid' || quotation.status === 'Confirmed') {
      return NextResponse.json({
        success: true,
        message: 'Quotation has already been accepted.',
        quotation,
      });
    }

    if (quotation.status === 'Cancelled' || quotation.status === 'Expired' || quotation.status === 'Declined') {
      return NextResponse.json(
        { message: `Cannot accept a ${quotation.status.toLowerCase()} quotation.` },
        { status: 400 }
      );
    }

    const accepted = await acceptQuotation(quotation.id);
    return NextResponse.json({ success: true, quotation: accepted });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
