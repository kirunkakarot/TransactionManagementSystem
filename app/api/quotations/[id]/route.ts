import { NextResponse } from 'next/server';
import { getQuotationById, updateQuotation, deleteQuotation } from '../../../../models/quotationModel';
import { checkAuth } from '../../../../lib/auth';

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
    if (auth.user.role !== 'Administrator' && quotation.clientEmail !== auth.user.email) {
      return NextResponse.json({ message: 'Not authorized to view this quotation' }, { status: 403 });
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
    const updated = await updateQuotation(id, body);
    if (!updated) {
      return NextResponse.json({ message: 'Quotation not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
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
