import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { hashHwid } from '../services/hash.service.js';
import { logActivity } from '../services/logger.service.js';
import { notifyHwidWhitelisted } from '../services/discord.service.js';

export const addHwidSchema = z.object({
  appId: z.string().min(1, 'Application ID is required'),
  hwid: z.string().min(1, 'Hardware / User Identifier is required'),
  days: z.number().int().min(1).default(30),
  clientName: z.string().optional(),
  notes: z.string().optional(),
});

export const updateHwidSchema = z.object({
  clientName: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'EXPIRED', 'BANNED']).optional(),
  expiresAt: z.string().optional(),
  hwidHash: z.string().optional(),
  hwid: z.string().optional(),
});

export const extendHwidSchema = z.object({
  days: z.number().int(),
});

export async function listHwidEntries(req: Request, res: Response) {
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
      { hwidHash: { contains: s } },
      { notes: { contains: s } },
    ];
  }

  try {
    const totalCount = await prisma.hwidAccess.count({ where: whereClause });
    const entries = await prisma.hwidAccess.findMany({
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

    const formatted = entries.map((entry: any) => {
      const isExpired = entry.expiresAt <= now;
      let effectiveStatus = entry.status;
      if (entry.status === 'ACTIVE' && isExpired) {
        effectiveStatus = 'EXPIRED';
      }

      const diffTime = entry.expiresAt.getTime() - now.getTime();
      const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

      return {
        ...entry,
        clientName: entry.clientName || entry.notes || null,
        effectiveStatus,
        remainingDays,
      };
    });

    return sendSuccess(res, 'HWID access entries retrieved successfully', {
      entries: formatted,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch HWID entries', 500, error.message);
  }
}

export async function getHwidEntryById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const entry: any = await prisma.hwidAccess.findUnique({
      where: { id },
      include: {
        application: true,
      },
    });

    if (!entry) {
      return sendError(res, 'HWID entry not found', 404);
    }

    const now = new Date();
    const isExpired = entry.expiresAt <= now;
    const diffTime = entry.expiresAt.getTime() - now.getTime();
    const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

    return sendSuccess(res, 'HWID entry retrieved successfully', {
      ...entry,
      clientName: entry.clientName || entry.notes || null,
      effectiveStatus: entry.status === 'ACTIVE' && isExpired ? 'EXPIRED' : entry.status,
      remainingDays,
    });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch HWID entry', 500, error.message);
  }
}

export async function addHwidEntry(req: Request, res: Response) {
  const { appId, hwid, days = 30, clientName, notes } = req.body;
  const resolvedClientName = (clientName !== undefined ? clientName : notes) || null;

  try {
    const app = await prisma.application.findFirst({
      where: { OR: [{ id: appId }, { appId }] },
    });

    if (!app) {
      return sendError(res, 'Application not found', 404);
    }

    if (app.type !== 'HWID') {
      return sendError(res, 'Application is a License-based app, not an HWID Access app', 400);
    }

    const hwidHash = hashHwid(hwid);

    const existing = await prisma.hwidAccess.findUnique({
      where: {
        appId_hwidHash: {
          appId: app.id,
          hwidHash,
        },
      },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    if (existing) {
      const updated: any = await prisma.hwidAccess.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          expiresAt,
          notes: resolvedClientName !== null ? resolvedClientName : (existing as any).notes,
        },
      });

      await logActivity({
        appId: app.id,
        action: 'HWID_REACTIVATE',
        actorType: 'ADMIN',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { hwidHash, days, appId: app.appId, clientName: resolvedClientName },
        status: 'SUCCESS',
      });

      return sendSuccess(res, 'HWID access authorized and reactivated successfully', {
        ...updated,
        clientName: updated.clientName || updated.notes || null,
      }, 200);
    }

    const newEntry: any = await prisma.hwidAccess.create({
      data: {
        appId: app.id,
        hwidHash,
        status: 'ACTIVE',
        expiresAt,
        notes: resolvedClientName,
      },
    });

    await logActivity({
      appId: app.id,
      action: 'HWID_ADD',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { hwidHash, days, appId: app.appId, clientName: resolvedClientName },
      status: 'SUCCESS',
    });

    // Dispatch Discord Webhook
    try {
      await notifyHwidWhitelisted({
        appName: app.name,
        appId: app.appId,
        hwidHash,
        clientName: resolvedClientName,
        days,
        adminIp: req.ip,
      });
    } catch (discordErr) {
      console.warn('[Discord Webhook Error]:', discordErr);
    }

    return sendSuccess(res, 'HWID access authorized successfully', {
      ...newEntry,
      clientName: newEntry.clientName || newEntry.notes || null,
    }, 201);
  } catch (error: any) {
    return sendError(res, 'Failed to add HWID entry', 500, error.message);
  }
}

