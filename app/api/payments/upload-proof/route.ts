import { NextResponse } from 'next/server';
import { checkAuth } from '../../../../lib/auth';
import {
  cleanupOrphanedPaymentProof,
  generateOwnedProofFilename,
  storePaymentProofBuffer,
  validatePaymentProofFileInput,
} from '../../../../lib/paymentProofStorage';

export async function POST(req: Request) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const formData = await req.formData();
    const file = formData.get('proof') as File | null;
    const previousProofUrl = formData.get('replaceProofUrl') as string | null;

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json(
        { message: 'No payment proof image file provided in request.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const validation = validatePaymentProofFileInput({
      fileName: file.name || '',
      mimeType: file.type || '',
      size: file.size,
      buffer,
    });

    if (!validation.valid || !validation.canonicalExtension || !validation.canonicalMimeType) {
      return NextResponse.json(
        { message: validation.message || 'Invalid payment proof image.' },
        { status: 400 }
      );
    }

    // Generate safe unique filename cryptographically bound to the authenticated user
    const safeFilename = generateOwnedProofFilename(Number(auth.user.id), validation.canonicalExtension);

    const stored = await storePaymentProofBuffer(
      safeFilename,
      buffer,
      validation.canonicalMimeType
    );

    // If replacing a temporary unsubmitted upload from the same user, clean up the abandoned file safely
    if (previousProofUrl && typeof previousProofUrl === 'string') {
      await cleanupOrphanedPaymentProof(previousProofUrl, Number(auth.user.id));
    }

    return NextResponse.json({
      success: true,
      message: 'Payment proof screenshot uploaded and verified.',
      proofUrl: stored.proofUrl,
      fileName: stored.fileName,
      originalFileName: file.name,
      fileSize: stored.fileSize,
      mimeType: validation.canonicalMimeType,
    });
  } catch (error: any) {
    console.error('Payment proof upload error:', error?.message || error);
    return NextResponse.json(
      { message: 'Failed to store payment proof image. Please try uploading again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const proofUrl = body?.proofUrl;
    if (!proofUrl || typeof proofUrl !== 'string') {
      return NextResponse.json({ message: 'proofUrl is required' }, { status: 400 });
    }

    const cleaned = await cleanupOrphanedPaymentProof(proofUrl, Number(auth.user.id));
    return NextResponse.json({ success: true, cleaned });
  } catch (error: any) {
    console.error('Temporary proof cleanup error:', error?.message || error);
    return NextResponse.json(
      { message: 'Failed to clean up temporary upload.' },
      { status: 500 }
    );
  }
}
