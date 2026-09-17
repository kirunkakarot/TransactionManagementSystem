import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const user = await checkAuth(req, false);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

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

    if (user.role === 'Customer' && quotation.userId !== user.id && quotation.clientEmail.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (quotation.status === 'Declined') {
      return NextResponse.json({ message: 'Quotation is already declined' }, { status: 400 });
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
          status: 'Cancelled',
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
