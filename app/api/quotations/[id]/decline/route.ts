import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const auth = await checkAuth(req, false);
    if (auth.error) {
      return auth.error;
    }
    const user = auth.user;

    const quotationId = parseInt(resolvedParams.id, 10);
    if (isNaN(quotationId)) {
      // It might be a string reference
      const quotation = await prisma.quotation.findFirst({
        where: {
          OR: [
            { quotationRef: resolvedParams.id },
            { id: isNaN(parseInt(resolvedParams.id)) ? -1 : parseInt(resolvedParams.id) }
          ]
        }
      });
      if (!quotation) {
        return NextResponse.json({ message: 'Quotation not found' }, { status: 404 });
      }
      return processDecline(quotation.id, user, req);
    }

    return processDecline(quotationId, user, req);
  } catch (error: any) {
    console.error('Error declining quotation:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

async function processDecline(quotationId: number, user: any, req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Customer declined quotation';

    // Verify ownership (or Admin)
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { inquiry: true }
    });

    if (!quotation) {
      return NextResponse.json({ message: 'Quotation not found' }, { status: 404 });
    }

    const userEmail = (user.email || '').trim().toLowerCase();
    const qEmail = (quotation.clientEmail || '').trim().toLowerCase();
    const inqEmail = (quotation.inquiry?.clientEmail || '').trim().toLowerCase();

    const isOwner =
      (quotation.userId && quotation.userId === user.id) ||
      (qEmail && qEmail === userEmail) ||
      (quotation.inquiry?.userId && quotation.inquiry.userId === user.id) ||
      (inqEmail && inqEmail === userEmail);

    if (user.role !== 'Administrator' && !isOwner) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (quotation.status === 'Declined') {
      return NextResponse.json({ message: 'Quotation is already declined' }, { status: 400 });
    }

    const nonDeclinableStatuses = ['Confirmed', 'Deposit Paid', 'Cancelled', 'Expired'];
    if (nonDeclinableStatuses.includes(quotation.status)) {
      return NextResponse.json(
        { message: `Cannot decline a quotation with status: ${quotation.status}` },
        { status: 400 }
      );
    }

    // Update Quotation
    const updatedQuotation = await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: 'Declined',
        notes: quotation.notes ? `${quotation.notes}\n\nDeclined Reason: ${reason}` : `Declined Reason: ${reason}`,
        updatedAt: new Date(),
      }
    });

    // Cancel associated Inquiry
    if (quotation.inquiryId) {
      await prisma.inquiry.update({
        where: { id: quotation.inquiryId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: user.name || user.email || 'System',
          cancellationReason: reason,
        }
      });
    }

    return NextResponse.json({
      message: 'Quotation declined and inquiry cancelled successfully',
      quotation: updatedQuotation
    });
  } catch (error: any) {
    console.error('Error processing decline:', error);
    return NextResponse.json({ message: 'Failed to process decline' }, { status: 500 });
  }
}
