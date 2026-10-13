import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { generateAppId, generateAppSecret } from '../utils/generator.js';
import { logActivity } from '../services/logger.service.js';
import { notifyTestWebhook } from '../services/discord.service.js';
import { extractClientIp } from '../utils/ip.js';

export const createAppSchema = z.object({
  name: z.string().min(2, 'Application name must be at least 2 characters').max(64),
  type: z.enum(['LICENSE', 'HWID', 'USER_AUTH'], { required_error: 'Type must be LICENSE, HWID, or USER_AUTH' }),
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

export const updateFreeTrialSchema = z.object({
  enabled: z.boolean(),
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
            users: true,
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
        let totalUsers = 0;

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
          totalUsers = app._count.licenses;
        } else if (app.type === 'USER_AUTH') {
          activeUsers = await (prisma as any).clientUser.count({
            where: { appId: app.id, status: 'ACTIVE', expiresAt: { gt: now } },
          });
          expiredUsers = await (prisma as any).clientUser.count({
            where: {
              appId: app.id,
              OR: [{ status: 'EXPIRED' }, { expiresAt: { lte: now } }],
            },
          });
          totalUsers = (app as any)._count.users || 0;
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
          totalUsers = app._count.hwidAccesses;
        }

        const latestLog = await prisma.activityLog.findFirst({
          where: { appId: app.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });
        lastActivity = latestLog?.createdAt || null;

        const trialSuffix = app.type === 'LICENSE' && app.freeTrialKey
          ? app.freeTrialKey.replace(/^(FREE-TRIAL-|TRIAL-)/i, '')
          : null;

        let freeTrialPassword = (app as any).freeTrialPassword || null;
        let freeTrialExpiresAt: string | null = null;
        let freeTrialRemainingDays: number | null = null;

        if (app.freeTrialEnabled) {
          if (app.type === 'LICENSE' && app.freeTrialKey) {
            const lic = await prisma.license.findFirst({
              where: { key: app.freeTrialKey, appId: app.id },
              select: { expiresAt: true },
            }).catch(() => null);
            if (lic) {
              freeTrialExpiresAt = lic.expiresAt.toISOString();
              const diffTime = lic.expiresAt.getTime() - now.getTime();
              freeTrialRemainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
            }
          } else if (app.type === 'USER_AUTH' && app.freeTrialKey) {
            const trialUser = await (prisma as any).clientUser.findFirst({
              where: { appId: app.id, username: app.freeTrialKey },
              select: { plainPassword: true, expiresAt: true },
            }).catch(() => null);
            if (trialUser) {
              freeTrialPassword = trialUser.plainPassword || 'trial123';
              if (trialUser.expiresAt) {
                freeTrialExpiresAt = trialUser.expiresAt.toISOString();
                const diffTime = trialUser.expiresAt.getTime() - now.getTime();
                freeTrialRemainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
              }
            }
          } else if (app.type === 'HWID') {
            if (!app.freeTrialKey || app.freeTrialKey === 'LIFETIME') {
              freeTrialExpiresAt = '2099-01-01T00:00:00.000Z';
              freeTrialRemainingDays = 9999;
            } else {
              const parsedDate = new Date(app.freeTrialKey);
              if (!isNaN(parsedDate.getTime())) {
                freeTrialExpiresAt = parsedDate.toISOString();
                const diffTime = parsedDate.getTime() - now.getTime();
                freeTrialRemainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
              } else {
                freeTrialExpiresAt = '2099-01-01T00:00:00.000Z';
                freeTrialRemainingDays = 9999;
              }
            }
          }
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
          freeTrialEnabled: app.freeTrialEnabled || false,
          freeTrialKey: app.freeTrialKey || null,
          freeTrialPassword: freeTrialPassword || (app.type === 'USER_AUTH' && app.freeTrialKey ? 'trial123' : null),
          freeTrialSuffix: trialSuffix,
          trialUsername: app.type === 'USER_AUTH' ? app.freeTrialKey : null,
          hasTrialPassword: app.type === 'USER_AUTH' && Boolean(app.freeTrialKey),
          freeTrialExpiresAt,
          freeTrialRemainingDays,
          discordWebhookUrl: (app as any).discordWebhookUrl || null,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
          activeUsers,
          expiredUsers,
          totalUsers,
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
          select: { licenses: true, hwidAccesses: true, users: true },
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
    let totalUsers = 0;

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
      totalUsers = app._count.licenses;
    } else if (app.type === 'USER_AUTH') {
      activeUsers = await (prisma as any).clientUser.count({
        where: { appId: app.id, status: 'ACTIVE', expiresAt: { gt: now } },
      });
      expiredUsers = await (prisma as any).clientUser.count({
        where: { appId: app.id, OR: [{ status: 'EXPIRED' }, { expiresAt: { lte: now } }] },
      });
      pausedUsers = await (prisma as any).clientUser.count({
        where: { appId: app.id, status: 'PAUSED' },
      });
      bannedUsers = await (prisma as any).clientUser.count({
        where: { appId: app.id, status: 'BANNED' },
      });
      totalUsers = (app as any)._count.users || 0;
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
      totalUsers = app._count.hwidAccesses;
    }

    const trialSuffix = app.type === 'LICENSE' && app.freeTrialKey
      ? app.freeTrialKey.replace(/^(FREE-TRIAL-|TRIAL-)/i, '')
      : null;

    let freeTrialPassword = (app as any).freeTrialPassword || null;
    if (!freeTrialPassword && app.type === 'USER_AUTH' && app.freeTrialKey) {
      const trialUser = await (prisma as any).clientUser.findFirst({
        where: { appId: app.id, username: app.freeTrialKey },
        select: { plainPassword: true },
      }).catch(() => null);
      freeTrialPassword = trialUser?.plainPassword || 'trial123';
    }

    let freeTrialExpiresAt: string | null = null;
    let freeTrialRemainingDays: number | null = null;

    if (app.freeTrialEnabled) {
      if (app.type === 'LICENSE' && app.freeTrialKey) {
        const lic = await prisma.license.findFirst({
          where: { key: app.freeTrialKey, appId: app.id },
          select: { expiresAt: true },
        }).catch(() => null);
        if (lic) {
          freeTrialExpiresAt = lic.expiresAt.toISOString();
          const diffTime = lic.expiresAt.getTime() - now.getTime();
          freeTrialRemainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
        }
      } else if (app.type === 'USER_AUTH' && app.freeTrialKey) {
        const trialUser = await (prisma as any).clientUser.findFirst({
          where: { appId: app.id, username: app.freeTrialKey },
          select: { plainPassword: true, expiresAt: true },
        }).catch(() => null);
        if (trialUser) {
          freeTrialPassword = trialUser.plainPassword || 'trial123';
          if (trialUser.expiresAt) {
            freeTrialExpiresAt = trialUser.expiresAt.toISOString();
            const diffTime = trialUser.expiresAt.getTime() - now.getTime();
            freeTrialRemainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
          }
        }
      } else if (app.type === 'HWID') {
        if (!app.freeTrialKey || app.freeTrialKey === 'LIFETIME') {
          freeTrialExpiresAt = '2099-01-01T00:00:00.000Z';
          freeTrialRemainingDays = 9999;
        } else {
          const parsedDate = new Date(app.freeTrialKey);
          if (!isNaN(parsedDate.getTime())) {
            freeTrialExpiresAt = parsedDate.toISOString();
            const diffTime = parsedDate.getTime() - now.getTime();
            freeTrialRemainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
          } else {
            freeTrialExpiresAt = '2099-01-01T00:00:00.000Z';
            freeTrialRemainingDays = 9999;
          }
        }
      }
    }

    return sendSuccess(res, 'Application details retrieved', {
      ...app,
      freeTrialPassword: freeTrialPassword || (app.type === 'USER_AUTH' && app.freeTrialKey ? 'trial123' : null),
      freeTrialSuffix: trialSuffix,
      trialUsername: app.type === 'USER_AUTH' ? app.freeTrialKey : null,
      hasTrialPassword: app.type === 'USER_AUTH' && Boolean(app.freeTrialKey),
      freeTrialExpiresAt,
      freeTrialRemainingDays,
      stats: {
        activeUsers,
        expiredUsers,
        pausedUsers,
        bannedUsers,
        totalUsers,
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

export async function updateApp(req: Request, res: Response) {
  const { id } = req.params;
  const {
    name,
    version,
    downloadUrl,
    status,
    freeTrialEnabled,
    freeTrialKey,
    freeTrialSuffix,
    trialUsername,
    trialPassword,
    discordWebhookUrl,
    secret,
    days,
    trialDays,
  } = req.body;

  try {
    const existing = await prisma.application.findFirst({
      where: { OR: [{ id }, { appId: id }] },
    });

    if (!existing) {
      return sendError(res, 'Application not found', 404);
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (version !== undefined) updateData.version = version.trim();
    if (downloadUrl !== undefined) updateData.downloadUrl = downloadUrl ? downloadUrl.trim() : null;
    if (status !== undefined) updateData.status = status;
    if (discordWebhookUrl !== undefined) updateData.discordWebhookUrl = discordWebhookUrl ? discordWebhookUrl.trim() : null;
    if (secret !== undefined && secret.trim()) updateData.secret = secret.trim();

    const willBeEnabled = freeTrialEnabled !== undefined ? Boolean(freeTrialEnabled) : existing.freeTrialEnabled;
    updateData.freeTrialEnabled = willBeEnabled;

    const parsedDays = days !== undefined ? Number(days) : trialDays !== undefined ? Number(trialDays) : undefined;
    let customTrialExpiresAt: Date | undefined = undefined;
    if (parsedDays !== undefined && !isNaN(parsedDays) && parsedDays > 0) {
      customTrialExpiresAt = new Date();
      if (parsedDays >= 9999) {
        customTrialExpiresAt.setFullYear(customTrialExpiresAt.getFullYear() + 50); // Lifetime
      } else {
        customTrialExpiresAt.setDate(customTrialExpiresAt.getDate() + parsedDays);
      }
    }

    if (willBeEnabled) {
      if (existing.type === 'LICENSE') {
        let rawSuffix: string | null = null;
        if (freeTrialSuffix !== undefined && freeTrialSuffix !== null) {
          rawSuffix = String(freeTrialSuffix).trim();
        } else if (freeTrialKey !== undefined && freeTrialKey !== null) {
          rawSuffix = String(freeTrialKey).trim();
        } else if (existing.freeTrialKey) {
          rawSuffix = existing.freeTrialKey.trim();
        }

        const cleanSuffix = rawSuffix ? rawSuffix.replace(/^(FREE-TRIAL-|TRIAL-)/i, '').trim() : '';

        let finalKey: string;
        if (cleanSuffix) {
          if (cleanSuffix.length < 1 || cleanSuffix.length > 40) {
            return sendError(res, 'Trial license suffix must be between 1 and 40 characters.', 400);
          }
          if (!/^[a-zA-Z0-9_-]+$/.test(cleanSuffix)) {
            return sendError(res, 'Trial license suffix can only contain letters, numbers, dashes, and underscores.', 400);
          }
          finalKey = `TRIAL-${cleanSuffix.toUpperCase()}`;
        } else {
          const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
          const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
          finalKey = `TRIAL-${part1}-${part2}`;
        }

        const conflict = await prisma.license.findFirst({
          where: { key: finalKey, appId: { not: existing.id } },
        });
        if (conflict) {
          return sendError(res, 'This license key is already in use by another application. Please choose a different suffix.', 400);
        }

        const defaultExpiresAt = new Date();
        defaultExpiresAt.setFullYear(defaultExpiresAt.getFullYear() + 10);
        const effectiveExpiresAt = customTrialExpiresAt || defaultExpiresAt;

        const oldKey = existing.freeTrialKey;
        if (oldKey && oldKey !== finalKey) {
          const updatedLic = await prisma.license.updateMany({
            where: { key: oldKey, appId: existing.id },
            data: { key: finalKey, status: 'ACTIVE', ...(customTrialExpiresAt ? { expiresAt: customTrialExpiresAt } : {}) },
          });
          if (updatedLic.count === 0) {
            await prisma.license.create({
              data: {
                key: finalKey,
                appId: existing.id,
                status: 'ACTIVE',
                expiresAt: effectiveExpiresAt,
                clientName: 'Master Free Trial Key',
              },
            });
          }
        } else {
          const existingLic = await prisma.license.findFirst({
            where: { key: finalKey, appId: existing.id },
          });
          if (existingLic) {
            await prisma.license.update({
              where: { id: existingLic.id },
              data: { status: 'ACTIVE', ...(customTrialExpiresAt ? { expiresAt: customTrialExpiresAt } : {}) },
            });
          } else {
            await prisma.license.create({
              data: {
                key: finalKey,
                appId: existing.id,
                status: 'ACTIVE',
                expiresAt: effectiveExpiresAt,
                clientName: 'Master Free Trial Key',
              },
            });
          }
        }
        updateData.freeTrialKey = finalKey;
      } else if (existing.type === 'USER_AUTH') {
        let targetUsername = '';
        if (trialUsername !== undefined && trialUsername !== null) {
          targetUsername = String(trialUsername).trim();
        } else if (freeTrialKey !== undefined && freeTrialKey !== null) {
          targetUsername = String(freeTrialKey).trim();
        } else if (existing.freeTrialKey) {
          targetUsername = existing.freeTrialKey.trim();
        }

        if (!targetUsername) {
          const part1 = Math.random().toString(36).substring(2, 6).toLowerCase();
          targetUsername = `trial_${part1}`;
        }

        if (targetUsername.length < 2 || targetUsername.length > 32) {
          return sendError(res, 'Trial username must be between 2 and 32 characters.', 400);
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(targetUsername)) {
          return sendError(res, 'Trial username can only contain letters, numbers, dots, and underscores.', 400);
        }

        const oldUsername = existing.freeTrialKey;
        if (!oldUsername || oldUsername.toLowerCase() !== targetUsername.toLowerCase()) {
          const conflict = await (prisma as any).clientUser.findFirst({
            where: {
              appId: existing.id,
              username: { equals: targetUsername, mode: 'insensitive' },
            },
          });
          if (conflict) {
            return sendError(res, 'A user account with this username already exists in this application.', 400);
          }
        }

        let passwordHash: string | null = null;
        if (trialPassword !== undefined && trialPassword !== null && String(trialPassword).trim() !== '') {
          const pwd = String(trialPassword).trim();
          if (pwd.length < 4) {
            return sendError(res, 'Trial password must be at least 4 characters.', 400);
          }
          const salt = await bcrypt.genSalt(10);
          passwordHash = await bcrypt.hash(pwd, salt);
        }

        const defaultExpiresAt = new Date();
        defaultExpiresAt.setFullYear(defaultExpiresAt.getFullYear() + 10);
        const effectiveExpiresAt = customTrialExpiresAt || defaultExpiresAt;

        if (oldUsername) {
          const updatePayload: any = {
            username: targetUsername,
            status: 'ACTIVE',
            ...(customTrialExpiresAt ? { expiresAt: customTrialExpiresAt } : {}),
          };
          const plainPwd = (trialPassword !== undefined && trialPassword !== null && String(trialPassword).trim() !== '')
            ? String(trialPassword).trim()
            : 'trial123';
          if (passwordHash) {
            updatePayload.passwordHash = passwordHash;
            updatePayload.plainPassword = plainPwd;
          }
          const updatedUser = await (prisma as any).clientUser.updateMany({
            where: {
              appId: existing.id,
              username: { equals: oldUsername, mode: 'insensitive' },
            },
            data: updatePayload,
          });
          if (updatedUser.count === 0) {
            const finalHash = passwordHash || (await bcrypt.hash('trial123', await bcrypt.genSalt(10)));
            await (prisma as any).clientUser.create({
              data: {
                username: targetUsername,
                passwordHash: finalHash,
                plainPassword: plainPwd,
                appId: existing.id,
                status: 'ACTIVE',
                expiresAt: effectiveExpiresAt,
                clientName: 'Dynamic Master Free Trial User',
              },
            });
          }
        } else {
          const plainPwd = (trialPassword !== undefined && trialPassword !== null && String(trialPassword).trim() !== '')
            ? String(trialPassword).trim()
            : 'trial123';
          const finalHash = passwordHash || (await bcrypt.hash('trial123', await bcrypt.genSalt(10)));
          await (prisma as any).clientUser.create({
            data: {
              username: targetUsername,
              passwordHash: finalHash,
              plainPassword: plainPwd,
              appId: existing.id,
              status: 'ACTIVE',
              expiresAt: effectiveExpiresAt,
              clientName: 'Dynamic Master Free Trial User',
            },
          });
        }
        updateData.freeTrialKey = targetUsername;
        if (trialPassword !== undefined && trialPassword !== null && String(trialPassword).trim() !== '') {
          updateData.freeTrialPassword = String(trialPassword).trim();
        } else if (!existing.freeTrialPassword) {
          updateData.freeTrialPassword = 'trial123';
        }
      } else if (existing.type === 'HWID') {
        if (days !== undefined || trialDays !== undefined) {
          const parsedDays = Number(days !== undefined ? days : trialDays);
          if (parsedDays >= 9999) {
            updateData.freeTrialKey = 'LIFETIME';
          } else if (customTrialExpiresAt) {
            updateData.freeTrialKey = customTrialExpiresAt.toISOString();
          } else {
            updateData.freeTrialKey = 'LIFETIME';
          }
        } else if (!existing.freeTrialKey) {
          updateData.freeTrialKey = 'LIFETIME';
        }
      }
    } else {
      if (existing.freeTrialEnabled) {
        if (existing.type === 'LICENSE' && existing.freeTrialKey) {
          await prisma.license.updateMany({
            where: { key: existing.freeTrialKey, appId: existing.id },
            data: { status: 'EXPIRED' },
          }).catch(() => {});
        } else if (existing.type === 'USER_AUTH' && existing.freeTrialKey) {
          await (prisma as any).clientUser.updateMany({
            where: { username: existing.freeTrialKey, appId: existing.id },
            data: { status: 'EXPIRED' },
          }).catch(() => {});
        } else if (existing.type === 'HWID') {
          updateData.freeTrialKey = null;
        }
      }
    }

    const updated = await prisma.application.update({
      where: { id: existing.id },
      data: updateData,
    });

    await logActivity({
      appId: updated.id,
      action: 'APP_UPDATE',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { appId: updated.appId, updates: updateData },
      status: 'SUCCESS',
    });

    const trialSuffix = updated.type === 'LICENSE' && updated.freeTrialKey
      ? updated.freeTrialKey.replace(/^(FREE-TRIAL-|TRIAL-)/i, '')
      : null;

    return sendSuccess(res, 'Application updated successfully', {
      ...updated,
      freeTrialSuffix: trialSuffix,
      trialUsername: updated.type === 'USER_AUTH' ? updated.freeTrialKey : null,
      hasTrialPassword: updated.type === 'USER_AUTH' && Boolean(updated.freeTrialKey),
    });
  } catch (error: any) {
    return sendError(res, 'Failed to update application', 500, error.message);
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

export async function toggleFreeTrial(req: Request, res: Response) {
  const { id } = req.params;
  const { enabled, days, trialDays } = req.body;

  try {
    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) {
      return sendError(res, 'Application not found', 404);
    }

    let newTrialKey: string | null = app.freeTrialKey;

    if (enabled) {
      const parsedDays = days !== undefined ? Number(days) : trialDays !== undefined ? Number(trialDays) : 30;
      const expiresAt = new Date();
      if (parsedDays >= 9999) {
        expiresAt.setFullYear(expiresAt.getFullYear() + 50);
      } else {
        expiresAt.setDate(expiresAt.getDate() + Math.max(1, parsedDays));
      }

      if (app.type === 'LICENSE') {
        // Generate a fresh unique master free trial key every time Free Trial is enabled
        const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        newTrialKey = `TRIAL-${part1}-${part2}`;

        await prisma.license.create({
          data: {
            key: newTrialKey,
            appId: app.id,
            status: 'ACTIVE',
            expiresAt,
            clientName: 'Dynamic Master Free Trial Key',
          },
        });
      } else if (app.type === 'USER_AUTH') {
        const part1 = Math.random().toString(36).substring(2, 6).toLowerCase();
        newTrialKey = `trial_${part1}`;

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('trial123', salt);

        await (prisma as any).clientUser.create({
          data: {
            username: newTrialKey,
            passwordHash,
            plainPassword: 'trial123',
            appId: app.id,
            status: 'ACTIVE',
            expiresAt,
            clientName: 'Dynamic Master Free Trial User',
          },
        });
      } else if (app.type === 'HWID') {
        newTrialKey = parsedDays >= 9999 ? 'LIFETIME' : expiresAt.toISOString();
      }
    } else {
      if (app.type === 'LICENSE' && app.freeTrialKey) {
        // Expire the old free trial key
        await prisma.license.updateMany({
          where: { key: app.freeTrialKey, appId: app.id },
          data: { status: 'EXPIRED' },
        }).catch(() => {});
      } else if (app.type === 'USER_AUTH' && app.freeTrialKey) {
        // Expire the old free trial user account
        await (prisma as any).clientUser.updateMany({
          where: { username: app.freeTrialKey, appId: app.id },
          data: { status: 'EXPIRED' },
        }).catch(() => {});
      } else if (app.type === 'HWID') {
        newTrialKey = null;
      }
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        freeTrialEnabled: enabled,
        freeTrialKey: enabled ? newTrialKey : app.freeTrialKey,
        freeTrialPassword: enabled ? (app.type === 'USER_AUTH' ? 'trial123' : null) : (app as any).freeTrialPassword,
      },
    });

    await logActivity({
      appId: updated.id,
      action: enabled ? 'APP_FREE_TRIAL_ENABLE' : 'APP_FREE_TRIAL_DISABLE',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { appId: updated.appId, freeTrialEnabled: enabled, freeTrialKey: updated.freeTrialKey },
      status: 'SUCCESS',
    });

    const trialSuffix = updated.type === 'LICENSE' && updated.freeTrialKey
      ? updated.freeTrialKey.replace(/^(FREE-TRIAL-|TRIAL-)/i, '')
      : null;

    return sendSuccess(res, `Free trial ${enabled ? 'enabled' : 'disabled'} successfully`, {
      ...updated,
      freeTrialSuffix: trialSuffix,
      trialUsername: updated.type === 'USER_AUTH' ? updated.freeTrialKey : null,
      hasTrialPassword: updated.type === 'USER_AUTH' && Boolean(updated.freeTrialKey),
    });
  } catch (error: any) {
    return sendError(res, 'Failed to update free trial status', 500, error.message);
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

export async function testAppWebhook(req: Request, res: Response) {
  const { id } = req.params;
  const ipAddress = extractClientIp(req);

  try {
    const app = await prisma.application.findFirst({
      where: { OR: [{ id }, { appId: id }] },
    });

    if (!app) {
      return sendError(res, 'Application not found', 404);
    }

    const result = await notifyTestWebhook({
      appName: app.name,
      appId: app.appId,
      id: app.id,
      adminIp: ipAddress,
    });

    if (!result.success) {
      return sendError(res, result.error || 'Failed to dispatch Discord webhook test notification', 400);
    }

    await logActivity({
      appId: app.id,
      action: 'ADMIN_TEST_WEBHOOK',
      actorType: 'ADMIN',
      ipAddress,
      userAgent: req.headers['user-agent'],
      details: { appId: app.appId, name: app.name },
      status: 'SUCCESS',
    });

    return sendSuccess(res, 'Discord test notification delivered successfully!');
  } catch (error: any) {
    return sendError(res, 'Failed to test Discord webhook', 500, error.message);
  }
}

