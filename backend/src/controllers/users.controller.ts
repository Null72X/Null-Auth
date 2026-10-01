import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { hashHwid } from '../services/hash.service.js';
import { logActivity } from '../services/logger.service.js';
import { notifyUserCreated, notifyAdminAction } from '../services/discord.service.js';

export const createUserSchema = z.object({
  appId: z.string().min(1, 'Application ID is required'),
  username: z.string().min(2, 'Username must be at least 2 characters').max(32),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  days: z.number().int().min(1).default(30),
  clientName: z.string().optional(),
  notes: z.string().optional(),
});

export const updateUserSchema = z.object({
  username: z.string().min(2).max(32).optional(),
  password: z.string().min(4).optional(),
  clientName: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'EXPIRED', 'BANNED']).optional(),
  boundHwid: z.string().nullable().optional(),
  expiresAt: z.string().optional(),
});

export const extendUserSchema = z.object({
  days: z.number().int(),
});

export const setUserHwidSchema = z.object({
  boundHwid: z.string().nullable(),
});

export const bulkUserActionSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user must be selected'),
  action: z.enum(['PAUSE', 'RESUME', 'ADD_DAYS', 'DELETE']),
  days: z.number().int().optional(),
});

export async function listUsers(req: Request, res: Response) {
  const { appId, status, search, page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const whereClause: any = {};

  if (appId && typeof appId === 'string') {
    whereClause.appId = appId;
  }

  const now = new Date();

  if (status && typeof status === 'string') {
    if (status === 'EXPIRED') {
      whereClause.OR = [{ status: 'EXPIRED' }, { expiresAt: { lte: now } }];
    } else {
      whereClause.status = status;
      if (status === 'ACTIVE') {
        whereClause.expiresAt = { gt: now };
      }
    }
  }

  if (search && typeof search === 'string') {
    const s = search.trim();
    whereClause.OR = [
      { username: { contains: s, mode: 'insensitive' } },
      { clientName: { contains: s, mode: 'insensitive' } },
      { boundHwid: { contains: s, mode: 'insensitive' } },
    ];
  }

  try {
    const totalCount = await (prisma as any).clientUser.count({ where: whereClause });
    const users = await (prisma as any).clientUser.findMany({
      where: whereClause,
      include: {
        application: {
          select: { id: true, appId: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    const formatted = users.map((user: any) => {
      const isExpired = user.expiresAt <= now;
      let effectiveStatus = user.status;
      if (user.status === 'ACTIVE' && isExpired) {
        effectiveStatus = 'EXPIRED';
      }

      const diffTime = user.expiresAt.getTime() - now.getTime();
      const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

      return {
        ...user,
        clientName: user.clientName || user.notes || null,
        effectiveStatus,
        remainingDays,
      };
    });

    return sendSuccess(res, 'User accounts retrieved successfully', formatted, 200, {
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error: any) {
    console.error('[List Users Error]:', error);
    return sendError(res, 'Failed to fetch user accounts', 500);
  }
}

export async function getUserById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const user: any = await (prisma as any).clientUser.findFirst({
      where: { OR: [{ id }, { username: id }] },
      include: { application: true },
    });

    if (!user) {
      return sendError(res, 'User account not found', 404);
    }

    const now = new Date();
    const isExpired = user.expiresAt <= now;
    const diffTime = user.expiresAt.getTime() - now.getTime();
    const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

    return sendSuccess(res, 'User details retrieved', {
      ...user,
      clientName: user.clientName || user.notes || null,
      effectiveStatus: user.status === 'ACTIVE' && isExpired ? 'EXPIRED' : user.status,
      remainingDays,
    });
  } catch (error: any) {
    console.error('[Get User By Id Error]:', error);
    return sendError(res, 'Failed to fetch user details', 500);
  }
}

export async function createUser(req: Request, res: Response) {
  const { appId, username, password, days = 30, clientName, notes } = req.body;
  const resolvedClientName = (clientName !== undefined ? clientName : notes) || null;

  try {
    const app = await prisma.application.findFirst({
      where: { OR: [{ id: appId }, { appId }] },
    });

    if (!app) {
      return sendError(res, 'Application not found', 404);
    }

    if (app.type !== 'USER_AUTH') {
      return sendError(res, 'Target application is not a Username & Password application', 400);
    }

    const trimmedUsername = username.trim();

    // Check duplicate username in this app
    const duplicate = await (prisma as any).clientUser.findUnique({
      where: {
        appId_username: {
          appId: app.id,
          username: trimmedUsername,
        },
      },
    });

    if (duplicate) {
      return sendError(res, `Username '${trimmedUsername}' is already taken for this application`, 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const newUser: any = await (prisma as any).clientUser.create({
      data: {
        appId: app.id,
        username: trimmedUsername,
        passwordHash,
        status: 'ACTIVE',
        expiresAt,
        clientName: resolvedClientName,
      },
    });

    await logActivity({
      appId: app.id,
      action: 'USER_CREATE',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { username: trimmedUsername, days, appId: app.appId, clientName: resolvedClientName },
      status: 'SUCCESS',
    });

    try {
      await notifyUserCreated({
        appName: app.name,
        appId: app.appId,
        username: trimmedUsername,
        clientName: resolvedClientName,
        days,
        adminIp: req.ip,
      });
    } catch (e) {}

    return sendSuccess(res, `User account '${trimmedUsername}' created successfully`, {
      ...newUser,
      clientName: resolvedClientName,
    }, 201);
  } catch (error: any) {
    console.error('[Create User Error]:', error);
    return sendError(res, 'Failed to create user account', 500);
  }
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const { username, password, clientName, notes, status, boundHwid, expiresAt } = req.body;

  try {
    const existing = await (prisma as any).clientUser.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'User account not found', 404);
    }

    const updateData: any = {};

    if (username && username.trim() !== existing.username) {
      const trimmedUser = username.trim();
      const duplicate = await (prisma as any).clientUser.findUnique({
        where: {
          appId_username: {
            appId: existing.appId,
            username: trimmedUser,
          },
        },
      });
      if (duplicate && duplicate.id !== existing.id) {
        return sendError(res, `Username '${trimmedUser}' is already taken`, 400);
      }
      updateData.username = trimmedUser;
    }

    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password.trim(), salt);
    }

    const resolvedClientName = clientName !== undefined ? clientName : notes;
    if (resolvedClientName !== undefined) {
      updateData.clientName = resolvedClientName ? resolvedClientName.trim() : null;
    }

    if (status !== undefined) updateData.status = status;

    if (boundHwid !== undefined) {
      if (!boundHwid || boundHwid.trim() === '') {
        updateData.boundHwid = null;
      } else {
        updateData.boundHwid = hashHwid(boundHwid);
      }
    }

    if (expiresAt) {
      updateData.expiresAt = new Date(expiresAt);
    }

    const updated: any = await (prisma as any).clientUser.update({
      where: { id: existing.id },
      data: updateData,
    });

    await logActivity({
      appId: updated.appId,
      action: 'USER_UPDATE',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { username: updated.username, updates: Object.keys(updateData) },
      status: 'SUCCESS',
    });

    return sendSuccess(res, 'User account updated successfully', {
      ...updated,
      clientName: updated.clientName || updated.notes || null,
    });
  } catch (error: any) {
    console.error('[Update User Error]:', error);
    return sendError(res, 'Failed to update user account', 500);
  }
}

export async function toggleUserStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updated = await (prisma as any).clientUser.update({
      where: { id },
      data: { status },
      include: { application: true },
    });

    await logActivity({
      appId: updated.appId,
      action: `USER_STATUS_${status}`,
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { username: updated.username, newStatus: status },
      status: 'SUCCESS',
    });

    try {
      await notifyAdminAction({
        appName: updated.application?.name || updated.appId,
        appId: updated.appId,
        action: `USER_STATUS_${status}`,
        target: updated.username,
        details: `Status changed to ${status}`,
        adminIp: req.ip,
      });
    } catch (e) {}

    return sendSuccess(res, `User status set to ${status}`, updated);
  } catch (error: any) {
    console.error('[Toggle User Status Error]:', error);
    return sendError(res, 'Failed to update user status', 500);
  }
}

export async function extendUser(req: Request, res: Response) {
  const { id } = req.params;
  const { days } = req.body;

  try {
    const user = await (prisma as any).clientUser.findUnique({ where: { id } });
    if (!user) return sendError(res, 'User account not found', 404);

    const now = new Date();
    const baseDate = user.expiresAt < now ? now : user.expiresAt;
    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + days);

    let newStatus = user.status;
    if (newExpiresAt > now && user.status === 'EXPIRED') {
      newStatus = 'ACTIVE';
    }

    const updated = await (prisma as any).clientUser.update({
      where: { id },
      data: {
        expiresAt: newExpiresAt,
        status: newStatus,
      },
      include: { application: true },
    });

    await logActivity({
      appId: updated.appId,
      action: days >= 0 ? 'USER_ADD_DAYS' : 'USER_REMOVE_DAYS',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { username: updated.username, days, newExpiresAt: updated.expiresAt },
      status: 'SUCCESS',
    });

    try {
      await notifyAdminAction({
        appName: updated.application?.name || updated.appId,
        appId: updated.appId,
        action: days >= 0 ? 'USER_ADD_DAYS' : 'USER_REMOVE_DAYS',
        target: updated.username,
        details: `Modified duration by ${days} days (New expiry: ${updated.expiresAt.toISOString().split('T')[0]})`,
        adminIp: req.ip,
      });
    } catch (e) {}

    return sendSuccess(res, `User duration modified by ${days} day(s)`, updated);
  } catch (error: any) {
    console.error('[Extend User Error]:', error);
    return sendError(res, 'Failed to extend user duration', 500);
  }
}

export async function resetUserHwid(req: Request, res: Response) {
  const { id } = req.params;
  const { boundHwid } = req.body;

  try {
    const newBound = boundHwid ? hashHwid(boundHwid) : null;

    const updated = await (prisma as any).clientUser.update({
      where: { id },
      data: { boundHwid: newBound },
      include: { application: true },
    });

    await logActivity({
      appId: updated.appId,
      action: 'USER_RESET_HWID',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { username: updated.username, newBoundHwid: newBound },
      status: 'SUCCESS',
    });

    try {
      await notifyAdminAction({
        appName: updated.application?.name || updated.appId,
        appId: updated.appId,
        action: 'USER_RESET_HWID',
        target: updated.username,
        details: newBound ? `Bound HWID set to ${newBound.substring(0, 16)}...` : 'Bound HWID unlinked / cleared',
        adminIp: req.ip,
      });
    } catch (e) {}

    return sendSuccess(res, 'User bound HWID reset successfully', updated);
  } catch (error: any) {
    console.error('[Reset User HWID Error]:', error);
    return sendError(res, 'Failed to reset bound HWID', 500);
  }
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const user = await (prisma as any).clientUser.findUnique({
      where: { id },
      include: { application: true },
    });
    if (!user) return sendError(res, 'User account not found', 404);

    await (prisma as any).clientUser.delete({ where: { id } });

    await logActivity({
      appId: user.appId,
      action: 'USER_DELETE',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { username: user.username },
      status: 'SUCCESS',
    });

    try {
      await notifyAdminAction({
        appName: user.application?.name || user.appId,
        appId: user.appId,
        action: 'USER_DELETE',
        target: user.username,
        details: 'User account permanently deleted',
        adminIp: req.ip,
      });
    } catch (e) {}

    return sendSuccess(res, 'User account deleted successfully');
  } catch (error: any) {
    console.error('[Delete User Error]:', error);
    return sendError(res, 'Failed to delete user account', 500);
  }
}

