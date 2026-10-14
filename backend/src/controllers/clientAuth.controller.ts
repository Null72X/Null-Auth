import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { hashHwid } from '../services/hash.service.js';
import { logActivity } from '../services/logger.service.js';
import { notifyClientAuthSuccess, notifySecurityAlert } from '../services/discord.service.js';
import { extractClientIp } from '../utils/ip.js';

export function signClientPayload(
  secret: string,
  appId: string,
  identifier: string,
  status: string,
  expiresAt: string,
  recordId: string,
  cleanHwid: string
) {
  const normSecret = secret.trim().replace(/^nas_/, '');
  const normAppId = appId.trim().replace(/^NA-/, '');
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const payloadToSign = `${normAppId}:${identifier}:${timestamp}:${nonce}:${status}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', normSecret).update(payloadToSign).digest('hex');

  const tokenHmac = crypto
    .createHmac('sha256', normSecret)
    .update(`${normAppId}:${recordId}:${cleanHwid}:${timestamp}:${nonce}`)
    .digest('hex');

  const sessionToken = `${recordId}:${timestamp}:${nonce}:${tokenHmac}`;

  return {
    timestamp,
    nonce,
    signature,
    session_token: sessionToken,
  };
}

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
  const cleanHwid = hashHwid(hwid);

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

    if (!clientVer || clientVer !== requiredVer) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, clientVersion: clientVer || 'none', requiredVersion: requiredVer, reason: 'VERSION_MISMATCH' },
        status: 'FAILURE',
      });
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Client Version Mismatch',
          keyOrHwid: licenseKey,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || 'none',
        });
      } catch (e) {}
      return sendError(
        res,
        clientVer
          ? `Update Required: Application version '${clientVer}' is outdated. Required version is '${requiredVer}'.`
          : `Update Required: Application version must be provided. Required version is '${requiredVer}'.`,
        426,
        'VERSION_MISMATCH',
        { requiredVersion: requiredVer, downloadUrl: app.downloadUrl || null }
      );
    }

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
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Invalid License Key Attempt',
          keyOrHwid: licenseKey,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || app.version,
        });
      } catch (e) {}
      return sendError(res, 'Invalid Key / HWID: Hardware ID or License Key not found.', 404, 'LICENSE_NOT_FOUND');
    }

    // If active Master Free Trial Key -> Bypass HWID single-device binding check completely!
    if (isTrialKey) {
      if (license && (license.status === 'EXPIRED' || license.status === 'PAUSED' || license.status === 'BANNED' || (license.expiresAt && license.expiresAt <= new Date()))) {
        return sendError(res, `License is ${license.status.toLowerCase()}. Access denied.`, 403, 'LICENSE_INACTIVE');
      }

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
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          version: clientVer || app.version,
          isFreeTrial: true,
        });
      } catch (discordErr) {}

      const trialExpires = (license && license.expiresAt) ? license.expiresAt : new Date('2099-01-01T00:00:00.000Z');
      const remainingMs = trialExpires.getTime() - now.getTime();
      const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

      const proof = signClientPayload(
        app.secret,
        app.appId,
        licenseKey,
        'active',
        trialExpires.toISOString(),
        license?.id || 'TRIAL_LIC',
        cleanHwid
      );

      return sendSuccess(res, 'Authentication successful (Free Trial Active)', {
        status: 'active',
        expires_at: trialExpires.toISOString(),
        remaining_days: remainingDays,
        version: app.version,
        timestamp: proof.timestamp,
        nonce: proof.nonce,
        signature: proof.signature,
        session_token: proof.session_token,
      });
    }

    if (!license) {
      return sendError(res, 'Invalid Key / HWID: Hardware ID or License Key not found.', 404, 'LICENSE_NOT_FOUND');
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
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Paused License Access Blocked',
          keyOrHwid: license.key,
          clientName: (license as any).clientName || (license as any).notes,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || app.version,
        });
      } catch (e) {}
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
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Banned License Access Blocked',
          keyOrHwid: license.key,
          clientName: (license as any).clientName || (license as any).notes,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || app.version,
        });
      } catch (e) {}
      return sendError(res, 'Account Banned: Your license key or hardware ID has been banned.', 403, 'LICENSE_BANNED');
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
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Expired License Access Blocked',
          keyOrHwid: license.key,
          clientName: (license as any).clientName || (license as any).notes,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || app.version,
        });
      } catch (e) {}
      return sendError(res, 'License Expired: Your license key or HWID authorization has expired.', 403, 'LICENSE_EXPIRED');
    }

    // 7. Check & Bind HWID
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
    } else if (license.boundHwid.toLowerCase() !== cleanHwid.toLowerCase()) {
      // HWID Mismatch
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'HWID Mismatch (Unauthorized Hardware ID)',
          keyOrHwid: license.key,
          clientName: (license as any).clientName || (license as any).notes,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          hwid: cleanHwid,
          clientVersion: clientVer || app.version,
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
        'HWID Mismatch: License key is bound to a different hardware ID.',
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
        hwid: cleanHwid,
        ip: typeof ipAddress === 'string' ? ipAddress : undefined,
        version: clientVer || app.version,
      });
    } catch (discordErr) {}

    const remainingMs = license.expiresAt.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    const expiresAtIso = license.expiresAt.toISOString();
    const proof = signClientPayload(
      app.secret,
      app.appId,
      license.key,
      'active',
      expiresAtIso,
      license.id,
      cleanHwid
    );

    return sendSuccess(res, 'Authentication successful', {
      status: 'active',
      client_name: clientName,
      ip: ipAddress,
      expires_at: expiresAtIso,
      remaining_days: remainingDays,
      first_activated_at: license.firstActivatedAt
        ? license.firstActivatedAt.toISOString()
        : now.toISOString(),
      version: app.version,
      timestamp: proof.timestamp,
      nonce: proof.nonce,
      signature: proof.signature,
      session_token: proof.session_token,
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
  const cleanHwid = hashHwid(hwid);

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

    if (!clientVer || clientVer !== requiredVer) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, clientVersion: clientVer || 'none', requiredVersion: requiredVer, reason: 'VERSION_MISMATCH' },
        status: 'FAILURE',
      });
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Client Version Mismatch',
          keyOrHwid: cleanHwid,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || 'none',
        });
      } catch (e) {}
      return sendError(
        res,
        clientVer
          ? `Update Required: Application version '${clientVer}' is outdated. Required version is '${requiredVer}'.`
          : `Update Required: Application version must be provided. Required version is '${requiredVer}'.`,
        426,
        'VERSION_MISMATCH',
        { requiredVersion: requiredVer, downloadUrl: app.downloadUrl || null }
      );
    }

    // 4. Verify HWID Access Record
    const hwidRecord = await prisma.hwidAccess.findFirst({
      where: {
        appId: app.id,
        OR: [
          { hwidHash: cleanHwid },
          { hwidHash: { equals: cleanHwid, mode: 'insensitive' } },
        ],
      },
    });

    // Explicit Ban & Pause Enforcement (Takes precedence even during Free Trial)
    if (hwidRecord && hwidRecord.status === 'BANNED') {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, hwid: cleanHwid, reason: 'HWID_BANNED' },
        status: 'FAILURE',
      });
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Banned Hardware ID Blocked',
          keyOrHwid: cleanHwid,
          clientName: (hwidRecord as any).clientName || (hwidRecord as any).notes,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || app.version,
        });
      } catch (e) {}
      return sendError(res, 'Account Banned: Your hardware ID has been banned.', 403, 'HWID_BANNED');
    }

    if (hwidRecord && hwidRecord.status === 'PAUSED') {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, hwid: cleanHwid, reason: 'HWID_PAUSED' },
        status: 'FAILURE',
      });
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Paused Hardware ID Access Blocked',
          keyOrHwid: cleanHwid,
          clientName: (hwidRecord as any).clientName || (hwidRecord as any).notes,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || app.version,
        });
      } catch (e) {}
      return sendError(res, 'Access Paused: License key or HWID access is currently paused.', 403, 'HWID_PAUSED');
    }

    // If Free Trial Mode is Active for HWID App -> Non-banned devices get instant access!
    if (app.freeTrialEnabled) {
      let isTrialExpired = false;
      let remainingDays = 9999;
      let expiresAtStr = '2099-01-01T00:00:00.000Z';

      if (app.freeTrialKey && app.freeTrialKey !== 'LIFETIME') {
        const parsedExp = new Date(app.freeTrialKey);
        if (!isNaN(parsedExp.getTime())) {
          expiresAtStr = parsedExp.toISOString();
          const diff = parsedExp.getTime() - Date.now();
          if (diff <= 0) {
            isTrialExpired = true;
            remainingDays = 0;
          } else {
            remainingDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
          }
        }
      }

      if (isTrialExpired) {
        return sendError(res, 'Free Trial Expired: Free trial access for this application has concluded.', 403, 'TRIAL_EXPIRED');
      }

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
          keyOrHwid: cleanHwid,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          version: clientVer || app.version,
          isFreeTrial: true,
        });
      } catch (discordErr) {}

      const proof = signClientPayload(
        app.secret,
        app.appId,
        cleanHwid,
        'active',
        expiresAtStr,
        'TRIAL_HWID',
        cleanHwid
      );

      return sendSuccess(res, 'Authentication successful (Free Trial Active)', {
        status: 'active',
        expires_at: expiresAtStr,
        remaining_days: remainingDays >= 1000 ? 9999 : remainingDays,
        version: app.version,
        timestamp: proof.timestamp,
        nonce: proof.nonce,
        signature: proof.signature,
        session_token: proof.session_token,
      });
    }

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
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Unauthorized Hardware ID (Not Whitelisted)',
          keyOrHwid: cleanHwid,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || app.version,
        });
      } catch (e) {}
      return sendError(
        res,
        'Invalid Key / HWID: Hardware ID or License Key not found.',
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
      return sendError(res, 'Account Banned: Your hardware ID has been banned.', 403, 'IDENTIFIER_BANNED');
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
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Expired Hardware ID Access Blocked',
          keyOrHwid: cleanHwid,
          clientName: (hwidRecord as any).clientName || (hwidRecord as any).notes,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || app.version,
        });
      } catch (e) {}
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
        keyOrHwid: cleanHwid,
        hwid: cleanHwid,
        ip: typeof ipAddress === 'string' ? ipAddress : undefined,
        version: clientVer || app.version,
      });
    } catch (discordErr) {}

    const remainingMs = hwidRecord.expiresAt.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    const expiresAtIso = hwidRecord.expiresAt.toISOString();
    const proof = signClientPayload(
      app.secret,
      app.appId,
      cleanHwid,
      'active',
      expiresAtIso,
      hwidRecord.id,
      cleanHwid
    );

    return sendSuccess(res, 'Authentication successful', {
      status: 'active',
      client_name: clientName,
      ip: ipAddress,
      expires_at: expiresAtIso,
      remaining_days: remainingDays,
      version: app.version,
      timestamp: proof.timestamp,
      nonce: proof.nonce,
      signature: proof.signature,
      session_token: proof.session_token,
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
  const cleanHwid = hashHwid(hwid);

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

    if (!clientVer || clientVer !== requiredVer) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, clientVersion: clientVer || 'none', requiredVersion: requiredVer, reason: 'VERSION_MISMATCH' },
        status: 'FAILURE',
      });
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Client Version Mismatch',
          keyOrHwid: username,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || 'none',
        });
      } catch (e) {}
      return sendError(
        res,
        clientVer
          ? `Update Required: Application version '${clientVer}' is outdated. Required version is '${requiredVer}'.`
          : `Update Required: Application version must be provided. Required version is '${requiredVer}'.`,
        426,
        'VERSION_MISMATCH',
        { requiredVersion: requiredVer, downloadUrl: app.downloadUrl || null }
      );
    }

    const trimmedUsername = username.trim();
    const isTrialUser = Boolean(
      app.freeTrialEnabled &&
      app.freeTrialKey &&
      trimmedUsername.toLowerCase() === app.freeTrialKey.trim().toLowerCase()
    );

    if (isTrialUser) {
      const trialUser: any = await (prisma as any).clientUser.findFirst({
        where: {
          appId: app.id,
          username: { equals: trimmedUsername, mode: 'insensitive' },
        },
      });

      if (!trialUser) {
        await logActivity({
          appId: app.id,
          action: 'CLIENT_AUTH_FAILED',
          actorType: 'CLIENT',
          ipAddress,
          userAgent,
          details: { appId: app.appId, username: trimmedUsername, reason: 'TRIAL_USER_NOT_FOUND' },
          status: 'FAILURE',
        });
        try {
          await notifySecurityAlert({
            appName: app.name,
            appId: app.appId,
            reason: 'Free Trial User Account Not Found',
            keyOrHwid: trimmedUsername,
            hwid: cleanHwid,
            ip: typeof ipAddress === 'string' ? ipAddress : undefined,
            clientVersion: clientVer || app.version,
          });
        } catch (e) {}
        return sendError(res, 'Invalid Credentials: Free trial user account not found.', 404, 'USER_NOT_FOUND');
      }

      if (trialUser.status !== 'ACTIVE' || (trialUser.expiresAt && trialUser.expiresAt <= new Date())) {
        await logActivity({
          appId: app.id,
          action: 'CLIENT_AUTH_FAILED',
          actorType: 'CLIENT',
          ipAddress,
          userAgent,
          details: { appId: app.appId, username: trimmedUsername, reason: 'TRIAL_EXPIRED_OR_INACTIVE' },
          status: 'FAILURE',
        });
        return sendError(res, 'Free trial access has expired or is paused.', 403, 'TRIAL_EXPIRED');
      }

      const isPasswordValid = await bcrypt.compare(password, trialUser.passwordHash);
      if (!isPasswordValid) {
        await logActivity({
          appId: app.id,
          action: 'CLIENT_AUTH_FAILED',
          actorType: 'CLIENT',
          ipAddress,
          userAgent,
          details: { appId: app.appId, username: trimmedUsername, reason: 'INVALID_CREDENTIALS' },
          status: 'FAILURE',
        });
        try {
          await notifySecurityAlert({
            appName: app.name,
            appId: app.appId,
            reason: 'Free Trial Password Incorrect',
            keyOrHwid: trimmedUsername,
            hwid: cleanHwid,
            ip: typeof ipAddress === 'string' ? ipAddress : undefined,
            clientVersion: clientVer || app.version,
          });
        } catch (e) {}
        return sendError(res, 'Invalid Credentials: Username or Password incorrect.', 401, 'INVALID_CREDENTIALS');
      }

      const now = new Date();
      await (prisma as any).clientUser.updateMany({
        where: { id: trialUser.id },
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
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          version: clientVer || app.version,
          isFreeTrial: true,
        });
      } catch (discordErr) {}

      const trialExpires = trialUser.expiresAt || new Date('2099-01-01T00:00:00.000Z');
      const remainingMs = trialExpires.getTime() - now.getTime();
      const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

      const trialExpiresIso = trialExpires.toISOString();
      const proof = signClientPayload(
        app.secret,
        app.appId,
        trimmedUsername,
        'active',
        trialExpiresIso,
        trialUser.id || 'TRIAL_USER',
        cleanHwid
      );

      return sendSuccess(res, 'Authentication successful (Free Trial Active)', {
        status: 'active',
        username: trimmedUsername,
        expires_at: trialExpiresIso,
        remaining_days: remainingDays,
        version: app.version,
        timestamp: proof.timestamp,
        nonce: proof.nonce,
        signature: proof.signature,
        session_token: proof.session_token,
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
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Unknown Username Attempt',
          keyOrHwid: trimmedUsername,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || app.version,
        });
      } catch (e) {}
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
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Invalid User Password Attempt',
          keyOrHwid: user.username,
          clientName: user.clientName || user.notes,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || app.version,
        });
      } catch (e) {}
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
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Paused User Account Blocked',
          keyOrHwid: user.username,
          clientName: user.clientName || user.notes,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || app.version,
        });
      } catch (e) {}
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
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Banned User Account Blocked',
          keyOrHwid: user.username,
          clientName: user.clientName || user.notes,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || app.version,
        });
      } catch (e) {}
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
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'Expired User Account Blocked',
          keyOrHwid: user.username,
          clientName: user.clientName || user.notes,
          hwid: cleanHwid,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          clientVersion: clientVer || app.version,
        });
      } catch (e) {}
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
    } else if (user.boundHwid.toLowerCase() !== cleanHwid.toLowerCase()) {
      // HWID Mismatch
      try {
        await notifySecurityAlert({
          appName: app.name,
          appId: app.appId,
          reason: 'HWID Mismatch (Unauthorized Hardware ID)',
          keyOrHwid: user.username,
          clientName: user.clientName || user.notes,
          ip: typeof ipAddress === 'string' ? ipAddress : undefined,
          hwid: cleanHwid,
          clientVersion: clientVer || app.version,
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
        'HWID Mismatch: User account is bound to a different hardware ID.',
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
        hwid: cleanHwid,
        ip: typeof ipAddress === 'string' ? ipAddress : undefined,
        version: clientVer || app.version,
      });
    } catch (discordErr) {}

    const remainingMs = user.expiresAt.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    const expiresAtIso = user.expiresAt.toISOString();
    const proof = signClientPayload(
      app.secret,
      app.appId,
      user.username,
      'active',
      expiresAtIso,
      user.id,
      cleanHwid
    );

    return sendSuccess(res, 'Authentication successful', {
      status: 'active',
      username: user.username,
      client_name: clientName,
      ip: ipAddress,
      expires_at: expiresAtIso,
      remaining_days: remainingDays,
      first_activated_at: user.firstActivatedAt
        ? user.firstActivatedAt.toISOString()
        : now.toISOString(),
      version: app.version,
      timestamp: proof.timestamp,
      nonce: proof.nonce,
      signature: proof.signature,
      session_token: proof.session_token,
    });
  } catch (error: any) {
    console.error('[Authenticate User Error]:', error);
    return sendError(res, 'Client authentication failed due to a server error.', 500);
  }
}

export const heartbeatSchema = z.object({
  appId: z.string().min(1, 'appId is required'),
  appSecret: z.string().min(1, 'appSecret is required'),
  sessionToken: z.string().min(1, 'sessionToken is required'),
  hwid: z.string().min(1, 'hwid is required'),
});

export async function clientHeartbeat(req: Request, res: Response) {
  const { appId, appSecret, sessionToken, hwid } = req.body;
  const rawAppId = (appId || '').trim();
  const cleanAppId = rawAppId.replace(/^NA-/, '');
  const rawSecret = (appSecret || '').trim();
  const cleanSecret = rawSecret.replace(/^nas_/, '');
  const cleanHwid = hashHwid(hwid || '');

  try {
    // 1. Fetch App
    const app = await prisma.application.findFirst({
      where: { OR: [{ appId: rawAppId }, { appId: cleanAppId }, { id: rawAppId }] },
    });

    if (!app) {
      return res.status(401).json({
        success: false,
        kill: true,
        message: 'Invalid Application credentials.',
      });
    }

    const isSecretValid =
      app.secret === rawSecret ||
      app.secret === cleanSecret ||
      app.secret.replace(/^nas_/, '') === cleanSecret;

    if (!isSecretValid || app.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        kill: true,
        message: 'Application has been paused or disabled by administrator.',
      });
    }

    // 2. Parse sessionToken: "recordId:timestamp:nonce:tokenHmac"
    const parts = (sessionToken || '').split(':');
    if (parts.length < 4) {
      return res.status(401).json({
        success: false,
        kill: true,
        message: 'Invalid session token format.',
      });
    }

    const [recordId, issueTimestampStr, issueNonce, clientTokenHmac] = parts;
    const issueTimestamp = parseInt(issueTimestampStr, 10);

    const normSecret = app.secret.trim().replace(/^nas_/, '');
    const normAppId = app.appId.trim().replace(/^NA-/, '');

    const expectedTokenHmac = crypto
      .createHmac('sha256', normSecret)
      .update(`${normAppId}:${recordId}:${cleanHwid}:${issueTimestamp}:${issueNonce}`)
      .digest('hex');

    const expectedTokenHmacRaw = crypto
      .createHmac('sha256', app.secret)
      .update(`${app.appId}:${recordId}:${cleanHwid}:${issueTimestamp}:${issueNonce}`)
      .digest('hex');

    if (clientTokenHmac !== expectedTokenHmac && clientTokenHmac !== expectedTokenHmacRaw) {
      return res.status(403).json({
        success: false,
        kill: true,
        message: 'Cryptographic session verification failed (Tampering detected).',
      });
    }

    const now = new Date();

    // 3. Verify record status in DB (Real-time Remote Kill)
    let isRecordValid = false;
    let identifier = recordId;

    if (app.type === 'LICENSE') {
      const lic = await prisma.license.findFirst({
        where: { id: recordId, appId: app.id },
      });
      if (lic && lic.status === 'ACTIVE' && lic.expiresAt > now) {
        if (!lic.boundHwid || lic.boundHwid.toLowerCase() === cleanHwid.toLowerCase()) {
          isRecordValid = true;
          identifier = lic.key;
          await prisma.license.update({ where: { id: lic.id }, data: { lastLoginAt: now } }).catch(() => {});
        }
      }
    } else if (app.type === 'USER_AUTH') {
      const u: any = await (prisma as any).clientUser.findFirst({
        where: { id: recordId, appId: app.id },
      });
      if (u && (u.status === 'ACTIVE' || !u.status) && u.expiresAt > now) {
        if (!u.boundHwid || u.boundHwid.toLowerCase() === cleanHwid.toLowerCase()) {
          isRecordValid = true;
          identifier = u.username;
          await (prisma as any).clientUser.update({ where: { id: u.id }, data: { lastLoginAt: now } }).catch(() => {});
        }
      }
    } else {
      const h = await prisma.hwidAccess.findFirst({
        where: { id: recordId, appId: app.id },
      });
      if (h && h.status === 'ACTIVE' && h.expiresAt > now) {
        isRecordValid = true;
        identifier = h.hwidHash;
        await prisma.hwidAccess.update({ where: { id: h.id }, data: { lastAuthAt: now } }).catch(() => {});
      }
    }

    // Free trial bypass check
    if (!isRecordValid && app.freeTrialEnabled) {
      if (recordId === 'TRIAL_LIC' || recordId === 'TRIAL_HWID' || recordId === 'TRIAL_USER') {
        isRecordValid = true;
      }
    }

    if (!isRecordValid) {
      return res.status(403).json({
        success: false,
        kill: true,
        message: 'Account or Hardware ID revoked, paused, expired, or banned by administrator.',
      });
    }

    // 4. Generate next signed heartbeat proof
    const nextTimestamp = Math.floor(Date.now() / 1000);
    const nextNonce = crypto.randomBytes(16).toString('hex');
    const nextSignature = crypto
      .createHmac('sha256', normSecret)
      .update(`${normAppId}:${identifier}:${nextTimestamp}:${nextNonce}:heartbeat_ok`)
      .digest('hex');

    return sendSuccess(res, 'Heartbeat verified', {
      kill: false,
      timestamp: nextTimestamp,
      nonce: nextNonce,
      signature: nextSignature,
      next_interval_sec: 45,
    });
  } catch {
    return res.status(500).json({
      success: false,
      kill: false,
      message: 'Heartbeat error.',
    });
  }
}
