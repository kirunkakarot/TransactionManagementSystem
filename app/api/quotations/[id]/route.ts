import { NextResponse } from 'next/server';
import { getQuotationById, updateQuotation, deleteQuotation } from '../../../../models/quotationModel';
import { checkAuth } from '../../../../lib/auth';
import { validateEventTimeRange } from '../../../../lib/schedulingEngine';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const quotation = await getQuotationById(id);
    if (!quotation) {
      return NextResponse.json({ message: 'Quotation not found' }, { status: 404 });
    }

    // Customer can only view their own quotation
    if (auth.user.role !== 'Administrator') {
      const userEmail = (auth.user.email || '').trim().toLowerCase();
      const qEmail = (quotation.clientEmail || '').trim().toLowerCase();
      const inqEmail = (quotation.inquiry?.clientEmail || '').trim().toLowerCase();
      const isOwner =
        (quotation.userId && quotation.userId === auth.user.id) ||
        (userEmail && qEmail === userEmail) ||
        (quotation.inquiry?.userId && quotation.inquiry.userId === auth.user.id) ||
        (userEmail && inqEmail === userEmail);

      if (!isOwner) {
        return NextResponse.json({ message: 'Not authorized to view this quotation' }, { status: 403 });
      }
    }

    return NextResponse.json(quotation);
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();

    const rawStart = body.approvedStartTime ?? body.startTime;
    const rawEnd = body.approvedEndTime ?? body.endTime;
    if (rawStart !== undefined || rawEnd !== undefined) {
      const timeVal = validateEventTimeRange(rawStart, rawEnd, { required: false });
      if (!timeVal.valid) {
        return NextResponse.json(
          { message: timeVal.message || 'Invalid event time range.' },
          { status: 400 }
        );
      }
    }

    const updated = await updateQuotation(id, body);
    if (!updated) {
      return NextResponse.json({ message: 'Quotation not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    const isConflict = error.message && (
      error.message.includes('cancelled') ||
      error.message.includes('conflict') ||
      error.message.includes('occupied') ||
      error.message.includes('accommodate')
    );
    if (isConflict) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await deleteQuotation(id);
    return NextResponse.json({ message: 'Quotation removed successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 400 });
  }
}
