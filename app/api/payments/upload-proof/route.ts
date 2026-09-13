import { NextResponse } from 'next/server';
import { checkAuth } from '../../../../lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  const auth = await checkAuth(req, false);
  if (auth.error) return auth.error;

  try {
    const formData = await req.formData();
    const file = formData.get('proof') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No proof file provided in request' }, { status: 400 });
    }

    // 1. File Size Validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: `File size exceeds the 5MB limit (File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB)` },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ message: 'Cannot upload an empty file' }, { status: 400 });
    }

    // 2. MIME Type Validation
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { message: 'Invalid file format. Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    // 3. Extension Validation
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { message: 'Invalid file extension. Allowed extensions are .jpg, .jpeg, .png, .webp' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Magic Bytes Validation
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isRiffWebp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    if (!isJpeg && !isPng && !isRiffWebp) {
      return NextResponse.json(
        { message: 'File contents do not match a valid image signature. Upload rejected for security.' },
        { status: 400 }
      );
    }

    // 5. Generate Safe Unique Filename
    const randomName = `${Date.now()}_${crypto.randomBytes(12).toString('hex')}${ext}`;
    const storageDir = path.join(process.cwd(), 'storage', 'payments');
    await mkdir(storageDir, { recursive: true });

    const filePath = path.join(storageDir, randomName);
    await writeFile(filePath, buffer);

    const secureProofUrl = `/api/payments/proof/${randomName}`;

    return NextResponse.json({
      success: true,
      message: 'Payment proof screenshot uploaded successfully. Pending administrator verification.',
      proofUrl: secureProofUrl,
      fileName: randomName,
      fileSize: file.size,
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Upload processing failed', error: error.message }, { status: 500 });
  }
}
