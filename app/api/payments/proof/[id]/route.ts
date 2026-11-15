import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  extractSafeProofFilename,
  isUnattachedProofTimestampFresh,
  MIME_MAP,
  parseAndVerifyProofFilename,
  readPaymentProofBuffer,
} from '@/lib/paymentProofStorage';
import path from 'path';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 1. Authenticate user
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { id: rawFilename } = await params;
    if (!rawFilename) {
      return NextResponse.json({ message: 'Filename required' }, { status: 400 });
    }

    // 2. Strict Path Traversal & Filename Validation
    const safeFilename = extractSafeProofFilename(rawFilename);
    if (!safeFilename) {
      return NextResponse.json({ message: 'Invalid file requested' }, { status: 400 });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    if (!MIME_MAP[ext]) {
      return NextResponse.json({ message: 'Unsupported file format' }, { status: 400 });
    }

    // 3. Authorization Check (Performed strictly before retrieving file content)
    const userRole = auth.user.role;
    const userEmail = (auth.user.email || '').trim().toLowerCase();
    const userId = Number(auth.user.id);

    // Administrators and Staff are authorized to review payment proofs
    if (userRole !== 'Administrator' && userRole !== 'Staff') {
      const parsed = parseAndVerifyProofFilename(safeFilename);

      // Look up payment transactions containing this filename
      const payments = await prisma.paymentTransaction.findMany({
        where: {
          proofUrl: {
            contains: safeFilename,
          },
        },
        include: {
          booking: {
            select: {
              userId: true,
              clientEmail: true,
            },
          },
          quotation: {
            select: {
              userId: true,
              clientEmail: true,
            },
          },
        },
      });

      if (payments.length > 0) {
        const isAuthorized = payments.some((p: any) => {
          const pClientEmail = (p.clientEmail || '').trim().toLowerCase();
          const bookingUserMatch =
            p.booking &&
            (p.booking.userId === userId ||
              (p.booking.clientEmail && p.booking.clientEmail.trim().toLowerCase() === userEmail));
          const quotationUserMatch =
            p.quotation &&
            (p.quotation.userId === userId ||
              (p.quotation.clientEmail && p.quotation.clientEmail.trim().toLowerCase() === userEmail));
          return pClientEmail === userEmail || bookingUserMatch || quotationUserMatch;
        });

        if (!isAuthorized) {
          return NextResponse.json(
            { message: "Forbidden: You are not authorized to view another customer's payment proof." },
            { status: 403 }
          );
        }
      } else {
        // File is not yet attached to a PaymentTransaction (previewing right after upload before submitting)
        if (parsed && parsed.isSigned) {
          if (!parsed.signatureValid || parsed.ownerUserId !== userId) {
            return NextResponse.json(
              { message: "Forbidden: You are not authorized to access another customer's payment proof." },
              { status: 403 }
            );
          }
          if (!isUnattachedProofTimestampFresh(parsed.timestamp)) {
            return NextResponse.json(
              { message: 'Forbidden: Temporary payment proof upload has expired.' },
              { status: 403 }
            );
          }
        } else {
          return NextResponse.json(
            { message: 'Forbidden: Payment proof not accessible.' },
            { status: 403 }
          );
        }
      }
    }

    // 4. Retrieve File from Private Storage or Vercel Blob Mirror (validates binary image signature)
    const stored = await readPaymentProofBuffer(safeFilename);
    if (!stored) {
      return NextResponse.json({ message: 'Payment proof file not found' }, { status: 404 });
    }

    // 5. Stream Secure Image Response with Validated Content-Type & Safe Private Headers
    const bodyUint8 = new Uint8Array(stored.buffer);

    return new NextResponse(bodyUint8, {
      status: 200,
      headers: {
        'Content-Type': stored.contentType,
        'Content-Length': stored.buffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `inline; filename="${safeFilename}"`,
      },
    });
  } catch (error: any) {
    console.error('Payment proof retrieval error:', error?.message || error);
    return NextResponse.json(
      { message: 'Failed to retrieve payment proof.' },
      { status: 500 }
    );
  }
}
