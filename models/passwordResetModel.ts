import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

// In-memory rate-limiter map: key -> timestamps array
// Limits password reset requests to max 3 per 15 minutes per IP or email
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(key: string, limit: number = 3, windowMs: number = 15 * 60 * 1000): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);

  if (validTimestamps.length >= limit) {
    const oldest = validTimestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);
  return { allowed: true };
}

/**
 * Generates a cryptographically secure reset token.
 * Returns rawToken (to send to user) and tokenHash (to store in DB).
 */
export function generatePasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  // 30 minutes expiration
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  return { rawToken, tokenHash, expiresAt };
}

/**
 * Hashes a token using SHA-256 before database lookup/storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates and stores a password reset token in the database.
 * Invalidates any previous unused tokens for this user first.
 */
export async function createPasswordResetToken(userId: number) {
  const { rawToken, tokenHash, expiresAt } = generatePasswordResetToken();

  // Invalidate any existing active tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: {
      userId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      usedAt: new Date(),
    },
  });

  // Create new reset token record
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

/**
 * Validates a reset token.
 * Returns the associated token record and user if valid, or null.
 */
export async function validatePasswordResetToken(rawToken: string) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 20) {
    return { valid: false, reason: 'Invalid token format' };
  }

  const tokenHash = hashToken(rawToken);

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });

  if (!resetRecord) {
    return { valid: false, reason: 'Token not found or invalid' };
  }

  if (resetRecord.usedAt !== null) {
    return { valid: false, reason: 'This reset token has already been used' };
  }

  if (new Date() > resetRecord.expiresAt) {
    return { valid: false, reason: 'This reset token has expired' };
  }

  return { valid: true, resetRecord, user: resetRecord.user };
}

/**
 * Resets user password using the token, hashes password with bcrypt (10 rounds),
 * updates user password, and marks the token as used.
 */
export async function consumePasswordResetToken(rawToken: string, newPassword: string) {
  const validation = await validatePasswordResetToken(rawToken);

  if (!validation.valid || !validation.resetRecord || !validation.user) {
    throw new Error(validation.reason || 'Invalid or expired token');
  }

  // Hash new password using bcrypt (matching existing auth system: salt rounds 10)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  // Perform password update and token invalidation atomically
  await prisma.$transaction([
    prisma.user.update({
      where: { id: validation.user.id },
      data: { password: passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: validation.resetRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return {
    success: true,
    user: validation.user,
  };
}
