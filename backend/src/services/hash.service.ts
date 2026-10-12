import crypto from 'crypto';

/**
 * Normalizes client machine hardware HWID.
 */
export function hashHwid(rawHwid: string): string {
  if (!rawHwid) return '';
  return rawHwid.trim().toLowerCase();
}

/**
 * Generates a SHA-256 cryptographic hash of a raw HWID string
 */
export function sha256Hwid(rawHwid: string): string {
  if (!rawHwid) return '';
  return crypto.createHash('sha256').update(rawHwid.trim()).digest('hex').toLowerCase();
}

