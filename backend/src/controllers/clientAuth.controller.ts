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
});

export const hwidAuthSchema = z.object({
  appId: z.string().min(1, 'appId is required'),
  appSecret: z.string().min(1, 'appSecret is required'),
  hwid: z.string().min(1, 'hwid/identifier is required'),
});

export async function authenticateLicense(req: Request, res: Response) {
  const { appId, appSecret, licenseKey, hwid } = req.body;
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
      return sendError(res, 'Application not found', 404, 'APPLICATION_NOT_FOUND');
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
      return sendError(res, 'Invalid application credentials', 401, 'INVALID_APP_CREDENTIALS');
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
      return sendError(res, 'Application is currently paused or disabled', 403, 'APPLICATION_DISABLED');
    }

    // 4. Verify License
    const license = await prisma.license.findFirst({
      where: { key: licenseKey.trim(), appId: app.id },
    });

    if (!license) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, licenseKey, reason: 'LICENSE_NOT_FOUND' },
        status: 'FAILURE',
      });
      return sendError(res, 'License key not found', 404, 'LICENSE_NOT_FOUND');
    }

    // 5. Check License Status
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
      return sendError(res, 'License key is currently paused', 403, 'LICENSE_PAUSED');
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
      return sendError(res, 'License key has been banned', 403, 'LICENSE_BANNED');
    }

    // 6. Check Expiration
    const now = new Date();
    if (license.expiresAt <= now || license.status === 'EXPIRED') {
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
      return sendError(res, 'License key has expired', 403, 'LICENSE_EXPIRED');
    }

    // 7. Check HWID Binding
    const clientHwidHash = hashHwid(hwid);

    if (!license.boundHwid) {
      // First activation! Bind machine identifier
      await prisma.license.update({
        where: { id: license.id },
        data: {
          boundHwid: clientHwidHash,
          firstActivatedAt: now,
          lastLoginAt: now,
        },
      });

      await logActivity({
        appId: app.id,
        action: 'CLIENT_LICENSE_FIRST_ACTIVATION',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, licenseKey: license.key, boundHwid: clientHwidHash },
        status: 'SUCCESS',
      });
    } else if (license.boundHwid !== clientHwidHash) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, licenseKey: license.key, reason: 'HWID_MISMATCH' },
        status: 'FAILURE',
      });
      return sendError(res, 'License key is bound to a different machine or user identifier', 403, 'HWID_MISMATCH');
    } else {
      // Valid subsequent login
      await prisma.license.update({
        where: { id: license.id },
        data: { lastLoginAt: now },
      });

      await logActivity({
        appId: app.id,
        action: 'CLIENT_LICENSE_AUTH_SUCCESS',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, licenseKey: license.key },
        status: 'SUCCESS',
      });
    }

    const diffTime = license.expiresAt.getTime() - now.getTime();
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return sendSuccess(res, 'Authentication successful', {
      status: 'active',
      expires_at: license.expiresAt.toISOString(),
      remaining_days: remainingDays,
      first_activated_at: (license.firstActivatedAt || now).toISOString(),
    });
  } catch (error: any) {
    return sendError(res, 'Client authentication error', 500, error.message);
  }
}

export async function authenticateHwid(req: Request, res: Response) {
  const { appId, appSecret, hwid } = req.body;
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
      return sendError(res, 'Application not found', 404, 'APPLICATION_NOT_FOUND');
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
      return sendError(res, 'Invalid application credentials', 401, 'INVALID_APP_CREDENTIALS');
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
      return sendError(res, 'Application is currently paused or disabled', 403, 'APPLICATION_DISABLED');
    }

    // 4. Verify HWID Entry
    const clientHwidHash = hashHwid(hwid);
    const hwidEntry = await prisma.hwidAccess.findUnique({
      where: {
        appId_hwidHash: {
          appId: app.id,
          hwidHash: clientHwidHash,
        },
      },
    });

    if (!hwidEntry) {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, hwidHash: clientHwidHash, reason: 'IDENTIFIER_NOT_FOUND' },
        status: 'FAILURE',
      });
      return sendError(res, 'Machine or user identifier is not authorized', 404, 'IDENTIFIER_NOT_FOUND');
    }

    // 5. Check Status
    if (hwidEntry.status === 'PAUSED') {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, hwidHash: clientHwidHash, reason: 'IDENTIFIER_PAUSED' },
        status: 'FAILURE',
      });
      return sendError(res, 'Identifier access is paused', 403, 'IDENTIFIER_PAUSED');
    }

    if (hwidEntry.status === 'BANNED') {
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, hwidHash: clientHwidHash, reason: 'IDENTIFIER_BANNED' },
        status: 'FAILURE',
      });
      return sendError(res, 'Identifier access has been banned', 403, 'IDENTIFIER_BANNED');
    }

    // 6. Check Expiration
    const now = new Date();
    if (hwidEntry.expiresAt <= now || hwidEntry.status === 'EXPIRED') {
      if (hwidEntry.status !== 'EXPIRED') {
        await prisma.hwidAccess.update({
          where: { id: hwidEntry.id },
          data: { status: 'EXPIRED' },
        });
      }
      await logActivity({
        appId: app.id,
        action: 'CLIENT_AUTH_FAILED',
        actorType: 'CLIENT',
        ipAddress,
        userAgent,
        details: { appId: app.appId, hwidHash: clientHwidHash, reason: 'IDENTIFIER_EXPIRED' },
        status: 'FAILURE',
      });
      return sendError(res, 'Identifier access has expired', 403, 'IDENTIFIER_EXPIRED');
    }

    // 7. Update Last Auth Time
    await prisma.hwidAccess.update({
      where: { id: hwidEntry.id },
      data: { lastAuthAt: now },
    });

    await logActivity({
      appId: app.id,
      action: 'CLIENT_HWID_AUTH_SUCCESS',
      actorType: 'CLIENT',
      ipAddress,
      userAgent,
      details: { appId: app.appId, hwidHash: clientHwidHash },
      status: 'SUCCESS',
    });

    const diffTime = hwidEntry.expiresAt.getTime() - now.getTime();
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return sendSuccess(res, 'Authentication successful', {
      status: 'active',
      expires_at: hwidEntry.expiresAt.toISOString(),
      remaining_days: remainingDays,
    });
  } catch (error: any) {
    return sendError(res, 'Client HWID authentication error', 500, error.message);
  }
}
