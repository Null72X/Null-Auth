import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { generateAppId, generateAppSecret } from '../utils/generator.js';
import { logActivity } from '../services/logger.service.js';

export const createAppSchema = z.object({
  name: z.string().min(2, 'Application name must be at least 2 characters').max(64),
  type: z.enum(['LICENSE', 'HWID'], { required_error: 'Type must be LICENSE or HWID' }),
  version: z.string().optional(),
  downloadUrl: z.string().optional().nullable(),
});

export const updateAppNameSchema = z.object({
  name: z.string().min(2, 'Application name must be at least 2 characters').max(64),
});

export const updateAppStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED']),
});

export const updateAppVersionSchema = z.object({
  version: z.string().min(1, 'Version is required'),
  downloadUrl: z.string().optional().nullable(),
});

export async function listApps(req: Request, res: Response) {
  try {
    const apps = await prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            licenses: true,
            hwidAccesses: true,
          },
        },
      },
    });

    const now = new Date();

    const formattedApps = await Promise.all(
      apps.map(async (app) => {
        let activeUsers = 0;
        let expiredUsers = 0;
        let lastActivity: Date | null = null;

        if (app.type === 'LICENSE') {
          activeUsers = await prisma.license.count({
            where: { appId: app.id, status: 'ACTIVE', expiresAt: { gt: now } },
          });
          expiredUsers = await prisma.license.count({
            where: {
              appId: app.id,
              OR: [{ status: 'EXPIRED' }, { expiresAt: { lte: now } }],
            },
          });
          const latestLog = await prisma.activityLog.findFirst({
            where: { appId: app.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          });
          lastActivity = latestLog?.createdAt || null;
        } else {
          activeUsers = await prisma.hwidAccess.count({
            where: { appId: app.id, status: 'ACTIVE', expiresAt: { gt: now } },
          });
          expiredUsers = await prisma.hwidAccess.count({
            where: {
              appId: app.id,
              OR: [{ status: 'EXPIRED' }, { expiresAt: { lte: now } }],
            },
          });
          const latestLog = await prisma.activityLog.findFirst({
            where: { appId: app.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          });
          lastActivity = latestLog?.createdAt || null;
        }

        return {
          id: app.id,
          appId: app.appId,
          name: app.name,
          secret: app.secret,
          type: app.type,
          status: app.status,
          version: app.version || '1.0.0',
          downloadUrl: app.downloadUrl || null,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
          activeUsers,
          expiredUsers,
          totalUsers: app.type === 'LICENSE' ? app._count.licenses : app._count.hwidAccesses,
          lastActivity,
        };
      })
    );

    return sendSuccess(res, 'Applications retrieved successfully', formattedApps);
  } catch (error: any) {
    return sendError(res, 'Failed to fetch applications', 500, error.message);
  }
}

export async function getAppById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const app = await prisma.application.findFirst({
      where: {
        OR: [{ id }, { appId: id }],
      },
      include: {
        _count: {
          select: { licenses: true, hwidAccesses: true },
        },
      },
    });

    if (!app) {
      return sendError(res, 'Application not found', 404);
    }

    const now = new Date();
    let activeUsers = 0;
    let expiredUsers = 0;
    let pausedUsers = 0;
    let bannedUsers = 0;

    if (app.type === 'LICENSE') {
      activeUsers = await prisma.license.count({
        where: { appId: app.id, status: 'ACTIVE', expiresAt: { gt: now } },
      });
      expiredUsers = await prisma.license.count({
        where: { appId: app.id, OR: [{ status: 'EXPIRED' }, { expiresAt: { lte: now } }] },
      });
      pausedUsers = await prisma.license.count({
        where: { appId: app.id, status: 'PAUSED' },
      });
      bannedUsers = await prisma.license.count({
        where: { appId: app.id, status: 'BANNED' },
      });
    } else {
      activeUsers = await prisma.hwidAccess.count({
        where: { appId: app.id, status: 'ACTIVE', expiresAt: { gt: now } },
      });
      expiredUsers = await prisma.hwidAccess.count({
        where: { appId: app.id, OR: [{ status: 'EXPIRED' }, { expiresAt: { lte: now } }] },
      });
      pausedUsers = await prisma.hwidAccess.count({
        where: { appId: app.id, status: 'PAUSED' },
      });
      bannedUsers = await prisma.hwidAccess.count({
        where: { appId: app.id, status: 'BANNED' },
      });
    }

    return sendSuccess(res, 'Application details retrieved', {
      ...app,
      stats: {
        activeUsers,
        expiredUsers,
        pausedUsers,
        bannedUsers,
        totalUsers: app.type === 'LICENSE' ? app._count.licenses : app._count.hwidAccesses,
      },
    });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch application details', 500, error.message);
  }
}

