import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { hashHwid } from '../services/hash.service.js';
import { logActivity } from '../services/logger.service.js';
import { notifyClientAuthSuccess, notifySecurityAlert } from '../services/discord.service.js';
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

export const userAuthSchema = z.object({
  appId: z.string().min(1, 'appId is required'),
  appSecret: z.string().min(1, 'appSecret is required'),
  username: z.string().min(1, 'username is required'),
  password: z.string().min(1, 'password is required'),
  hwid: z.string().min(1, 'hwid/identifier is required'),
  version: z.string().optional(),
  clientVersion: z.string().optional(),
});

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
      const now = new Date();
      await prisma.license.updateMany({
        where: { key: licenseKey.trim(), appId: app.id },
        data: { lastLoginAt: now },
      }).catch(() => {});

      await logActivity({
        appId: app.id,
        action: 'CLIENT_FREE_TRIAL_AUTH',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, licenseKey: licenseKey.trim(), hwid: cleanHwid },
        status: 'SUCCESS',
      });

      try {
        await notifyClientAuthSuccess({
          appName: app.name,
          appId: app.appId,
          clientName: 'Free Trial Key User',
          keyOrHwid: licenseKey.trim(),
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          version: clientVer || app.version,
        });
      } catch (discordErr) {}

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
    console.error('[Authenticate License Error]:', error);
    return sendError(res, 'Client authentication failed due to a server error.', 500);
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
      const now = new Date();
      await prisma.hwidAccess.updateMany({
        where: { hwidHash: cleanHwid, appId: app.id },
        data: { lastAuthAt: now },
      }).catch(() => {});

      await logActivity({
        appId: app.id,
        action: 'CLIENT_FREE_TRIAL_HWID_AUTH',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, hwid: cleanHwid },
        status: 'SUCCESS',
      });

      try {
        await notifyClientAuthSuccess({
          appName: app.name,
          appId: app.appId,
          clientName: 'Free Trial Device',
          keyOrHwid: cleanHwid.substring(0, 16) + '...',
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          version: clientVer || app.version,
        });
      } catch (discordErr) {}

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
    console.error('[Authenticate HWID Error]:', error);
    return sendError(res, 'Client authentication failed due to a server error.', 500);
  }
}

export async function authenticateUser(req: Request, res: Response) {
  const { appId, appSecret, username, password, hwid, version, clientVersion } = req.body;
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
    const trimmedUsername = username.trim();
    const isTrialUser = Boolean(
      app.freeTrialEnabled &&
      (app.freeTrialKey ? trimmedUsername.toLowerCase() === app.freeTrialKey.trim().toLowerCase() : true)
    );

    if (isTrialUser) {
      const now = new Date();
      await (prisma as any).clientUser.updateMany({
        where: { username: { equals: trimmedUsername, mode: 'insensitive' }, appId: app.id },
        data: { lastLoginAt: now },
      }).catch(() => {});

      await logActivity({
        appId: app.id,
        action: 'CLIENT_FREE_TRIAL_USER_AUTH',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, username: trimmedUsername, hwid: cleanHwid },
        status: 'SUCCESS',
      });

      try {
        await notifyClientAuthSuccess({
          appName: app.name,
          appId: app.appId,
          clientName: 'Free Trial User Account',
          keyOrHwid: trimmedUsername,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          version: clientVer || app.version,
        });
      } catch (discordErr) {}

      return sendSuccess(res, 'Authentication successful (Free Trial Active)', {
        status: 'active',
        username: trimmedUsername,
        expires_at: '2099-01-01T00:00:00.000Z',
        remaining_days: 9999,
        version: app.version,
      });
    }

    // 4. Verify User Account
    const user: any = await (prisma as any).clientUser.findFirst({
      where: {
        appId: app.id,
        username: { equals: trimmedUsername, mode: 'insensitive' },
      },
    });

    if (!user) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, username: trimmedUsername, reason: 'USER_NOT_FOUND' },
        status: 'FAILURE',
      });
      return sendError(res, 'Invalid Credentials: Username or Password incorrect.', 404, 'USER_NOT_FOUND');
    }

    // 5. Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, username: user.username, reason: 'INVALID_CREDENTIALS' },
        status: 'FAILURE',
      });
      return sendError(res, 'Invalid Credentials: Username or Password incorrect.', 401, 'INVALID_CREDENTIALS');
    }

    // 6. Check User Status
    if (user.status === 'PAUSED') {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, username: user.username, reason: 'USER_PAUSED' },
        status: 'FAILURE',
      });
      return sendError(res, 'Access Paused: User account access is currently paused.', 403, 'USER_PAUSED');
    }

    if (user.status === 'BANNED') {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, username: user.username, reason: 'USER_BANNED' },
        status: 'FAILURE',
      });
      return sendError(res, 'Account Banned: Your user account has been banned.', 403, 'USER_BANNED');
    }

    // 7. Check Expiration
    const now = new Date();
    if (user.expiresAt < now) {
      if (user.status !== 'EXPIRED') {
        await (prisma as any).clientUser.update({
          where: { id: user.id },
          data: { status: 'EXPIRED' },
        });
      }

      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, username: user.username, reason: 'USER_EXPIRED' },
        status: 'FAILURE',
      });
      return sendError(res, 'Account Expired: Your user account authorization has expired.', 403, 'USER_EXPIRED');
    }

    // 8. Check & Bind HWID
    if (!user.boundHwid) {
      // First activation - Bind HWID
      await (prisma as any).clientUser.update({
        where: { id: user.id },
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
        details: { appId: app.appId, username: user.username, boundHwid: cleanHwid },
        status: 'SUCCESS',
      });
    } else if (user.boundHwid !== cleanHwid) {
      // HWID Mismatch
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'HWID Mismatch (Unauthorized Machine SID)',
          keyOrHwid: user.username,
          clientName: user.clientName || user.notes,
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
          username: user.username,
          attemptedHwid: cleanHwid,
          boundHwid: user.boundHwid,
          reason: 'HWID_MISMATCH',
        },
        status: 'FAILURE',
      });
      return sendError(
        res,
        'HWID Mismatch: User account is bound to a different machine SID.',
        403,
        'HWID_MISMATCH'
      );
    } else {
      // Regular login - Update last login time
      await (prisma as any).clientUser.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
      });
    }

    await logActivity({
      appId: app.id,
      action: 'CLIENT_AUTH_SUCCESS',
      actorType: 'CLIENT',
      ipAddress,
      userAgent,
      details: { appId: app.appId, username: user.username, hwid: cleanHwid },
      status: 'SUCCESS',
    });

    const clientName = user.clientName || user.notes || null;

    // Discord Notification
    try {
      await notifyClientAuthSuccess({
        appName: app.name,
        appId: app.appId,
        clientName: clientName ? `${user.username} (${clientName})` : user.username,
        keyOrHwid: user.username,
        ip: typeof ipAddress === 'string' ? ipAddress : undefined,
        version: clientVer || app.version,
      });
    } catch (discordErr) {}

    const remainingMs = user.expiresAt.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    return sendSuccess(res, 'Authentication successful', {
      status: 'active',
      username: user.username,
      client_name: clientName,
      ip: ipAddress,
      expires_at: user.expiresAt.toISOString(),
      remaining_days: remainingDays,
      first_activated_at: user.firstActivatedAt
        ? user.firstActivatedAt.toISOString()
        : now.toISOString(),
      version: app.version,
    });
  } catch (error: any) {
    console.error('[Authenticate User Error]:', error);
    return sendError(res, 'Client authentication failed due to a server error.', 500);
  }
}
