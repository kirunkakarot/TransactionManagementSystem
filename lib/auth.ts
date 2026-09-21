import { findUserById } from '../models/userModel';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export const checkAuth = async (req: Request, requireAdmin: boolean = false) => {
  let token;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)(?:jad_token|token)=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
  }

  if (!token) {
    return { error: NextResponse.json({ message: 'Not authorized, no token' }, { status: 401 }) };
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('CRITICAL: JWT_SECRET environment variable is missing.');
      return { error: NextResponse.json({ message: 'Server configuration error' }, { status: 500 }) };
    }
    const decoded = jwt.verify(token, secret) as { id: number | string; role?: string };
    const user = await findUserById(decoded.id);

    if (!user) {
      return { error: NextResponse.json({ message: 'Not authorized, user not found' }, { status: 401 }) };
    }

    if (requireAdmin && user.role !== 'Administrator') {
      return { error: NextResponse.json({ message: 'Not authorized as an Administrator' }, { status: 403 }) };
    }

    return { user };
  } catch {
    return { error: NextResponse.json({ message: 'Not authorized, token failed' }, { status: 401 }) };
  }
};

export const getOAuthRedirectUri = () => {
  // 1. Explicitly trusted configuration value (Highest Priority)
  if (process.env.GOOGLE_REDIRECT_URI) {
    if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_REDIRECT_URI.includes('localhost')) {
      console.warn('Security Warning: GOOGLE_REDIRECT_URI is set to localhost in a production environment. Ignoring to prevent OAuth mismatch.');
    } else {
      return process.env.GOOGLE_REDIRECT_URI;
    }
  }

  // 2. Vercel Preview/Branch URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/auth/google/callback`;
  }

  // 3. Local Development Default
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000/api/auth/google/callback';
  }

  // 4. Safe failure
  throw new Error('Server configuration error: A trusted GOOGLE_REDIRECT_URI or VERCEL_URL is required in production.');
};
