import { google } from 'googleapis';
import * as http from 'http';
import * as url from 'url';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load variables from .env.local if present, else .env
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
  console.error('\n[ERROR] Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in environment variables.');
  console.error('Please add them to your .env.local file first.\n');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = [
  'https://www.googleapis.com/auth/gmail.send'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // Force consent prompt to ensure we get a refresh token
  scope: scopes,
});

console.log('\n======================================================');
console.log('            GMAIL API AUTHORIZATION SCRIPT');
console.log('======================================================\n');
console.log('1. Go to your Google Cloud Console and ensure your OAuth Client ID');
console.log(`   has the following Redirect URI configured: ${REDIRECT_URI}\n`);
console.log('2. Open the following URL in your browser:\n');
console.log(authUrl);
console.log('\n3. Sign in with your dedicated JAD Events Gmail sender account.\n');
console.log('Waiting for authorization callback on port 3000...\n');

const server = http.createServer(async (req, res) => {
  try {
    if (req.url && req.url.startsWith('/oauth2callback')) {
      const parsedUrl = url.parse(req.url, true);
      const code = parsedUrl.query.code as string;

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization failed. No code found in URL.</h1><p>Check terminal for details.</p>');
        console.error('[ERROR] No code parameter in callback.');
        process.exit(1);
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorization successful!</h1><p>You can close this tab and return to your terminal.</p>');

      console.log('Received authorization code. Exchanging for tokens...\n');

      const { tokens } = await oauth2Client.getToken(code);

      console.log('======================================================');
      console.log('                 AUTHORIZATION SUCCESS');
      console.log('======================================================\n');

      if (tokens.refresh_token) {
        console.log('YOUR GMAIL REFRESH TOKEN:\n');
        console.log(tokens.refresh_token);
        console.log('\nCopy the token above and add it to your .env.local file as:');
        console.log('GMAIL_REFRESH_TOKEN="<paste-token-here>"\n');
      } else {
        console.log('[WARNING] No refresh token was returned.');
        console.log('This usually happens if you already authorized the app previously.');
        console.log('To get a new refresh token, you may need to go to your Google Account permissions,');
        console.log('revoke access for this app, and run this script again.\n');
        console.log('Access token (expires soon):', tokens.access_token);
      }

      server.close();
      process.exit(0);
    }
  } catch (error: any) {
    console.error('\n[ERROR] An error occurred during token exchange:', error.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('An internal server error occurred.');
    process.exit(1);
  }
});

server.listen(3000, () => {
  // Server is running, waiting for callback
});
