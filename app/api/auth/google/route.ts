import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getOAuthRedirectUri } from '../../../../lib/auth';

export async function GET(req: Request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }

    // Determine redirect URI using trusted configuration
    const redirectUri = getOAuthRedirectUri();

    const state = crypto.randomBytes(32).toString('hex');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);

    const response = NextResponse.redirect(authUrl.toString());

    // Securely set the state cookie for validation in the callback
    response.cookies.set('oauth_state', state, {
      path: '/',
      maxAge: 60 * 5, // 5 minutes
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    return NextResponse.redirect(new URL('/homepage?auth=login&error=oauth_failed', req.url));
  }
}
