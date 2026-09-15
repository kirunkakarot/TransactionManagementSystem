import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getInquiryById, cancelInquiry } from '@/models/inquiryModel';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuth(req);
  if (auth.error || !auth.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || undefined;

    const inquiry = await getInquiryById(id);
    if (!inquiry) {
      return NextResponse.json({ message: 'Inquiry not found' }, { status: 404 });
    }

    // Ownership validation (MUST be customer's inquiry)
    // The user either owns it by userId or email. Admin roles can potentially cancel, but this is a customer cancellation endpoint.
    const isOwner = inquiry.userId === auth.user.id || inquiry.clientEmail?.toLowerCase() === auth.user.email.toLowerCase();
    
    // Only allow customers to cancel their own inquiry. Allow admins/staff if they hit this endpoint.
    if (!isOwner && auth.user.role === 'Customer') {
       return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Status validation
    if (inquiry.status !== 'Pending Review') {
       return NextResponse.json({ message: 'Only Pending Review inquiries can be cancelled' }, { status: 409 });
    }

    const updated = await cancelInquiry(inquiry.id, reason, auth.user.role || 'Customer');
    
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Cancel inquiry error:', error);
    return NextResponse.json(
      { message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
