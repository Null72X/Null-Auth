import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { hashHwid } from '../services/hash.service.js';
import { logActivity } from '../services/logger.service.js';

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

export async function authenticateLicense(req: Request, res: Response) {
  const { appId, appSecret, licenseKey, hwid, version, clientVersion } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    // 1. Fetch App
    const app = await prisma.application.findFirst({
      where: { OR: [{ appId }, { id: appId }] },
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
    if (app.secret !== appSecret) {
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

    const remainingMs = license.expiresAt.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    return sendSuccess(res, 'Authentication successful', {
      status: 'active',
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
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    // 1. Fetch App
    const app = await prisma.application.findFirst({
      where: { OR: [{ appId }, { id: appId }] },
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
    if (app.secret !== appSecret) {
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

    const remainingMs = hwidRecord.expiresAt.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    return sendSuccess(res, 'Authentication successful', {
      status: 'active',
      expires_at: hwidRecord.expiresAt.toISOString(),
      remaining_days: remainingDays,
      version: app.version,
    });
  } catch (error: any) {
    return sendError(res, 'Client authentication failed', 500, error.message);
  }
}
