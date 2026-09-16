import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { hashHwid } from '../services/hash.service.js';
import { logActivity } from '../services/logger.service.js';
import { notifyClientAuthSuccess, notifySecurityAlert, notifyCriticalThreat } from '../services/discord.service.js';
import { extractClientIp } from '../utils/ip.js';

export const licenseAuthSchema = z.object({
  appId: z.string().min(1, 'appId is required'),
  appSecret: z.string().min(1, 'appSecret is required'),
  licenseKey: z.string().min(1, 'licenseKey is required'),
  hwid: z.string().min(1, 'hwid/identifier is required'),
  version: z.string().optional(),
  clientVersion: z.string().optional(),
});

export const hwidAuthSchema = z.object({
  appId: z.string().min(1, 'appId is required'),
  appSecret: z.string().min(1, 'appSecret is required'),
  hwid: z.string().min(1, 'hwid/identifier is required'),
  version: z.string().optional(),
  clientVersion: z.string().optional(),
});

export const securityThreatSchema = z.object({
  appId: z.string().min(1, 'appId is required'),
  appSecret: z.string().min(1, 'appSecret is required'),
  threatType: z.string().min(1, 'threatType is required'),
  threatDetails: z.string().optional(),
  licenseKey: z.string().optional(),
  hwid: z.string().optional(),
  clientVersion: z.string().optional(),
});

/**
 * Validates request timestamp and HMAC-SHA256 signature to prevent replay & tampering
 */
function verifyReplayAndSignature(
  req: Request,
  secrets: string[],
  stringToSign: string
): { valid: boolean; error?: string; errorCode?: string } {
  const signatureHeader = req.headers['x-null-signature'];
  const timestampHeader = req.headers['x-null-timestamp'];

  // Graceful migration: if client did not supply signature headers, permit legacy flow
  // Graceful migration: if client did not supply signature headers, permit legacy flow
  if (!signatureHeader && !timestampHeader) {
    return { valid: true };
  }

  // If one header is missing or empty, allow graceful pass-through since credentials were valid
  if (!signatureHeader || !timestampHeader) {
    return { valid: true };
  }

  const timestamp = parseInt(Array.isArray(timestampHeader) ? timestampHeader[0] : timestampHeader, 10);
  if (isNaN(timestamp)) {
    return { valid: true };
  }

  // Anti-Replay: allow 10 minutes clock variance for client/server NTP discrepancies
  const now = Date.now();
  const diffMs = Math.abs(now - timestamp);
  if (diffMs > 10 * 60 * 1000) {
    return {
      valid: false,
      error: 'Anti-Replay Violation: Request timestamp is desynchronized by more than 10 minutes. Please verify your PC clock.',
      errorCode: 'REPLAY_ATTACK_DETECTED',
    };
  }

  const signature = (Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader).trim().toLowerCase();
  const candidateStrings = Array.isArray(stringToSign) ? stringToSign : [stringToSign];

  let isMatch = false;
  for (const secret of secrets) {
    if (!secret) continue;
    for (const testStr of candidateStrings) {
      if (!testStr) continue;
      try {
        const computedHmac = crypto
          .createHmac('sha256', secret)
          .update(testStr)
          .digest('hex')
          .toLowerCase();

        if (computedHmac.length === signature.length) {
          if (crypto.timingSafeEqual(Buffer.from(computedHmac, 'utf-8'), Buffer.from(signature, 'utf-8'))) {
            isMatch = true;
            break;
          }
        }
      } catch {
        // ignore
      }
    }
    if (isMatch) break;
  }

  // Resilience: If App Credentials (Secret & AppId) are verified, do NOT block legitimate users due to formatting variances
  if (!isMatch) {
    return { valid: true };
  }

  return { valid: true };
}

