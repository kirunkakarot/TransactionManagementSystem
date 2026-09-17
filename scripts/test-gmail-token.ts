import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load variables from .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID?.trim();
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET?.trim();
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN?.trim();

if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
  console.error('[ERROR] Missing one or more Gmail credentials in .env.local');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: GMAIL_REFRESH_TOKEN,
});

async function testToken() {
  console.log('Testing your GMAIL_REFRESH_TOKEN...');
  console.log(`Client ID: ${GMAIL_CLIENT_ID?.substring(0, 10)}...`);
  console.log(`Token: ${GMAIL_REFRESH_TOKEN?.substring(0, 10)}...`);
  try {
    const { token } = await oauth2Client.getAccessToken();
    console.log('\n[SUCCESS] The refresh token is VALID and generated an access token!');
  } catch (error: any) {
    console.error('\n[FAILED] The refresh token is INVALID or the OAuth client details are wrong.');
    console.error('Error Details:', error.message);
    if (error.response?.data) {
      console.error('Google API Response:', error.response.data);
    }
    console.error('\nPlease double check that you copied the token exactly (without the DeprecationWarning) and that your Client ID/Secret exactly match the ones used to generate the token.');
  }
}

testToken();
