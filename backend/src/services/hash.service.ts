import crypto from 'crypto';

/**
 * Normalizes client machine HWID or Windows User SID.
 */
export function hashHwid(rawHwid: string): string {
  if (!rawHwid) return '';
  const trimmed = rawHwid.trim();
  if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

/**
 * Generates a SHA-256 cryptographic hash of a raw HWID/SID string
 */
export function sha256Hwid(rawHwid: string): string {
  if (!rawHwid) return '';
  return crypto.createHash('sha256').update(rawHwid.trim()).digest('hex').toLowerCase();
}