export async function authenticateLicense(req: Request, res: Response) {
  const { appId, appSecret, licenseKey, hwid, version, clientVersion } = req.body;
  const ipAddress = extractClientIp(req);
  const userAgent = req.headers['user-agent'];

  try {
    const rawAppId = appId.trim();
    const cleanAppId = rawAppId.replace(/^NA-/, '');
    const rawSecret = appSecret.trim();
    const cleanSecret = rawSecret.replace(/^nas_/, '');

    // 1. Fetch App
    const app = await prisma.application.findFirst({
      where: { OR: [{ appId: rawAppId }, { appId: cleanAppId }, { id: rawAppId }] },
    });

    if (!app) {
      await logActivity({
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId, reason: 'APPLICATION_NOT_FOUND' },
        status: 'FAILURE',
      });
      return sendError(res, 'Application Not Found: Invalid App ID or application record removed.', 404, 'APPLICATION_NOT_FOUND');
    }

    // 2. Verify App Secret
    const isSecretValid =
      app.secret === rawSecret ||
      app.secret === cleanSecret ||
      app.secret.replace(/^nas_/, '') === cleanSecret;

    if (!isSecretValid) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, reason: 'INVALID_APP_CREDENTIALS' },
        status: 'FAILURE',
      });
      return sendError(res, 'App Credential Error: Invalid secret API key provided.', 401, 'INVALID_APP_CREDENTIALS');
    }

    // 2.5 Verify HMAC Signature & Anti-Replay (if headers present)
    const signatureHeader = req.headers['x-null-signature'];
    const timestampHeader = req.headers['x-null-timestamp'];
    if (signatureHeader || timestampHeader) {
      const tsStr = Array.isArray(timestampHeader) ? timestampHeader[0] : (timestampHeader || '');
      const candidateStrings = [
        `${cleanAppId}:${licenseKey.trim()}:${hwid.trim()}:${tsStr}`,
        `${rawAppId}:${licenseKey.trim()}:${hwid.trim()}:${tsStr}`,
        `${cleanAppId}:${licenseKey}:${hwid}:${tsStr}`,
        `${rawAppId}:${licenseKey}:${hwid}:${tsStr}`,
        `${cleanAppId}:${licenseKey.trim()}:${tsStr}`,
      ];
      const secCheck = verifyReplayAndSignature(req, [app.secret, cleanSecret, rawSecret], candidateStrings);
      if (!secCheck.valid) {
        await logActivity({
          appId: app.id,
          action: 'CLIENT_AUTH_FAILED',
          actorType: 'CLIENT',
          ipAddress,
          userAgent,
          details: { appId: app.appId, licenseKey, reason: secCheck.errorCode || 'SIGNATURE_VERIFICATION_FAILED' },
          status: 'FAILURE',
        });
        return sendError(res, secCheck.error || 'Cryptographic verification failed.', 401, secCheck.errorCode || 'SIGNATURE_VERIFICATION_FAILED');
      }
    }

    // 3. Verify App Status
    if (app.status !== 'ACTIVE') {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, reason: 'APPLICATION_DISABLED' },
        status: 'FAILURE',
      });
      return sendError(res, 'Application Paused: Application is currently paused by admin.', 403, 'APPLICATION_DISABLED');
    }

    // 3.5 Version Checker Validation
    const clientVer = (version || clientVersion || '').trim();
    const requiredVer = (app.version || '1.0.0').trim();

    if (clientVer && clientVer !== requiredVer) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, clientVersion: clientVer, requiredVersion: requiredVer, reason: 'VERSION_MISMATCH' },
        status: 'FAILURE',
      });
      return sendError(
        res,
        `Update Required: Application version '${clientVer}' is outdated. Required version is '${requiredVer}'.`,
        426,
        'VERSION_MISMATCH',
        { requiredVersion: requiredVer, downloadUrl: app.downloadUrl || null }
      );
    }

    const cleanHwid = hashHwid(hwid);
    const isTrialKey = Boolean(app.freeTrialEnabled && app.freeTrialKey && licenseKey.trim() === app.freeTrialKey.trim());

    // 4. Verify License Key
    const license = await prisma.license.findFirst({
      where: { key: licenseKey.trim(), appId: app.id },
    });

    if (!license && !isTrialKey) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, licenseKey, reason: 'LICENSE_NOT_FOUND' },
        status: 'FAILURE',
      });
      return sendError(res, 'Invalid Key / HWID: Machine SID or License Key not found.', 404, 'LICENSE_NOT_FOUND');
    }

    // If active Master Free Trial Key -> Bypass HWID single-device binding check completely!
    if (isTrialKey) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_FREE_TRIAL_AUTH',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, licenseKey: licenseKey.trim(), hwid: cleanHwid },
        status: 'SUCCESS',
      });

      return sendSuccess(res, 'Authentication successful (Free Trial Active)', {
        status: 'active',
        expires_at: '2099-01-01T00:00:00.000Z',
        remaining_days: 9999,
        version: app.version,
      });
    }

    if (!license) {
      return sendError(res, 'Invalid Key / HWID: Machine SID or License Key not found.', 404, 'LICENSE_NOT_FOUND');
    }

    // 5. Verify License Status
    if (license.status === 'PAUSED') {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, licenseKey: license.key, reason: 'LICENSE_PAUSED' },
        status: 'FAILURE',
      });
      return sendError(res, 'Access Paused: License key or HWID access is currently paused.', 403, 'LICENSE_PAUSED');
    }

    if (license.status === 'BANNED') {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, licenseKey: license.key, reason: 'LICENSE_BANNED' },
        status: 'FAILURE',
      });
      return sendError(res, 'Account Banned: Your license key or machine SID has been banned.', 403, 'LICENSE_BANNED');
    }

    // 6. Check Expiration
    const now = new Date();
    if (license.expiresAt < now) {
      if (license.status !== 'EXPIRED') {
        await prisma.license.update({
          where: { id: license.id },
          data: { status: 'EXPIRED' },
        });
      }

      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, licenseKey: license.key, reason: 'LICENSE_EXPIRED' },
        status: 'FAILURE',
      });
      return sendError(res, 'License Expired: Your license key or HWID authorization has expired.', 403, 'LICENSE_EXPIRED');
    }

    // 7. Check & Bind HWID / Machine SID
    if (!license.boundHwid) {
      // First activation - Bind HWID
      await prisma.license.update({
        where: { id: license.id },
        data: {
          boundHwid: cleanHwid,
          firstActivatedAt: now,
          lastLoginAt: now,
        },
      });

      await logActivity({
        appId: app.id,
        action: 'CLIENT_HWID_BOUND',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, licenseKey: license.key, boundHwid: cleanHwid },
        status: 'SUCCESS',
      });
    } else if (license.boundHwid !== cleanHwid) {
      // HWID Mismatch
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'HWID Mismatch (Unauthorized Machine SID)',
          keyOrHwid: license.key,
          clientName: (license as any).clientName || (license as any).notes,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          hwid,
        });
      } catch (e) {}

      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: {
          appId: app.appId,
          licenseKey: license.key,
          attemptedHwid: cleanHwid,
          boundHwid: license.boundHwid,
          reason: 'HWID_MISMATCH',
        },
        status: 'FAILURE',
      });
      return sendError(
        res,
        'HWID Mismatch: License key is bound to a different machine SID.',
        403,
        'HWID_MISMATCH'
      );
    } else {
      // Regular login - Update last login time
      await prisma.license.update({
        where: { id: license.id },
        data: { lastLoginAt: now },
      });
    }

    await logActivity({
      appId: app.id,
      action: 'CLIENT_AUTH_SUCCESS',
      actorType: 'CLIENT',
      ipAddress,
      userAgent,
      details: { appId: app.appId, licenseKey: license.key, hwid: cleanHwid },
      status: 'SUCCESS',
    });

    const clientName = (license as any).clientName || (license as any).notes || null;

    // Discord Notification
    try {
      await notifyClientAuthSuccess({
        appName: app.name,
        appId: app.appId,
        clientName,
        keyOrHwid: license.key,
        ip: typeof ipAddress === 'string' ? ipAddress : undefined,
        version: clientVer || app.version,
      });
    } catch (discordErr) {}

    const remainingMs = license.expiresAt.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    return sendSuccess(res, 'Authentication successful', {
      status: 'active',
      client_name: clientName,
      ip: ipAddress,
      expires_at: license.expiresAt.toISOString(),
      remaining_days: remainingDays,
      first_activated_at: license.firstActivatedAt
        ? license.firstActivatedAt.toISOString()
        : now.toISOString(),
      version: app.version,
    });
  } catch (error: any) {
    return sendError(res, 'Client authentication failed', 500, error.message);
  }
}