export async function updateHwidEntry(req: Request, res: Response) {
  const { id } = req.params;
  const { clientName, notes, status, expiresAt, hwid, hwidHash } = req.body;

  try {
    const existing = await prisma.hwidAccess.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'HWID entry not found', 404);
    }

    const updateData: any = {};
    const resolvedClientName = clientName !== undefined ? clientName : notes;
    if (resolvedClientName !== undefined) {
      updateData.notes = resolvedClientName ? resolvedClientName.trim() : null;
    }
    if (status !== undefined) updateData.status = status;
    if (expiresAt) updateData.expiresAt = new Date(expiresAt);
    if (hwid || hwidHash) {
      const raw = (hwid || hwidHash).trim();
      updateData.hwidHash = raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)
        ? raw
        : hashHwid(raw);
    }

    const updated: any = await prisma.hwidAccess.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
      appId: updated.appId,
      action: 'HWID_UPDATE',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { hwidHash: updated.hwidHash, updates: updateData },
      status: 'SUCCESS',
    });

    return sendSuccess(res, 'HWID entry updated successfully', {
      ...updated,
      clientName: updated.clientName || updated.notes || null,
    });
  } catch (error: any) {
    return sendError(res, 'Failed to update HWID entry', 500, error.message);
  }
}

export async function toggleHwidStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updated = await prisma.hwidAccess.update({
      where: { id },
      data: { status },
    });

    await logActivity({
      appId: updated.appId,
      action: `HWID_STATUS_${status}`,
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { hwidHash: updated.hwidHash, newStatus: status },
      status: 'SUCCESS',
    });

    return sendSuccess(res, `HWID status set to ${status}`, updated);
  } catch (error: any) {
    return sendError(res, 'Failed to update HWID status', 500, error.message);
  }
}

export async function extendHwid(req: Request, res: Response) {
  const { id } = req.params;
  const { days } = req.body;

  try {
    const entry = await prisma.hwidAccess.findUnique({ where: { id } });
    if (!entry) return sendError(res, 'HWID entry not found', 404);

    const now = new Date();
    const baseDate = entry.expiresAt < now ? now : entry.expiresAt;
    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + days);

    let newStatus = entry.status;
    if (newExpiresAt > now && entry.status === 'EXPIRED') {
      newStatus = 'ACTIVE';
    }

    const updated = await prisma.hwidAccess.update({
      where: { id },
      data: {
        expiresAt: newExpiresAt,
        status: newStatus,
      },
    });

    await logActivity({
      appId: updated.appId,
      action: days >= 0 ? 'HWID_ADD_DAYS' : 'HWID_REMOVE_DAYS',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { hwidHash: updated.hwidHash, days, newExpiresAt: updated.expiresAt },
      status: 'SUCCESS',
    });

    return sendSuccess(res, `HWID expiration modified by ${days} day(s)`, updated);
  } catch (error: any) {
    return sendError(res, 'Failed to extend HWID expiration', 500, error.message);
  }
}

export async function deleteHwidEntry(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const entry = await prisma.hwidAccess.findUnique({ where: { id } });
    if (!entry) return sendError(res, 'HWID entry not found', 404);

    await prisma.hwidAccess.delete({ where: { id } });

    await logActivity({
      appId: entry.appId,
      action: 'HWID_DELETE',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { hwidHash: entry.hwidHash },
      status: 'SUCCESS',
    });

    return sendSuccess(res, 'HWID authorization deleted successfully');
  } catch (error: any) {
    return sendError(res, 'Failed to delete HWID entry', 500, error.message);
  }
}
