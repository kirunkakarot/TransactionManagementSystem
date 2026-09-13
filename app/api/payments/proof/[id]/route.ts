import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import path from 'path';

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 1. Authenticate user
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const { id: rawFilename } = await params;
    if (!rawFilename) {
      return NextResponse.json({ message: 'Filename required' }, { status: 400 });
    }

    // 2. Strict Path Traversal Prevention
    const safeFilename = path.basename(decodeURIComponent(rawFilename)).trim();
    if (
      !safeFilename ||
      safeFilename.includes('..') ||
      safeFilename.includes('/') ||
      safeFilename.includes('\\')
    ) {
      return NextResponse.json({ message: 'Invalid file requested' }, { status: 400 });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = MIME_MAP[ext];
    if (!contentType) {
      return NextResponse.json({ message: 'Unsupported file format' }, { status: 400 });
    }

    // 3. Authorization Check
    const userRole = auth.user.role;
    const userEmail = (auth.user.email || '').trim().toLowerCase();
    const userId = auth.user.id;

    // Administrators and Staff are authorized to review payment proofs
    if (userRole !== 'Administrator' && userRole !== 'Staff') {
      // Customer: MUST only access their own payment proof
      // Look up payment transaction containing this filename
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
        // Must match at least one payment where customer is owner
        const isAuthorized = payments.some((p: any) => {
          const pClientEmail = (p.clientEmail || '').trim().toLowerCase();
          const bookingUserMatch = p.booking && (p.booking.userId === userId || (p.booking.clientEmail && p.booking.clientEmail.trim().toLowerCase() === userEmail));
          const quotationUserMatch = p.quotation && (p.quotation.userId === userId || (p.quotation.clientEmail && p.quotation.clientEmail.trim().toLowerCase() === userEmail));
          return pClientEmail === userEmail || bookingUserMatch || quotationUserMatch;
        });

        if (!isAuthorized) {
          return NextResponse.json(
            { message: 'Forbidden: You are not authorized to view another customer\'s payment proof.' },
            { status: 403 }
          );
        }
      } else {
        // If file is not yet linked to a payment transaction (e.g. freshly uploaded proof within 1 hour before form submit),
        // verify if the file timestamp prefix was created recently (anti-enumeration) or reject.
        // Filename format: ${Date.now()}_${randomHex}.${ext}
        const timePrefix = parseInt(safeFilename.split('_')[0], 10);
        const now = Date.now();
        const isRecentlyUploaded = !isNaN(timePrefix) && (now - timePrefix) < 60 * 60 * 1000 && (now - timePrefix) > -5000;

        if (!isRecentlyUploaded) {
          return NextResponse.json(
            { message: 'Forbidden: Payment proof not accessible.' },
            { status: 403 }
          );
        }
      }
    }

    // 4. Retrieve File from Private Storage
    const storageFilePath = path.join(process.cwd(), 'storage', 'payments', safeFilename);

    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(storageFilePath);
    } catch {
      return NextResponse.json({ message: 'Payment proof file not found' }, { status: 404 });
    }

    // 5. Stream Secure Image Response with Safe Headers
    const bodyUint8 = new Uint8Array(fileBuffer);

    return new NextResponse(bodyUint8, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `inline; filename="${safeFilename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Failed to retrieve payment proof', error: error.message },
      { status: 500 }
    );
  }
}
