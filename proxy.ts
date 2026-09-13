import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

async function verifyJwtToken(token: string, secret: string): Promise<{ id: number | string; role?: string; exp?: number } | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = enc.encode(`${headerB64}.${payloadB64}`);
    const sigStr = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (sigStr.length % 4)) % 4;
    const fullSigStr = sigStr + '='.repeat(pad);
    const sigBytes = Uint8Array.from(atob(fullSigStr), c => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, data);
    if (!isValid) return null;

    const payloadPad = (4 - (payloadB64.length % 4)) % 4;
    const fullPayloadStr = payloadB64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(payloadPad);
    const payload = JSON.parse(atob(fullPayloadStr));
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value || request.cookies.get('jad_token')?.value;
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin');
  const isCustomerRoute = pathname.startsWith('/customer');

  if (!isAdminRoute && !isCustomerRoute) {
    return NextResponse.next();
  }

  // 1. Unauthenticated users -> Redirect to homepage login
  if (!token) {
    const redirectUrl = new URL('/homepage', request.url);
    redirectUrl.searchParams.set('auth', 'login');
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Cryptographic signature and expiration verification
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('CRITICAL: JWT_SECRET environment variable is not defined.');
    const redirectUrl = new URL('/homepage', request.url);
    redirectUrl.searchParams.set('auth', 'login');
    return NextResponse.redirect(redirectUrl);
  }

  const payload = await verifyJwtToken(token, secret);

  // Invalid signature or malformed token -> Clear cookies and redirect to login
  if (!payload) {
    const redirectUrl = new URL('/homepage', request.url);
    redirectUrl.searchParams.set('auth', 'login');
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('token');
    response.cookies.delete('jad_token');
    return response;
  }

  // Expired token -> Clear cookies and redirect to login
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    const redirectUrl = new URL('/homepage', request.url);
    redirectUrl.searchParams.set('auth', 'login');
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('token');
    response.cookies.delete('jad_token');
    return response;
  }

  const role = payload.role || 'Customer';

  // 3. Route Authorization Guard:
  // - /admin: STRICTLY reserved for Administrator
  if (isAdminRoute && role !== 'Administrator') {
    // Authenticated Customer or Staff trying to access /admin -> redirect to /customer
    return NextResponse.redirect(new URL('/customer', request.url));
  }

  // - /customer: Accessible by Customer and Administrator
  return NextResponse.next();
}

export const middleware = proxy;

export const config = {
  matcher: ['/admin/:path*', '/customer/:path*'],
};