export async function bulkUserActions(req: Request, res: Response) {
  const { userIds, action, days } = req.body;

  try {
    if (action === 'PAUSE') {
      await (prisma as any).clientUser.updateMany({
        where: { id: { in: userIds } },
        data: { status: 'PAUSED' },
      });
    } else if (action === 'RESUME') {
      await (prisma as any).clientUser.updateMany({
        where: { id: { in: userIds } },
        data: { status: 'ACTIVE' },
      });
    } else if (action === 'DELETE') {
      await (prisma as any).clientUser.deleteMany({
        where: { id: { in: userIds } },
      });
    } else if (action === 'ADD_DAYS' && typeof days === 'number') {
      const users = await (prisma as any).clientUser.findMany({
        where: { id: { in: userIds } },
      });
      const now = new Date();

      await Promise.all(
        users.map(async (user: any) => {
          const baseDate = user.expiresAt < now ? now : user.expiresAt;
          const newExp = new Date(baseDate);
          newExp.setDate(newExp.getDate() + days);
          let newStatus = user.status;
          if (newExp > now && user.status === 'EXPIRED') {
            newStatus = 'ACTIVE';
          }
          await (prisma as any).clientUser.update({
            where: { id: user.id },
            data: { expiresAt: newExp, status: newStatus },
          });
        })
      );
    }

    await logActivity({
      action: `USER_BULK_${action}`,
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { count: userIds.length, action, days },
      status: 'SUCCESS',
    });

    return sendSuccess(res, `Bulk action '${action}' completed on ${userIds.length} users`);
  } catch (error: any) {
    console.error('[Bulk User Actions Error]:', error);
    return sendError(res, 'Bulk user action failed', 500);
  }
}
