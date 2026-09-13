import { NextResponse } from 'next/server';
import { verifyPaymentTransaction } from '../../../../../models/paymentModel';
import { checkAuth } from '../../../../../lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleVerify(req, params);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleVerify(req, params);
}

async function handleVerify(req: Request, params: Promise<{ id: string }>) {
  const auth = await checkAuth(req, true); // Only admin can verify payments
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const verifiedBy = auth.user.name || 'Finance Administrator';
    const updated = await verifyPaymentTransaction(id, verifiedBy);

    if (!updated) {
      return NextResponse.json({ message: 'Payment transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and marked in ledger',
      payment: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
