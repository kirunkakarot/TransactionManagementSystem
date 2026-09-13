import { NextResponse } from 'next/server';
import { findUserByEmail } from '@/models/userModel';
import { createPasswordResetToken, checkRateLimit } from '@/models/passwordResetModel';
import { sendPasswordResetEmail } from '@/lib/emailService';

// Generic response text to prevent email enumeration (OWASP recommendation)
const GENERIC_RESPONSE_MESSAGE = 'If an account with that email exists, a password reset link has been sent.';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = body?.email;

    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    const email = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Please provide a valid email address' }, { status: 400 });
    }

    // Client IP for rate-limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown-ip';

    // Rate-limit by IP (max 5 requests per 15 minutes)
    const ipLimit = checkRateLimit(`forgot-pw:ip:${ip}`, 5, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { 
          message: `Too many password reset requests from this network. Please try again in ${Math.ceil((ipLimit.retryAfterSeconds || 60) / 60)} minutes.`,
          retryAfter: ipLimit.retryAfterSeconds 
        },
        { status: 429 }
      );
    }

    // Rate-limit by target Email (max 3 requests per 15 minutes)
    const emailLimit = checkRateLimit(`forgot-pw:email:${email}`, 3, 15 * 60 * 1000);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { 
          message: `Too many password reset attempts for this email. Please try again in ${Math.ceil((emailLimit.retryAfterSeconds || 60) / 60)} minutes.`,
          retryAfter: emailLimit.retryAfterSeconds 
        },
        { status: 429 }
      );
    }

    // Lookup user by email
    const user = await findUserByEmail(email);

    // If user exists, create token and send reset email
    if (user) {
      const { rawToken } = await createPasswordResetToken(user.id);

      // Determine origin base URL
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

      const emailResult = await sendPasswordResetEmail({
        toEmail: user.email,
        recipientName: user.name,
        resetUrl,
        expiresInMinutes: 30,
      });

      if (!emailResult.success) {
        console.warn(`[FORGOT-PASSWORD] Warning: Email dispatch could not complete for ${user.email}: ${emailResult.error}`);
      }
    }

    // ALWAYS return the exact same generic message whether user was found or not
    return NextResponse.json({
      success: true,
      message: GENERIC_RESPONSE_MESSAGE,
    });
  } catch (error: any) {
    console.error('Error in /api/auth/forgot-password:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred while processing your request. Please try again later.' },
      { status: 500 }
    );
  }
}
