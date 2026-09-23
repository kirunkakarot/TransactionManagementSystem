import { NextResponse } from 'next/server';
import { updateInquiryClassification } from '../../../../../models/inquiryModel';
import { checkAuth } from '../../../../../lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true); // Only admin can classify
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const { eventTypeId, eventTypeName } = body;

    if (!eventTypeId || !eventTypeName) {
      return NextResponse.json({ message: 'Event type ID and name are required' }, { status: 400 });
    }

    const updated = await updateInquiryClassification(id, eventTypeId, eventTypeName);
    if (!updated) {
      return NextResponse.json({ message: 'Inquiry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, inquiry: updated });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
