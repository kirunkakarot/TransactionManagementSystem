import { NextResponse } from 'next/server';
import { rejectPaymentTransaction } from '../../../../../models/paymentModel';
import { checkAuth } from '../../../../../lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleReject(req, params);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleReject(req, params);
}

async function handleReject(req: Request, params: Promise<{ id: string }>) {
  const auth = await checkAuth(req, true); // Only admin can reject payments
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const rejectionReason = body.reason || body.rejectionReason || 'Invalid proof of payment or unverified bank/remittance transaction';
    const rejectedBy = auth.user.name || 'Finance Administrator';

    const updated = await rejectPaymentTransaction(id, rejectedBy, rejectionReason);

    if (!updated) {
      return NextResponse.json({ message: 'Payment transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment proof rejected and marked in audit ledger',
      payment: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 400 });
  }
}
