import path from 'path';
import crypto from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { del, list, put } from '@vercel/blob';
import { prisma } from './prisma';
import { INTERACTIVE_TX_OPTIONS } from './schedulingEngine';

export const ALLOWED_PROOF_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ALLOWED_PROOF_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
export const MAX_PROOF_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MIN_IMAGE_DIMENSION = 1;
export const MAX_IMAGE_DIMENSION = 12000;
export const MAX_IMAGE_PIXELS = 50_000_000; // 50 Megapixels max to prevent decompression bombs
export const MAX_UNATTACHED_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type DetectedImageFormat = 'jpeg' | 'png' | 'webp';

export const MIME_BY_FORMAT: Record<DetectedImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const EXTENSIONS_BY_FORMAT: Record<DetectedImageFormat, string[]> = {
  jpeg: ['.jpg', '.jpeg'],
  png: ['.png'],
  webp: ['.webp'],
};

const CANONICAL_EXT_BY_FORMAT: Record<DetectedImageFormat, string> = {
  jpeg: '.jpg',
  png: '.png',
  webp: '.webp',
};

export const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * Inspects actual binary magic bytes to detect JPEG, PNG, or WebP image format.
 */
export function detectImageFormatFromBuffer(buffer: Buffer): DetectedImageFormat | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

export interface ImageStructureInspectionResult {
  valid: boolean;
  width?: number;
  height?: number;
  message?: string;
}

function inspectPngStructure(buffer: Buffer): ImageStructureInspectionResult {
  // Minimum valid PNG: 8-byte signature + 25-byte IHDR chunk + 12-byte IEND chunk = 45 bytes
  if (buffer.length < 45) {
    return { valid: false, message: 'Corrupted or truncated PNG image file.' };
  }

  const ihdrLength = buffer.readUInt32BE(8);
  const ihdrType = buffer.subarray(12, 16).toString('ascii');
  if (ihdrType !== 'IHDR' || ihdrLength !== 13) {
    return { valid: false, message: 'Malformed PNG image header (missing valid IHDR chunk).' };
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];

  if (![1, 2, 4, 8, 16].includes(bitDepth) || ![0, 2, 3, 4, 6].includes(colorType)) {
    return { valid: false, message: 'Malformed PNG bit depth or color type.' };
  }

  // Walk PNG chunks to verify structural integrity and confirm IEND chunk
  let offset = 8;
  let sawIend = false;
  while (offset + 8 <= buffer.length) {
    const chunkLen = buffer.readUInt32BE(offset);
    const chunkType = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const nextOffset = offset + 12 + chunkLen;

    if (chunkLen > MAX_PROOF_FILE_SIZE || nextOffset > buffer.length) {
      return { valid: false, message: 'Corrupted or truncated PNG chunk structure.' };
    }

    if (chunkType === 'IEND') {
      if (chunkLen !== 0) {
        return { valid: false, message: 'Invalid PNG IEND trailer chunk.' };
      }
      sawIend = true;
      break;
    }

    offset = nextOffset;
  }

  if (!sawIend) {
    return { valid: false, message: 'Truncated PNG image (missing IEND trailer).' };
  }

  return { valid: true, width, height };
}

