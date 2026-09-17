import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { 
  findUserByEmail, 
  findGoogleIdentity, 
  linkGoogleIdentity, 
  createGoogleUser 
} from '../../../../../models/userModel';

const generateToken = (id: number | string, role: string = 'Customer') => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return jwt.sign({ id, role }, secret, {
    expiresIn: '30d',
  });
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('Google OAuth Error:', error);
      return NextResponse.redirect(new URL('/homepage?auth=login&error=oauth_denied', req.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/homepage?auth=login&error=invalid_oauth_request', req.url));
    }

    // Validate state
    const cookieHeader = req.headers.get('cookie') || '';
    const stateMatch = cookieHeader.match(/(?:^|;\s*)(?:oauth_state)=([^;]+)/);
    const savedState = stateMatch ? decodeURIComponent(stateMatch[1]) : null;

    if (!savedState || state !== savedState) {
      return NextResponse.redirect(new URL('/homepage?auth=login&error=invalid_state', req.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }

    // Determine redirect URI
    const origin = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Google token exchange error:', tokenData);
      return NextResponse.redirect(new URL('/homepage?auth=login&error=token_exchange_failed', req.url));
    }

    // Get user profile
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok || !profileData.id || !profileData.email) {
      console.error('Google profile fetch error:', profileData);
      return NextResponse.redirect(new URL('/homepage?auth=login&error=profile_fetch_failed', req.url));
    }

    const googleId = profileData.id;
    const email = profileData.email.toLowerCase().trim();
    const name = profileData.name || email.split('@')[0];

    // Check if GoogleIdentity exists
    const existingIdentity = await findGoogleIdentity(googleId);
    let user;

    if (existingIdentity && existingIdentity.user) {
      user = existingIdentity.user;
    } else {
      // Identity not found, check if a user with this email exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        // SECURITY PRECAUTION: Never auto-link an Administrator or Staff account
        // without them explicitly logging in via password first.
        if (existingUser.role !== 'Customer') {
          console.error(`Security Block: Attempted to link Google OAuth to a privileged account: ${email}`);
          return NextResponse.redirect(new URL('/homepage?auth=login&error=oauth_linking_denied', req.url));
        }

        // Link identity to existing user
        await linkGoogleIdentity(existingUser.id, googleId, email);
        user = existingUser;
      } else {
        // Create new user (Role is forced to Customer in userModel)
        user = await createGoogleUser(name, email, googleId);
      }
    }

    // Generate session tokens
    const token = generateToken(user.id, user.role || 'Customer');

    const response = NextResponse.redirect(new URL('/customer', origin));
    
    // Clear oauth_state cookie
    response.cookies.delete('oauth_state');

    // Set auth cookies
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
  } catch (error) {
    console.error('Google OAuth Callback Error:', error);
    return NextResponse.redirect(new URL('/homepage?auth=login&error=oauth_callback_failed', req.url));
  }
}
