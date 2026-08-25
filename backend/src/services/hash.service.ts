import crypto from 'crypto';

/**
 * Normalizes and hashes a client machine HWID or Windows User SID for privacy-conscious storage.
 * If the provided value is already a valid 64-character SHA-256 hex string, returns it as-is.
 */
export function hashHwid(rawHwid: string): string {
  const trimmed = rawHwid.trim();
  // Check if already a 64-char hex hash
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // Create SHA-256 hash of normalized string
  return crypto.createHash('sha256').update(`NULLAUTH_HWID_SALT_${trimmed}`).digest('hex');
}
