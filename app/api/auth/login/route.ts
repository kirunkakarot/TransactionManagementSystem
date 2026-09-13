import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByEmail } from '../../../../models/userModel';
import { checkRateLimit } from '../../../../models/passwordResetModel';

const generateToken = (id: number | string, role?: string | null) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return jwt.sign({ id, role: role || 'Customer' }, secret, {
    expiresIn: '30d',
  });
};

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip';
    const ipLimit = checkRateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { message: `Too many login attempts. Please try again in ${ipLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const { email, password } = await req.json();

    if (email) {
      const emailLimit = checkRateLimit(`login:email:${String(email).trim().toLowerCase()}`, 5, 15 * 60 * 1000);
      if (!emailLimit.allowed) {
        return NextResponse.json(
          { message: `Too many failed attempts for this account. Please try again in ${emailLimit.retryAfterSeconds} seconds.` },
          { status: 429 }
        );
      }
    }

    const user = await findUserByEmail(email);

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = generateToken(user.id, user.role);
      const response = NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      });

      response.cookies.set('token', token, {
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      response.cookies.set('jad_token', token, {
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });

      return response;
    } else {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Server error', error: message }, { status: 500 });
  }
}