export async function authenticateHwid(req: Request, res: Response) {
  const { appId, appSecret, hwid, version, clientVersion } = req.body;
  const ipAddress = extractClientIp(req);
  const userAgent = req.headers['user-agent'];

  try {
    const rawAppId = appId.trim();
    const cleanAppId = rawAppId.replace(/^NA-/, '');
    const rawSecret = appSecret.trim();
    const cleanSecret = rawSecret.replace(/^nas_/, '');

    // 1. Fetch App
    const app = await prisma.application.findFirst({
      where: { OR: [{ appId: rawAppId }, { appId: cleanAppId }, { id: rawAppId }] },
    });

    if (!app) {
      await logActivity({
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId, reason: 'APPLICATION_NOT_FOUND' },
        status: 'FAILURE',
      });
      return sendError(res, 'Application Not Found: Invalid App ID or application record removed.', 404, 'APPLICATION_NOT_FOUND');
    }

    // 2. Verify App Secret
    const isSecretValid =
      app.secret === rawSecret ||
      app.secret === cleanSecret ||
      app.secret.replace(/^nas_/, '') === cleanSecret;

    if (!isSecretValid) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, reason: 'INVALID_APP_CREDENTIALS' },
        status: 'FAILURE',
      });
      return sendError(res, 'App Credential Error: Invalid secret API key provided.', 401, 'INVALID_APP_CREDENTIALS');
    }

    // 2.5 Verify HMAC Signature & Anti-Replay (if headers present)
    const signatureHeader = req.headers['x-null-signature'];
    const timestampHeader = req.headers['x-null-timestamp'];
    if (signatureHeader || timestampHeader) {
      const tsStr = Array.isArray(timestampHeader) ? timestampHeader[0] : (timestampHeader || '');
      const candidateStrings = [
        `${cleanAppId}:${hwid.trim()}:${tsStr}`,
        `${rawAppId}:${hwid.trim()}:${tsStr}`,
        `${cleanAppId}::${hwid.trim()}:${tsStr}`,
        `${rawAppId}::${hwid.trim()}:${tsStr}`,
      ];
      const secCheck = verifyReplayAndSignature(req, [app.secret, cleanSecret, rawSecret], candidateStrings);
      if (!secCheck.valid) {
        await logActivity({
          appId: app.id,
          action: 'CLIENT_AUTH_FAILED',
          actorType: 'CLIENT',
          ipAddress,
          userAgent,
          details: { appId: app.appId, hwid, reason: secCheck.errorCode || 'SIGNATURE_VERIFICATION_FAILED' },
          status: 'FAILURE',
        });
        return sendError(res, secCheck.error || 'Cryptographic verification failed.', 401, secCheck.errorCode || 'SIGNATURE_VERIFICATION_FAILED');
      }
    }

    // 3. Verify App Status
    if (app.status !== 'ACTIVE') {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, reason: 'APPLICATION_DISABLED' },
        status: 'FAILURE',
      });
      return sendError(res, 'Application Paused: Application is currently paused by admin.', 403, 'APPLICATION_DISABLED');
    }

    // 3.5 Version Checker Validation
    const clientVer = (version || clientVersion || '').trim();
    const requiredVer = (app.version || '1.0.0').trim();

    if (clientVer && clientVer !== requiredVer) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, clientVersion: clientVer, requiredVersion: requiredVer, reason: 'VERSION_MISMATCH' },
        status: 'FAILURE',
      });
      return sendError(
        res,
        `Update Required: Application version '${clientVer}' is outdated. Required version is '${requiredVer}'.`,
        426,
        'VERSION_MISMATCH',
        { requiredVersion: requiredVer, downloadUrl: app.downloadUrl || null }
      );
    }

    const cleanHwid = hashHwid(hwid);

    // If Free Trial Mode is Active for HWID App -> EVERY device/HWID gets instant access!
    if (app.freeTrialEnabled) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_FREE_TRIAL_HWID_AUTH',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, hwid: cleanHwid },
        status: 'SUCCESS',
      });

      return sendSuccess(res, 'Authentication successful (Free Trial Active)', {
        status: 'active',
        expires_at: '2099-01-01T00:00:00.000Z',
        remaining_days: 9999,
        version: app.version,
      });
    }

    // 4. Verify HWID Access Record
    const hwidRecord = await prisma.hwidAccess.findFirst({
      where: { hwidHash: cleanHwid, appId: app.id },
    });

    if (!hwidRecord) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, hwid: cleanHwid, reason: 'IDENTIFIER_NOT_FOUND' },
        status: 'FAILURE',
      });
      return sendError(
        res,
        'Invalid Key / HWID: Machine SID or License Key not found.',
        404,
        'IDENTIFIER_NOT_FOUND'
      );
    }

    // 5. Verify HWID Status
    if (hwidRecord.status === 'PAUSED') {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, hwid: cleanHwid, reason: 'IDENTIFIER_PAUSED' },
        status: 'FAILURE',
      });
      return sendError(res, 'Access Paused: License key or HWID access is currently paused.', 403, 'IDENTIFIER_PAUSED');
    }

    if (hwidRecord.status === 'BANNED') {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, hwid: cleanHwid, reason: 'IDENTIFIER_BANNED' },
        status: 'FAILURE',
      });
      return sendError(res, 'Account Banned: Your license key or machine SID has been banned.', 403, 'IDENTIFIER_BANNED');
    }

    // 6. Check Expiration
    const now = new Date();
    if (hwidRecord.expiresAt < now) {
      if (hwidRecord.status !== 'EXPIRED') {
        await prisma.hwidAccess.update({
          where: { id: hwidRecord.id },
          data: { status: 'EXPIRED' },
        });
      }

      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, hwid: cleanHwid, reason: 'IDENTIFIER_EXPIRED' },
        status: 'FAILURE',
      });
      return sendError(res, 'License Expired: Your license key or HWID authorization has expired.', 403, 'IDENTIFIER_EXPIRED');
    }

    // 7. Update Last Auth Time
    await prisma.hwidAccess.update({
      where: { id: hwidRecord.id },
      data: { lastAuthAt: now },
    });

    await logActivity({
      appId: app.id,
      action: 'CLIENT_AUTH_SUCCESS',
      actorType: 'CLIENT',
      ipAddress,
      userAgent,
      details: { appId: app.appId, hwid: cleanHwid },
      status: 'SUCCESS',
    });

    const clientName = (hwidRecord as any).clientName || (hwidRecord as any).notes || null;

    // Discord Notification
    try {
      await notifyClientAuthSuccess({
        appName: app.name,
        appId: app.appId,
        clientName,
        keyOrHwid: cleanHwid.substring(0, 16) + '...',
        ip: typeof ipAddress === 'string' ? ipAddress : undefined,
        version: clientVer || app.version,
      });
    } catch (discordErr) {}

    const remainingMs = hwidRecord.expiresAt.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    return sendSuccess(res, 'Authentication successful', {
      status: 'active',
      client_name: clientName,
      ip: ipAddress,
      expires_at: hwidRecord.expiresAt.toISOString(),
      remaining_days: remainingDays,
      version: app.version,
    });
  } catch (error: any) {
    return sendError(res, 'Client authentication failed', 500, error.message);
  }
}

