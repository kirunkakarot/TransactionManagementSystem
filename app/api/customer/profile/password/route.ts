import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { checkAuth } from '@/lib/auth';
import { findFullUserById, updateUserPassword } from '@/models/userModel';

export async function PUT(req: Request) {
  const auth = await checkAuth(req);
  if (auth.error || !auth.user) {
    return auth.error || NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { message: 'Current password, new password, and confirmation are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { message: 'New password and confirmation password do not match.' },
        { status: 400 }
      );
    }

    const fullUser = await findFullUserById(auth.user.id);
    if (!fullUser) {
      return NextResponse.json({ message: 'User account not found.' }, { status: 404 });
    }

    if (!fullUser.password) {
      return NextResponse.json({ message: 'This account uses Google Sign-In and does not have a local password to change.' }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(currentPassword, fullUser.password as string);
    if (!isMatch) {
      return NextResponse.json(
        { message: 'Incorrect current password. Please verify and try again.' },
        { status: 400 }
      );
    }

    const isSameAsOld = await bcrypt.compare(newPassword, fullUser.password as string);
    if (isSameAsOld) {
      return NextResponse.json(
        { message: 'New password cannot be the same as your current password.' },
        { status: 400 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await updateUserPassword(auth.user.id, hashedPassword);

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error: any) {
    console.error('Error changing password:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