function inspectJpegStructure(buffer: Buffer): ImageStructureInspectionResult {
  // Minimum JPEG with SOI, SOF, SOS, and EOI
  if (buffer.length < 20) {
    return { valid: false, message: 'Corrupted or truncated JPEG image file.' };
  }

  const SOF_MARKERS = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);

  let offset = 2;
  let width = 0;
  let height = 0;
  let foundSof = false;
  let foundEoi = false;

  while (offset < buffer.length) {
    // Find 0xFF marker prefix
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset++;
    }
    if (offset >= buffer.length) break;

    const marker = buffer[offset];
    offset++;

    // Standalone markers without length
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      continue;
    }

    // EOI marker (FF D9)
    if (marker === 0xd9) {
      foundEoi = true;
      break;
    }

    // Ensure 2-byte segment length is available
    if (offset + 2 > buffer.length) {
      return { valid: false, message: 'Truncated JPEG segment header.' };
    }

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      return { valid: false, message: 'Corrupted or truncated JPEG segment length.' };
    }

    if (SOF_MARKERS.has(marker)) {
      if (segmentLength < 8 || offset + 7 > buffer.length) {
        return { valid: false, message: 'Malformed JPEG Start-Of-Frame (SOF) segment.' };
      }
      height = buffer.readUInt16BE(offset + 3);
      width = buffer.readUInt16BE(offset + 5);
      foundSof = true;
    }

    // Start of Scan (SOS): entropy-coded data follows until next marker (such as EOI FF D9)
    if (marker === 0xda) {
      offset += segmentLength;
      // Scan forward for EOI (FF D9) in the remaining buffer
      for (let i = buffer.length - 2; i >= offset; i--) {
        if (buffer[i] === 0xff && buffer[i + 1] === 0xd9) {
          foundEoi = true;
          break;
        }
      }
      break;
    }

    offset += segmentLength;
  }

  if (!foundSof) {
    return { valid: false, message: 'Invalid JPEG file: missing frame header (SOF).' };
  }

  if (!foundEoi) {
    return { valid: false, message: 'Truncated JPEG file: missing End-Of-Image (EOI) marker.' };
  }

  return { valid: true, width, height };
}

function inspectWebpStructure(buffer: Buffer): ImageStructureInspectionResult {
  if (buffer.length < 30) {
    return { valid: false, message: 'Corrupted or truncated WebP image file.' };
  }

  const riffSize = buffer.readUInt32LE(4);
  if (riffSize < 12 || riffSize + 8 > buffer.length) {
    return { valid: false, message: 'Corrupted or truncated WebP RIFF container.' };
  }

  const chunkType = buffer.subarray(12, 16).toString('ascii');
  const chunkSize = buffer.readUInt32LE(16);
  if (20 + chunkSize > buffer.length) {
    return { valid: false, message: 'Truncated WebP bitstream chunk.' };
  }

  let width = 0;
  let height = 0;

  if (chunkType === 'VP8 ') {
    if (chunkSize < 10) {
      return { valid: false, message: 'Truncated lossy WebP (VP8) header.' };
    }
    // Check VP8 start code 9D 01 2A at offset 23..25
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) {
      return { valid: false, message: 'Invalid WebP VP8 frame sync code.' };
    }
    width = buffer.readUInt16LE(26) & 0x3fff;
    height = buffer.readUInt16LE(28) & 0x3fff;
  } else if (chunkType === 'VP8L') {
    if (chunkSize < 5 || buffer[20] !== 0x2f) {
      return { valid: false, message: 'Invalid lossless WebP (VP8L) header.' };
    }
    const bits = buffer.readUInt32LE(21);
    width = (bits & 0x3fff) + 1;
    height = ((bits >> 14) & 0x3fff) + 1;
  } else if (chunkType === 'VP8X') {
    if (chunkSize < 10) {
      return { valid: false, message: 'Truncated extended WebP (VP8X) header.' };
    }
    width = 1 + buffer.readUIntLE(24, 3);
    height = 1 + buffer.readUIntLE(27, 3);
  } else {
    return { valid: false, message: 'Unsupported or corrupted WebP chunk format.' };
  }

  return { valid: true, width, height };
}

/**
 * Validates the internal structure, trailer/chunks, actual dimensions, and total pixel count
 * of a JPEG, PNG, or WebP buffer without modifying the original image bytes.
 */
export function inspectImageStructureAndDimensions(
  buffer: Buffer,
  format: DetectedImageFormat
): ImageStructureInspectionResult {
  const result =
    format === 'png'
      ? inspectPngStructure(buffer)
      : format === 'jpeg'
      ? inspectJpegStructure(buffer)
      : inspectWebpStructure(buffer);

  if (!result.valid) {
    return result;
  }

  const width = result.width ?? 0;
  const height = result.height ?? 0;

  if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    return {
      valid: false,
      message: 'Invalid image dimensions (width and height must be positive).',
    };
  }

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return {
      valid: false,
      message: `Image dimensions (${width}x${height} px) exceed the maximum allowed ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} px limit.`,
    };
  }

  if (width * height > MAX_IMAGE_PIXELS) {
    return {
      valid: false,
      message: `Image resolution (${width}x${height} px) exceeds the 50-megapixel safety limit.`,
    };
  }

  return { valid: true, width, height };
}

