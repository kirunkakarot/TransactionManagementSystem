import { NextResponse } from 'next/server';
import { getPaymentById, deletePaymentTransaction } from '../../../../models/paymentModel';
import { checkAuth } from '../../../../lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const payment = await getPaymentById(id);
    if (!payment) {
      return NextResponse.json({ message: 'Payment transaction not found' }, { status: 404 });
    }

    if (auth.user.role !== 'Administrator' && payment.clientEmail !== auth.user.email) {
      return NextResponse.json({ message: 'Not authorized to view another customer\'s payment' }, { status: 403 });
    }

    return NextResponse.json(payment);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(req, true); // Only admin can delete payments
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await deletePaymentTransaction(id);
    return NextResponse.json({ message: 'Payment record removed successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 400 });
  }
}
