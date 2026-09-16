import { Request } from 'express';

/**
 * Extracts and cleans the real public client IP address behind
 * Vercel Edge proxies, Cloudflare, AWS CloudFront, Nginx, or Docker reverse proxies.
 */
export function extractClientIp(req: Request): string {
  // 1. Cloudflare header
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (typeof cfConnectingIp === 'string' && cfConnectingIp.trim()) {
    return cleanIp(cfConnectingIp);
  }

  // 2. X-Real-IP (Standard reverse proxy header, set by Vercel / Nginx)
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return cleanIp(realIp);
  }

  // 3. X-Forwarded-For (Comma-separated list of IPs: client, proxy1, proxy2...)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const first = raw.split(',')[0]?.trim();
    if (first) {
      return cleanIp(first);
    }
  }

  // 4. True-Client-IP / Fastly-Client-IP
  const trueClientIp = req.headers['true-client-ip'] || req.headers['fastly-client-ip'];
  if (typeof trueClientIp === 'string' && trueClientIp.trim()) {
    return cleanIp(trueClientIp);
  }

  // 5. Express req.ip (populated when 'trust proxy' is enabled)
  if (req.ip) {
    return cleanIp(req.ip);
  }

  // 6. Socket remoteAddress fallback
  const socketAddress = req.socket?.remoteAddress;
  if (socketAddress) {
    return cleanIp(socketAddress);
  }

  return '127.0.0.1';
}

/**
 * Cleans IPv6-mapped IPv4 addresses (::ffff:1.2.3.4 -> 1.2.3.4) and normalizes loopback
 */
function cleanIp(ip: string): string {
  if (!ip) return '127.0.0.1';
  let cleaned = ip.trim();

  // Strip IPv6-mapped IPv4 prefix
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }

  // Standardize IPv6 loopback
  if (cleaned === '::1') {
    return '127.0.0.1';
  }

  return cleaned;
}