export interface ProofFileValidationResult {
  valid: boolean;
  message?: string;
  detectedFormat?: DetectedImageFormat;
  canonicalMimeType?: string;
  canonicalExtension?: string;
  width?: number;
  height?: number;
}

/**
 * Validates an uploaded payment proof file's size, extension, MIME type, binary signature,
 * container structure, and pixel dimensions.
 */
export function validatePaymentProofFileInput(params: {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}): ProofFileValidationResult {
  const { fileName, mimeType, size, buffer } = params;

  if (!buffer || size <= 0 || buffer.length <= 0) {
    return {
      valid: false,
      message: 'The selected file is empty (0 bytes). Please upload a valid payment receipt image.',
    };
  }

  if (size > MAX_PROOF_FILE_SIZE || buffer.length > MAX_PROOF_FILE_SIZE) {
    const sizeMb = (Math.max(size, buffer.length) / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      message: `File size (${sizeMb} MB) exceeds the 5 MB maximum limit.`,
    };
  }

  const normalizedMime =
    (mimeType || '').trim().toLowerCase() === 'image/jpg'
      ? 'image/jpeg'
      : (mimeType || '').trim().toLowerCase();

  if (!ALLOWED_PROOF_MIME_TYPES.includes(normalizedMime as any)) {
    return {
      valid: false,
      message: 'Unsupported file format. Only JPEG, PNG, and WebP images are allowed.',
    };
  }

  const ext = path.extname(fileName || '').toLowerCase();
  if (!ALLOWED_PROOF_EXTENSIONS.includes(ext as any)) {
    return {
      valid: false,
      message: 'Invalid file extension. Allowed extensions are .jpg, .jpeg, .png, and .webp.',
    };
  }

  const detectedFormat = detectImageFormatFromBuffer(buffer);
  if (!detectedFormat) {
    return {
      valid: false,
      message:
        'File contents do not match a valid JPEG, PNG, or WebP image signature. Corrupted or non-image files are not allowed.',
    };
  }

  const expectedMime = MIME_BY_FORMAT[detectedFormat];
  const allowedExtsForFormat = EXTENSIONS_BY_FORMAT[detectedFormat];

  if (normalizedMime !== expectedMime || !allowedExtsForFormat.includes(ext)) {
    return {
      valid: false,
      message: `File content signature (${detectedFormat.toUpperCase()}) does not match the declared file type (${ext || normalizedMime}).`,
    };
  }

  const structureCheck = inspectImageStructureAndDimensions(buffer, detectedFormat);
  if (!structureCheck.valid) {
    return {
      valid: false,
      message: structureCheck.message || 'Corrupted or malformed image content.',
    };
  }

  return {
    valid: true,
    detectedFormat,
    canonicalMimeType: expectedMime,
    canonicalExtension: ext === '.jpeg' ? '.jpeg' : CANONICAL_EXT_BY_FORMAT[detectedFormat],
    width: structureCheck.width,
    height: structureCheck.height,
  };
}

/**
 * Retrieves the server-side HMAC signing secret (`JWT_SECRET`).
 * Fails closed if `JWT_SECRET` is missing or empty.
 */
export function getSigningSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error(
      'Server configuration error: JWT_SECRET environment variable is required for payment proof signing.'
    );
  }
  return secret;
}

