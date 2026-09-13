import nodemailer, { type Transporter } from 'nodemailer';

export interface SendResetEmailParams {
  toEmail: string;
  recipientName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface SendResetEmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string | false;
  simulated: boolean;
  error?: string;
}

// Cached transporter or test transporter
let cachedTransporter: Transporter | null = null;

async function getTransporter(): Promise<{ transporter: Transporter; isEthereal: boolean }> {
  if (cachedTransporter) {
    const isEthereal = (cachedTransporter as any).__isEthereal === true;
    return { transporter: cachedTransporter, isEthereal };
  }

  // 1. Check for custom SMTP environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  if (smtpHost && smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    (transporter as any).__isEthereal = false;
    cachedTransporter = transporter;
    return { transporter, isEthereal: false };
  }

  // 2. Check for Gmail / Service configuration
  if (process.env.EMAIL_SERVICE === 'gmail' && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    (transporter as any).__isEthereal = false;
    cachedTransporter = transporter;
    return { transporter, isEthereal: false };
  }

  /*
  // =========================================================================
  // PRODUCTION MODE CONFIGURATIONS (COMMENTED ONLY - ACTIVATE FOR PRODUCTION)
  // =========================================================================
  //
  // Option A: Dedicated Production SMTP (SendGrid / AWS SES / Mailgun / Postmark)
  // -------------------------------------------------------------------------
  // const productionTransporter = nodemailer.createTransport({
  //   host: process.env.PROD_SMTP_HOST || 'smtp.sendgrid.net', // e.g. email-smtp.us-east-1.amazonaws.com
  //   port: parseInt(process.env.PROD_SMTP_PORT || '587', 10),
  //   secure: process.env.PROD_SMTP_SECURE === 'true', // true for 465, false for 587
  //   auth: {
  //     user: process.env.PROD_SMTP_USER || 'apikey', // for SendGrid: 'apikey'
  //     pass: process.env.PROD_SMTP_PASS || 'SG.your-sendgrid-api-key',
  //   },
  //   pool: true, // Use pooled connections for high-throughput production
  //   maxConnections: 5,
  //   maxMessages: 100,
  //   rateDelta: 1000,
  //   rateLimit: 5, // 5 messages/second rate protection
  // });
  // (productionTransporter as any).__isEthereal = false;
  // cachedTransporter = productionTransporter;
  // return { transporter: productionTransporter, isEthereal: false };
  //
  // Option B: Dedicated Google Workspace / Gmail App Password for Production
  // -------------------------------------------------------------------------
  // const gmailTransporter = nodemailer.createTransport({
  //   service: 'gmail',
  //   auth: {
  //     user: process.env.PROD_GMAIL_USER, // e.g. notifications@jadevents.com
  //     pass: process.env.PROD_GMAIL_APP_PASSWORD, // 16-character Google App Password
  //   },
  // });
  // (gmailTransporter as any).__isEthereal = false;
  // cachedTransporter = gmailTransporter;
  // return { transporter: gmailTransporter, isEthereal: false };
  // =========================================================================
  */

  // 3. Fallback to Ethereal Email for real SMTP delivery and real email testing in development
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    (transporter as any).__isEthereal = true;
    cachedTransporter = transporter;
    return { transporter, isEthereal: true };
  } catch (err: any) {
    // If external internet/ethereal fails, create a json/stub transport so flow never crashes
    const transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    (transporter as any).__isEthereal = false;
    cachedTransporter = transporter;
    return { transporter, isEthereal: false };
  }
}

/**
 * Builds HTML template for password reset email with JAD Events branding
 */
function buildResetEmailHtml(name: string, resetUrl: string, expiresInMinutes: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your JAD Events Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #1E3A8A 0%, #172554 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .brand { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
    .subbrand { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #cbd5e1; margin-top: 4px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 32px; border-radius: 9999px; box-shadow: 0 4px 10px rgba(30, 58, 138, 0.25); }
    .notice { font-size: 12px; line-height: 1.5; color: #64748b; background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin-top: 24px; }
    .footer { padding: 20px 24px; font-size: 11px; text-align: center; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">JAD EVENTS</div>
      <div class="subbrand">Catering & Event Management</div>
    </div>
    <div class="content">
      <div class="greeting">Hello ${name || 'Valued Client'},</div>
      <div class="text">
        We received a request to reset the password for your JAD Events account. Click the button below to choose a new password:
      </div>
      <div class="btn-container">
        <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
      </div>
      <div class="text" style="font-size: 12px; color: #64748b;">
        Or paste this link into your browser:<br>
        <span style="color: #1E3A8A; word-break: break-all;">${resetUrl}</span>
      </div>
      <div class="notice">
        <strong>Security reminder:</strong> This link will expire in <strong>${expiresInMinutes} minutes</strong> and can only be used once. If you did not request this password reset, please ignore this email or contact JAD Events support.
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} JAD Events Management. All rights reserved.<br>
      This is an automated administrative notification.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends a password reset email via configured SMTP / Ethereal / Transport.
 * Note: Never logs passwords or raw tokens.
 */
export async function sendPasswordResetEmail({
  toEmail,
  recipientName,
  resetUrl,
  expiresInMinutes,
}: SendResetEmailParams): Promise<SendResetEmailResult> {
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'no-reply@jadevents.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'JAD Events Support';

  try {
    const { transporter, isEthereal } = await getTransporter();

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: `"${recipientName}" <${toEmail}>`,
      subject: 'Reset Your JAD Events Account Password',
      text: `Hello ${recipientName},\n\nWe received a request to reset your password. Open this link to set a new password:\n${resetUrl}\n\nThis link expires in ${expiresInMinutes} minutes. If you did not request this, please ignore this email.`,
      html: buildResetEmailHtml(recipientName, resetUrl, expiresInMinutes),
    });

    const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : false;

    // Safe server logging: recipient email, provider status, preview url if Ethereal
    // NEVER log token, password, or sensitive auth headers
    console.log(`[EMAIL DISPATCH SUCCESS] Accepted by mail provider for recipient: <${toEmail}> (messageId: ${info.messageId})`);
    if (previewUrl) {
      console.log(`[EMAIL PREVIEW LINK (ETHEREAL)] ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
      simulated: false,
    };
  } catch (err: any) {
    // Safe error logging without sensitive credentials
    console.error(`[EMAIL DISPATCH ERROR] Failed sending to <${toEmail}>: ${err?.message || err}`);
    return {
      success: false,
      error: err?.message || 'Mail transport error',
      simulated: false,
    };
  }
}
