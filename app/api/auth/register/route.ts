import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByEmail, createUser } from '../../../../models/userModel';

const generateToken = (id: number | string, role: string = 'Customer') => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return jwt.sign({ id, role }, secret, {
    expiresIn: '30d',
  });
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, phone } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ message: 'Full name is required (minimum 2 characters)' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ message: 'A valid email address is required' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userExists = await findUserByEmail(normalizedEmail);
    if (userExists) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // SECURITY ENFORCEMENT:
    // Public registration MUST ALWAYS create 'Customer' accounts.
    // Client-supplied roles (ADMIN, STAFF, etc.) are explicitly discarded.
    const user = await createUser(name.trim(), normalizedEmail, hashedPassword, 'Customer', phone ? String(phone).trim() : undefined);

    if (user) {
      const token = generateToken(user.id, user.role || 'Customer');
      const response = NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'Customer',
        token,
      }, { status: 201 });

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
      return NextResponse.json({ message: 'Invalid user data' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Server error', error: message }, { status: 500 });
  }
}