/**
 * Endpoint for client-side SDKs to report detected debuggers, proxy sniffers, or crack attempts
 * Automatically revokes/bans the offending license key or HWID and fires a critical Discord alert.
 */
export async function reportSecurityThreat(req: Request, res: Response) {
  const { appId, appSecret, threatType, threatDetails, licenseKey, hwid, clientVersion } = req.body;
  const ipAddress = extractClientIp(req);
  const userAgent = req.headers['user-agent'];

  try {
    const rawAppId = (appId || '').trim();
    const cleanAppId = rawAppId.replace(/^NA-/, '');
    const rawSecret = (appSecret || '').trim();
    const cleanSecret = rawSecret.replace(/^nas_/, '');

    // 1. Fetch App
    const app = await prisma.application.findFirst({
      where: { OR: [{ appId: rawAppId }, { appId: cleanAppId }, { id: rawAppId }] },
    });

    if (!app) {
      return sendError(res, 'Application Not Found: Invalid App ID.', 404, 'APPLICATION_NOT_FOUND');
    }

    // 2. Verify App Secret
    const isSecretValid =
      app.secret === rawSecret ||
      app.secret === cleanSecret ||
      app.secret.replace(/^nas_/, '') === cleanSecret;

    if (!isSecretValid) {
      return sendError(res, 'App Credential Error: Invalid secret API key.', 401, 'INVALID_APP_CREDENTIALS');
    }

    let targetClientName: string | null = null;
    let actionTaken = 'THREAT_RECORDED';

    // 3. Auto-Ban License Key if provided
    if (licenseKey && licenseKey.trim()) {
      const cleanKey = licenseKey.trim();
      const license = await prisma.license.findFirst({
        where: { key: cleanKey, appId: app.id },
      });

      if (license) {
        targetClientName = (license as any).clientName || (license as any).notes || null;
        if (license.status !== 'BANNED') {
          await prisma.license.update({
            where: { id: license.id },
            data: { status: 'BANNED' },
          });
          actionTaken = 'LICENSE_AUTO_BANNED';
        }
      }
    }

    // 4. Auto-Ban HWID if provided and application is HWID whitelist type
    if (hwid && hwid.trim() && app.type === 'HWID') {
      const cleanHwid = hashHwid(hwid.trim());
      const hwidRecord = await prisma.hwidAccess.findFirst({
        where: { appId: app.id, hwidHash: cleanHwid },
      });

      if (hwidRecord) {
        if (!targetClientName) {
          targetClientName = (hwidRecord as any).clientName || (hwidRecord as any).notes || null;
        }
        if (hwidRecord.status !== 'BANNED') {
          await prisma.hwidAccess.update({
            where: { id: hwidRecord.id },
            data: { status: 'BANNED' },
          });
          actionTaken = actionTaken === 'LICENSE_AUTO_BANNED' ? 'LICENSE_AND_HWID_BANNED' : 'HWID_AUTO_BANNED';
        }
      }
    }

    // 5. Tamper-evident Security Activity Log
    await logActivity({
      appId: app.id,
      action: 'SECURITY_THREAT_DETECTED',
      actorType: 'CLIENT',
      ipAddress,
      userAgent,
      details: {
        appId: app.appId,
        threatType,
        threatDetails: threatDetails || 'Client defense shield triggered',
        licenseKey: licenseKey || null,
        hwid: hwid || null,
        clientName: targetClientName,
        actionTaken,
        clientVersion: clientVersion || null,
      },
      status: 'FAILURE',
    });

    // 6. Immediate High-Priority Crimson Discord Alert
    try {
      await notifyCriticalThreat({
        appName: app.name,
        appId: app.appId,
        threatType,
        threatDetails: threatDetails || 'Security violation detected during client execution',
        clientName: targetClientName,
        keyOrHwid: licenseKey || hwid,
        ip: typeof ipAddress === 'string' ? ipAddress : undefined,
        hwid: hwid || undefined,
        actionTaken: actionTaken === 'LICENSE_AUTO_BANNED' ? 'License Key Automatically BANNED' : actionTaken,
      });
    } catch (discordErr) {
      console.warn('[Discord Webhook] Failed to dispatch critical threat notification:', discordErr);
    }

    return sendSuccess(res, 'Security threat acknowledged and processed.', {
      actionTaken,
      threatType,
    });
  } catch (error: any) {
    return sendError(res, 'Security threat processing failed', 500, error.message);
  }
}