export async function createApp(req: Request, res: Response) {
  const { name, type, version, downloadUrl } = req.body;

  try {
    let appId = generateAppId();
    // Ensure App ID uniqueness
    let exists = await prisma.application.findUnique({ where: { appId } });
    while (exists) {
      appId = generateAppId();
      exists = await prisma.application.findUnique({ where: { appId } });
    }

    const secret = generateAppSecret();

    const newApp = await prisma.application.create({
      data: {
        appId,
        name,
        secret,
        type,
        status: 'ACTIVE',
        version: version ? version.trim() : '1.0.0',
        downloadUrl: downloadUrl ? downloadUrl.trim() : null,
      },
    });

    await logActivity({
      appId: newApp.id,
      action: 'APP_CREATE',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { appId: newApp.appId, name: newApp.name, type: newApp.type, version: newApp.version },
      status: 'SUCCESS',
    });

    return sendSuccess(res, 'Application created successfully', newApp, 201);
  } catch (error: any) {
    return sendError(res, 'Failed to create application', 500, error.message);
  }
}

export async function updateAppName(req: Request, res: Response) {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const updated = await prisma.application.update({
      where: { id },
      data: { name },
    });

    await logActivity({
      appId: updated.id,
      action: 'APP_UPDATE_NAME',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { appId: updated.appId, newName: name },
      status: 'SUCCESS',
    });

    return sendSuccess(res, 'Application name updated successfully', updated);
  } catch (error: any) {
    return sendError(res, 'Failed to update application name', 500, error.message);
  }
}

export async function updateAppVersion(req: Request, res: Response) {
  const { id } = req.params;
  const { version, downloadUrl } = req.body;

  try {
    const updated = await prisma.application.update({
      where: { id },
      data: {
        version: version.trim(),
        downloadUrl: downloadUrl ? downloadUrl.trim() : null,
      },
    });

    await logActivity({
      appId: updated.id,
      action: 'APP_UPDATE_VERSION',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { appId: updated.appId, newVersion: version, downloadUrl },
      status: 'SUCCESS',
    });

    return sendSuccess(res, 'Application version updated successfully', updated);
  } catch (error: any) {
    return sendError(res, 'Failed to update application version', 500, error.message);
  }
}

export async function toggleAppStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updated = await prisma.application.update({
      where: { id },
      data: { status },
    });

    await logActivity({
      appId: updated.id,
      action: status === 'ACTIVE' ? 'APP_ACTIVATE' : 'APP_PAUSE',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { appId: updated.appId, newStatus: status },
      status: 'SUCCESS',
    });

    return sendSuccess(res, `Application ${status.toLowerCase()}d successfully`, updated);
  } catch (error: any) {
    return sendError(res, 'Failed to update application status', 500, error.message);
  }
}

export async function regenerateSecret(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const newSecret = generateAppSecret();

    const updated = await prisma.application.update({
      where: { id },
      data: { secret: newSecret },
    });

    await logActivity({
      appId: updated.id,
      action: 'APP_REGENERATE_SECRET',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { appId: updated.appId },
      status: 'SUCCESS',
    });

    return sendSuccess(res, 'Application secret regenerated successfully', { secret: newSecret });
  } catch (error: any) {
    return sendError(res, 'Failed to regenerate secret', 500, error.message);
  }
}

export async function deleteApp(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) {
      return sendError(res, 'Application not found', 404);
    }

    await prisma.application.delete({ where: { id } });

    await logActivity({
      action: 'APP_DELETE',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { appId: app.appId, name: app.name },
      status: 'SUCCESS',
    });

    return sendSuccess(res, 'Application and all associated records deleted successfully');
  } catch (error: any) {
    return sendError(res, 'Failed to delete application', 500, error.message);
  }
}
