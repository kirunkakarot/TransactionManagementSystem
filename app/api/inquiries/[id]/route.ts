import { NextResponse } from 'next/server';
import { getInquiryById, updateInquiryStatus, deleteInquiry } from '../../../../models/inquiryModel';
import { checkAuth } from '../../../../lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const inquiry = await getInquiryById(id);

    if (!inquiry) {
      return NextResponse.json({ message: 'Inquiry not found' }, { status: 404 });
    }

    // Role-based customer isolation: Customer can only view their own inquiry
    const isCustomer = auth.user.role !== 'Administrator';
    if (isCustomer && inquiry.clientEmail !== auth.user.email && inquiry.userId !== auth.user.id) {
      return NextResponse.json({ message: 'Not authorized to view another customer\'s inquiry' }, { status: 403 });
    }

    return NextResponse.json(inquiry);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true); // Only admin can update inquiry status
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();
    if (!body.status) {
      return NextResponse.json({ message: 'Status is required' }, { status: 400 });
    }

    const updated = await updateInquiryStatus(id, body.status);
    if (!updated) {
      return NextResponse.json({ message: 'Inquiry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, inquiry: updated });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true); // Only admin can delete inquiry
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await deleteInquiry(id);
    return NextResponse.json({ message: 'Inquiry removed successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 400 });
  }
}

