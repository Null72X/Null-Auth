import crypto from 'crypto';

/**
 * Generate a random, cryptographically secure App ID with numbers only (e.g. 48392017)
 */
export function generateAppId(): string {
  return crypto.randomInt(10000000, 99999999).toString();
}

/**
 * Generate a secure application secret key with raw key only
 */
export function generateAppSecret(): string {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Generate a unique License Key in format: NULL-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const block = (len: number) => {
    let result = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  };

  return `NULL-${block(4)}-${block(4)}-${block(4)}`;
}
