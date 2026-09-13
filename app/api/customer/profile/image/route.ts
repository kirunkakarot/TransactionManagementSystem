import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { checkAuth } from '@/lib/auth';
import { updateUserProfile, findUserById } from '@/models/userModel';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  const auth = await checkAuth(req);
  if (auth.error || !auth.user) {
    return auth.error || NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No image file provided.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: 'Invalid file type. Only JPG, PNG, WEBP, and GIF images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: 'File size exceeds maximum limit of 5MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine extension
    let ext = '.png';
    if (file.type === 'image/jpeg') ext = '.jpg';
    else if (file.type === 'image/webp') ext = '.webp';
    else if (file.type === 'image/gif') ext = '.gif';

    const fileName = `avatar-${auth.user.id}-${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');

    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/avatars/${fileName}`;

    // Clean up previous local avatar if any
    const existingUser = await findUserById(auth.user.id);
    if (existingUser?.profileImage && existingUser.profileImage.startsWith('/uploads/avatars/')) {
      try {
        const oldFilePath = path.join(process.cwd(), 'public', existingUser.profileImage);
        await fs.unlink(oldFilePath);
      } catch (err) {
        // Ignore deletion error of non-existing old avatar
      }
    }

    const updatedUser = await updateUserProfile(auth.user.id, {
      profileImage: publicUrl
    });

    return NextResponse.json({
      success: true,
      message: 'Profile image updated successfully.',
      profileImage: publicUrl,
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await checkAuth(req);
  if (auth.error || !auth.user) {
    return auth.error || NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const existingUser = await findUserById(auth.user.id);
    if (existingUser?.profileImage && existingUser.profileImage.startsWith('/uploads/avatars/')) {
      try {
        const oldFilePath = path.join(process.cwd(), 'public', existingUser.profileImage);
        await fs.unlink(oldFilePath);
      } catch (err) {
        // Ignore if file doesn't exist
      }
    }

    const updatedUser = await updateUserProfile(auth.user.id, {
      profileImage: null
    });

    return NextResponse.json({
      success: true,
      message: 'Profile picture removed.',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Error removing profile picture:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
