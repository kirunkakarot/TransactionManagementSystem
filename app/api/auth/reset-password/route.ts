import { NextResponse } from 'next/server';
import { validatePasswordResetToken, consumePasswordResetToken, checkRateLimit } from '@/models/passwordResetModel';

/**
 * GET /api/auth/reset-password?token=...
 * Validates whether a token is still valid before the user types a new password.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, message: 'Reset token is required.' }, { status: 400 });
    }

    const result = await validatePasswordResetToken(token);

    if (!result.valid) {
      return NextResponse.json({ valid: false, message: result.reason }, { status: 400 });
    }

    // Return sanitized status without exposing internal IDs or sensitive details
    return NextResponse.json({
      valid: true,
      email: result.user ? result.user.email.replace(/(.{2})(.*)(?=@)/, (_gp, a, b) => a + '*'.repeat(b.length)) : undefined,
    });
  } catch (error: any) {
    console.error('Error validating reset token:', error);
    return NextResponse.json({ valid: false, message: 'Server error validating token.' }, { status: 500 });
  }
}

/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword, confirmPassword }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, newPassword, confirmPassword } = body;

    // Rate-limit reset attempts by IP to defend against brute force
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown-ip';

    const limit = checkRateLimit(`reset-pw:ip:${ip}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { message: 'Too many password reset attempts. Please wait before trying again.' },
        { status: 429 }
      );
    }

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ message: 'A valid reset token is required.' }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ message: 'New password is required.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ message: 'Passwords do not match.' }, { status: 400 });
    }

    // Strict password policy validation:
    // Minimum 8 characters, at least one uppercase, one lowercase, one number
    if (newPassword.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasDigit) {
      return NextResponse.json(
        { message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number.' },
        { status: 400 }
      );
    }

    // Consume token and update password (role is NEVER modified)
    await consumePasswordResetToken(token, newPassword);

    return NextResponse.json({
      success: true,
      message: 'Password has been successfully reset. You can now sign in with your new password.',
    });
  } catch (error: any) {
    console.error('Error resetting password:', error?.message || error);
    const errorMsg = error?.message || 'Failed to reset password. The link may have expired or already been used.';
    return NextResponse.json(
      { message: errorMsg },
      { status: 400 }
    );
  }
}