export function computeFilenameSignature(
  timestamp: number,
  userId: number,
  randomHex: string,
  ext: string
): string {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(`${timestamp}:u${userId}:${randomHex}:${ext.toLowerCase()}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Generates a safe, collision-resistant filename cryptographically bound to the uploading user.
 * Format: `<timestamp>_u<userId>_<randomHex>_<hmac16>.<ext>`
 */
export function generateOwnedProofFilename(userId: number, ext: string, customTimestamp?: number): string {
  const safeExt = ALLOWED_PROOF_EXTENSIONS.includes(ext.toLowerCase() as any)
    ? ext.toLowerCase()
    : '.jpg';
  const timestamp = customTimestamp !== undefined ? customTimestamp : Date.now();
  const randomHex = crypto.randomBytes(12).toString('hex');
  const signature = computeFilenameSignature(timestamp, userId, randomHex, safeExt);
  return `${timestamp}_u${userId}_${randomHex}_${signature}${safeExt}`;
}

export interface ParsedProofFilename {
  isValidFormat: boolean;
  safeFilename: string;
  extension: string;
  contentType: string;
  isSigned: boolean;
  signatureValid: boolean;
  ownerUserId: number | null;
  timestamp: number | null;
}

/**
 * Extracts and validates a safe filename from a proofUrl or raw filename, preventing path traversal.
 */
export function extractSafeProofFilename(proofUrlOrFilename: string): string | null {
  if (!proofUrlOrFilename || typeof proofUrlOrFilename !== 'string') return null;
  const trimmed = proofUrlOrFilename.trim();
  if (!trimmed) return null;

  let candidate = trimmed;

  if (trimmed.startsWith('/api/payments/proof/')) {
    candidate = trimmed.slice('/api/payments/proof/'.length).split('?')[0];
  } else if (trimmed.startsWith('/uploads/payments/')) {
    candidate = trimmed.slice('/uploads/payments/'.length).split('?')[0];
  } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsedUrl = new URL(trimmed);
      if (parsedUrl.pathname.startsWith('/api/payments/proof/')) {
        candidate = parsedUrl.pathname.slice('/api/payments/proof/'.length);
      } else if (
        parsedUrl.hostname.endsWith('.blob.vercel-storage.com') &&
        parsedUrl.pathname.startsWith('/payments/')
      ) {
        candidate = parsedUrl.pathname.slice('/payments/'.length);
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(candidate).trim();
  } catch {
    return null;
  }

  const base = path.basename(decoded);
  if (
    !base ||
    base !== decoded ||
    base.includes('..') ||
    base.includes('/') ||
    base.includes('\\') ||
    !/^[a-zA-Z0-9._-]+$/.test(base)
  ) {
    return null;
  }

  const ext = path.extname(base).toLowerCase();
  if (!ALLOWED_PROOF_EXTENSIONS.includes(ext as any)) {
    return null;
  }

  return base;
}

/**
 * Normalizes any supported proof reference (`/uploads/payments/...`, Vercel Blob URL, or `/api/payments/proof/...`)
 * into the canonical authenticated route `/api/payments/proof/<safeFilename>`.
 */
export function normalizeProofUrlReference(proofUrl: string | null | undefined): string | null {
  if (!proofUrl || typeof proofUrl !== 'string') return null;
  const trimmed = proofUrl.trim();
  if (!trimmed) return null;
  const safeFilename = extractSafeProofFilename(trimmed);
  if (!safeFilename) return trimmed;
  return `/api/payments/proof/${safeFilename}`;
}

/**
 * Parses a proof filename and verifies its HMAC ownership signature if present.
 */
export function parseAndVerifyProofFilename(proofUrlOrFilename: string): ParsedProofFilename | null {
  const safeFilename = extractSafeProofFilename(proofUrlOrFilename);
  if (!safeFilename) return null;

  const ext = path.extname(safeFilename).toLowerCase();
  const contentType = MIME_MAP[ext];
  if (!contentType) return null;

  const baseWithoutExt = safeFilename.slice(0, safeFilename.length - ext.length);

  // New signed format: <timestamp>_u<userId>_<randomHex>_<hmac16>
  const signedMatch = /^(\d+)_u(\d+)_([a-f0-9]{16,32})_([a-f0-9]{16})$/i.exec(baseWithoutExt);
  if (signedMatch) {
    const timestamp = parseInt(signedMatch[1], 10);
    const ownerUserId = parseInt(signedMatch[2], 10);
    const randomHex = signedMatch[3].toLowerCase();
    const providedSig = signedMatch[4].toLowerCase();
    let signatureValid = false;
    try {
      const expectedSig = computeFilenameSignature(timestamp, ownerUserId, randomHex, ext);
      signatureValid = crypto.timingSafeEqual(
        Buffer.from(providedSig, 'utf8'),
        Buffer.from(expectedSig, 'utf8')
      );
    } catch {
      signatureValid = false;
    }

    return {
      isValidFormat: true,
      safeFilename,
      extension: ext,
      contentType,
      isSigned: true,
      signatureValid,
      ownerUserId,
      timestamp,
    };
  }

  // Legacy format: <timestamp>_<randomHex>
  const legacyMatch = /^(\d+)_([a-f0-9]{16,32})$/i.exec(baseWithoutExt);
  if (legacyMatch) {
    return {
      isValidFormat: true,
      safeFilename,
      extension: ext,
      contentType,
      isSigned: false,
      signatureValid: false,
      ownerUserId: null,
      timestamp: parseInt(legacyMatch[1], 10),
    };
  }

  return null;
}

/**
 * Checks whether an unattached signed proof filename is within the allowed 24-hour expiration window.
 */
export function isUnattachedProofTimestampFresh(
  timestamp: number | null,
  nowMs: number = Date.now()
): boolean {
  if (timestamp === null || isNaN(timestamp)) return false;
  const ageMs = nowMs - timestamp;
  // Allow up to 60s clock skew in the future and up to MAX_UNATTACHED_UPLOAD_TTL_MS (24h) in the past
  return ageMs >= -60_000 && ageMs <= MAX_UNATTACHED_UPLOAD_TTL_MS;
}

export function getLocalProofFilePath(safeFilename: string): string {
  return path.join(process.cwd(), 'storage', 'payments', safeFilename);
}

export interface StorePaymentProofOptions {
  /**
   * Override for unit testing persistent storage failure handling.
   */
  blobUploader?: (pathname: string, buffer: Buffer, contentType: string) => Promise<{ url: string }>;
  requirePersistentBlob?: boolean;
}

/**
 * Stores a validated payment proof buffer in persistent storage.
 * - In production (or when BLOB_READ_WRITE_TOKEN is configured / requirePersistentBlob is true),
 *   Vercel Blob is the authoritative persistent store: if the Blob upload fails, the upload fails.
 * - Local `storage/payments/` is used as a local dev store (when BLOB_READ_WRITE_TOKEN is not set)
 *   or read-through cache when writable.
 * - Always returns the authenticated proxy URL `/api/payments/proof/<safeFilename>`.
 */
export async function storePaymentProofBuffer(
  safeFilename: string,
  buffer: Buffer,
  contentType: string,
  options?: StorePaymentProofOptions
): Promise<{ proofUrl: string; fileName: string; fileSize: number }> {
  const isProduction =
    process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const mustPersistToBlob =
    options?.requirePersistentBlob !== undefined
      ? options.requirePersistentBlob
      : isProduction || hasBlobToken;

  let storedInBlob = false;
  let storedLocally = false;

  // 1. Authoritative Persistent Storage: Vercel Blob
  if (mustPersistToBlob) {
    if (!hasBlobToken && !options?.blobUploader) {
      throw new Error(
        'Persistent storage configuration error: BLOB_READ_WRITE_TOKEN is required to store payment proofs.'
      );
    }

    const uploader =
      options?.blobUploader ||
      (async (pathname: string, buf: Buffer, mime: string) =>
        await put(pathname, buf, {
          access: 'public',
          contentType: mime,
          addRandomSuffix: false,
        }));

    // Do NOT swallow persistent storage failures: if Vercel Blob fails, throw immediately
    await uploader(`payments/${safeFilename}`, buffer, contentType);
    storedInBlob = true;
  }

  // 2. Local filesystem storage (development fallback when Blob is unconfigured, or read-through cache in dev)
  if (!isProduction) {
    try {
      const storageDir = path.join(process.cwd(), 'storage', 'payments');
      await mkdir(storageDir, { recursive: true });
      await writeFile(path.join(storageDir, safeFilename), buffer);
      storedLocally = true;
    } catch (fsErr) {
      if (!storedInBlob) {
        throw fsErr;
      }
    }
  }

  if (!storedInBlob && !storedLocally) {
    throw new Error('Failed to persist payment proof image to storage.');
  }

  return {
    proofUrl: `/api/payments/proof/${safeFilename}`,
    fileName: safeFilename,
    fileSize: buffer.length,
  };
}

/**
 * Reads a payment proof image buffer from local private storage or Vercel Blob fallback,
 * deriving `contentType` from the validated binary image content.
 */
export async function readPaymentProofBuffer(
  proofUrlOrFilename: string
): Promise<{ buffer: Buffer; safeFilename: string; contentType: string; detectedFormat: DetectedImageFormat } | null> {
  const safeFilename = extractSafeProofFilename(proofUrlOrFilename);
  if (!safeFilename) return null;

  let rawBuffer: Buffer | null = null;

  // 1. Try local private storage first (if present on disk)
  const localPath = getLocalProofFilePath(safeFilename);
  try {
    const buf = await readFile(localPath);
    if (buf && buf.length > 0) {
      rawBuffer = buf;
    }
  } catch {
    // Fall through to Vercel Blob lookup
  }

  // 2. Fallback to authoritative Vercel Blob persistent storage
  if (!rawBuffer && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({
        prefix: `payments/${safeFilename}`,
        limit: 5,
      });
      const matchingBlob = blobs.find(
        (b) => b.pathname === `payments/${safeFilename}` || b.pathname.endsWith(`/${safeFilename}`)
      );
      if (matchingBlob?.url) {
        const res = await fetch(matchingBlob.url, { cache: 'no-store' });
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          if (buffer.length > 0) {
            rawBuffer = buffer;
          }
        }
      }
    } catch (blobErr) {
      console.warn('Vercel Blob read fallback error:', blobErr);
    }
  }

  if (!rawBuffer) return null;

  // 3. Derive Content-Type strictly from validated binary image signature
  const detectedFormat = detectImageFormatFromBuffer(rawBuffer);
  if (!detectedFormat) {
    return null;
  }

  return {
    buffer: rawBuffer,
    safeFilename,
    contentType: MIME_BY_FORMAT[detectedFormat],
    detectedFormat,
  };
}

export interface CustomerProofVerificationResult {
  valid: boolean;
  status: number;
  message?: string;
  canonicalProofUrl?: string;
  safeFilename?: string;
}

/**
 * Verifies that a customer payment submission includes a valid, existing, non-corrupted image
 * that belongs to the authenticated customer and has not been previously consumed or expired.
 */
export async function verifyPaymentProofForCustomerSubmission(params: {
  proofUrl: unknown;
  userId: number;
  userEmail: string;
}): Promise<CustomerProofVerificationResult> {
  const { proofUrl, userId, userEmail } = params;

  if (typeof proofUrl !== 'string' || !proofUrl.trim()) {
    return {
      valid: false,
      status: 400,
      message:
        'Payment proof image is required. Please upload a screenshot or image of your completed payment transaction before submitting.',
    };
  }

  let parsed: ParsedProofFilename | null;
  try {
    parsed = parseAndVerifyProofFilename(proofUrl);
  } catch (err: any) {
    return {
      valid: false,
      status: 500,
      message: 'Server configuration error while verifying payment proof.',
    };
  }

  if (!parsed || !parsed.isValidFormat) {
    return {
      valid: false,
      status: 400,
      message: 'Invalid payment proof reference. Please upload a valid JPG, PNG, or WebP payment receipt.',
    };
  }

  // 1. Verify cryptographic ownership signature
  if (parsed.isSigned) {
    if (!parsed.signatureValid) {
      return {
        valid: false,
        status: 400,
        message: 'Invalid or tampered payment proof reference. Please re-upload your payment receipt.',
      };
    }
    if (parsed.ownerUserId !== Number(userId)) {
      return {
        valid: false,
        status: 403,
        message: 'Forbidden: You are not authorized to submit a payment proof uploaded by another customer.',
      };
    }
  } else {
    // Unsigned filenames cannot be used for new customer payment submissions
    return {
      valid: false,
      status: 403,
      message:
        'Forbidden: Unverified payment proof ownership. Please upload your payment receipt through the upload form.',
    };
  }

  // 2. Check database to ensure this proof file has never been consumed by any payment transaction
  const existingPaymentsWithProof = await prisma.paymentTransaction.findMany({
    where: {
      proofUrl: {
        contains: parsed.safeFilename,
      },
    },
    include: {
      booking: { select: { userId: true, clientEmail: true } },
      quotation: { select: { userId: true, clientEmail: true } },
    },
  });

  const normalizedUserEmail = (userEmail || '').trim().toLowerCase();

  if (existingPaymentsWithProof.length > 0) {
    const belongsToAnotherCustomer = existingPaymentsWithProof.some((p) => {
      const pEmail = (p.clientEmail || '').trim().toLowerCase();
      const bUserId = p.booking?.userId;
      const qUserId = p.quotation?.userId;
      const isSameOwner =
        pEmail === normalizedUserEmail ||
        (bUserId && bUserId === Number(userId)) ||
        (qUserId && qUserId === Number(userId));
      return !isSameOwner;
    });

    if (belongsToAnotherCustomer) {
      return {
        valid: false,
        status: 403,
        message: 'Forbidden: This payment proof belongs to another customer.',
      };
    }

    // Strict one-time proof consumption: once attached to any payment transaction (Verified, Pending, or Rejected),
    // the same proof file cannot be reused for another payment transaction.
    return {
      valid: false,
      status: 409,
      message:
        'This payment proof image has already been used for a payment submission. Please upload a new payment receipt.',
    };
  }

  // 3. Enforce 24-hour TTL on unattached temporary uploads (R1)
  if (!isUnattachedProofTimestampFresh(parsed.timestamp)) {
    return {
      valid: false,
      status: 400,
      message:
        'Uploaded payment proof session has expired (older than 24 hours). Please upload your payment receipt again.',
    };
  }

  // 4. Verify that the uploaded file actually exists in storage and has valid image structure & dimensions
  const storedFile = await readPaymentProofBuffer(parsed.safeFilename);
  if (!storedFile) {
    return {
      valid: false,
      status: 400,
      message:
        'Uploaded payment proof image could not be found in storage. Please upload your payment receipt again.',
    };
  }

  const contentValidation = validatePaymentProofFileInput({
    fileName: parsed.safeFilename,
    mimeType: storedFile.contentType,
    size: storedFile.buffer.length,
    buffer: storedFile.buffer,
  });

  if (!contentValidation.valid) {
    return {
      valid: false,
      status: 400,
      message: contentValidation.message || 'Uploaded payment proof failed image content verification.',
    };
  }

  return {
    valid: true,
    status: 200,
    canonicalProofUrl: `/api/payments/proof/${parsed.safeFilename}`,
    safeFilename: parsed.safeFilename,
  };
}

/**
 * Safely deletes an abandoned/orphaned payment proof file ONLY if it is not referenced by any PaymentTransaction.
 * Synchronizes with `createPaymentTransaction` via `pg_advisory_xact_lock` on `jad_proof_<safeFilename>`
 * so an in-flight payment creation can never have its file deleted.
 */
export async function cleanupOrphanedPaymentProof(
  proofUrlOrFilename: string,
  requesterUserId?: number
): Promise<boolean> {
  try {
    const parsed = parseAndVerifyProofFilename(proofUrlOrFilename);
    if (!parsed || !parsed.isValidFormat) return false;

    if (requesterUserId !== undefined && parsed.isSigned) {
      if (!parsed.signatureValid || parsed.ownerUserId !== Number(requesterUserId)) {
        return false;
      }
    }

    const proofLockKey = `jad_proof_${parsed.safeFilename}`;
    const isUnreferenced = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${proofLockKey}))`;
      const existingCount = await tx.paymentTransaction.count({
        where: {
          proofUrl: {
            contains: parsed.safeFilename,
          },
        },
      });
      return existingCount === 0;
    }, INTERACTIVE_TX_OPTIONS);

    if (!isUnreferenced) {
      return false;
    }

    // Remove local copy if present
    const localPath = getLocalProofFilePath(parsed.safeFilename);
    await unlink(localPath).catch(() => {});

    // Remove from Vercel Blob if present
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { blobs } = await list({
          prefix: `payments/${parsed.safeFilename}`,
          limit: 5,
        });
        const urlsToDelete = blobs
          .filter(
            (b) =>
              b.pathname === `payments/${parsed.safeFilename}` ||
              b.pathname.endsWith(`/${safeFilenameSuffix(parsed.safeFilename)}`)
          )
          .map((b) => b.url);
        if (urlsToDelete.length > 0) {
          await del(urlsToDelete);
        }
      } catch {
        // Ignore blob cleanup errors
      }
    }

    return true;
  } catch {
    return false;
  }
}

function safeFilenameSuffix(safeFilename: string): string {
  return safeFilename;
}
