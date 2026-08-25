import crypto from 'crypto';

/**
 * Generate a random, secure App ID in format: NA-XXXXXXXX (e.g. NA-48392017)
 */
export function generateAppId(): string {
  const num = Math.floor(10000000 + Math.random() * 90000000);
  return `NA-${num}`;
}

/**
 * Generate a secure application secret key
 */
export function generateAppSecret(): string {
  return `nas_${crypto.randomBytes(24).toString('hex')}`;
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
