import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { generateLicenseKey } from '../utils/generator.js';
import { hashHwid } from '../services/hash.service.js';
import { logActivity } from '../services/logger.service.js';

export const generateLicenseSchema = z.object({
  appId: z.string().min(1, 'Application ID is required'),
  quantity: z.number().int().min(1).max(100).default(1),
  days: z.number().int().min(1).default(30),
  notes: z.string().optional(),
});

export const updateLicenseSchema = z.object({
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'EXPIRED', 'BANNED']).optional(),
  boundHwid: z.string().nullable().optional(),
  expiresAt: z.string().optional(), // ISO date string
});

export const extendLicenseSchema = z.object({
  days: z.number().int(), // positive to add, negative to remove
});

export const setLicenseHwidSchema = z.object({
  boundHwid: z.string().nullable(),
});

export const bulkActionSchema = z.object({
  licenseIds: z.array(z.string()).min(1, 'At least one license must be selected'),
  action: z.enum(['PAUSE', 'RESUME', 'ADD_DAYS', 'DELETE']),
  days: z.number().int().optional(),
});

export async function listLicenses(req: Request, res: Response) {
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
      { key: { contains: s } },
      { notes: { contains: s } },
      { boundHwid: { contains: s } },
    ];
  }

  try {
    const totalCount = await prisma.license.count({ where: whereClause });
    const licenses = await prisma.license.findMany({
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

    const formatted = licenses.map((lic) => {
      const isExpired = lic.expiresAt <= now;
      let effectiveStatus = lic.status;
      if (lic.status === 'ACTIVE' && isExpired) {
        effectiveStatus = 'EXPIRED';
      }

      const diffTime = lic.expiresAt.getTime() - now.getTime();
      const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

      return {
        ...lic,
        effectiveStatus,
        remainingDays,
      };
    });

    return sendSuccess(res, 'Licenses retrieved successfully', formatted, 200, {
      totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch licenses', 500, error.message);
  }
}

export async function getLicenseById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const license = await prisma.license.findUnique({
      where: { id },
      include: {
        application: true,
      },
    });

    if (!license) {
      return sendError(res, 'License not found', 404);
    }

    const now = new Date();
    const isExpired = license.expiresAt <= now;
    const diffTime = license.expiresAt.getTime() - now.getTime();
    const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

    return sendSuccess(res, 'License retrieved', {
      ...license,
      effectiveStatus: license.status === 'ACTIVE' && isExpired ? 'EXPIRED' : license.status,
      remainingDays,
    });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch license', 500, error.message);
  }
}

export async function generateLicenses(req: Request, res: Response) {
  const { appId, quantity = 1, days = 30, notes } = req.body;

  try {
    const app = await prisma.application.findFirst({
      where: { OR: [{ id: appId }, { appId }] },
    });

    if (!app) {
      return sendError(res, 'Target application not found', 404);
    }

    if (app.type !== 'LICENSE') {
      return sendError(res, 'Target application is an HWID-access application, not a License-based app', 400);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const createdLicenses = [];

    for (let i = 0; i < quantity; i++) {
      let key = generateLicenseKey();
      let exists = await prisma.license.findUnique({ where: { key } });
      while (exists) {
        key = generateLicenseKey();
        exists = await prisma.license.findUnique({ where: { key } });
      }

      const lic = await prisma.license.create({
        data: {
          key,
          appId: app.id,
          status: 'ACTIVE',
          expiresAt,
          notes: notes || null,
        },
      });

      createdLicenses.push(lic);
    }

    await logActivity({
      appId: app.id,
      action: 'LICENSE_GENERATE',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { quantity, days, appId: app.appId },
      status: 'SUCCESS',
    });

    return sendSuccess(res, `Successfully generated ${quantity} license key(s)`, createdLicenses, 201);
  } catch (error: any) {
    return sendError(res, 'Failed to generate license keys', 500, error.message);
  }
}

export async function updateLicense(req: Request, res: Response) {
  const { id } = req.params;
  const { notes, status, boundHwid, expiresAt } = req.body;

  try {
    const updateData: any = {};

    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    if (boundHwid !== undefined) {
      updateData.boundHwid = boundHwid ? hashHwid(boundHwid) : null;
    }
    if (expiresAt) {
      updateData.expiresAt = new Date(expiresAt);
    }

    const updated = await prisma.license.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
      appId: updated.appId,
      action: 'LICENSE_UPDATE',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { licenseKey: updated.key, updates: updateData },
      status: 'SUCCESS',
    });

    return sendSuccess(res, 'License updated successfully', updated);
  } catch (error: any) {
    return sendError(res, 'Failed to update license', 500, error.message);
  }
}

export async function toggleLicenseStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updated = await prisma.license.update({
      where: { id },
      data: { status },
    });

    await logActivity({
      appId: updated.appId,
      action: `LICENSE_STATUS_${status}`,
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { licenseKey: updated.key, newStatus: status },
      status: 'SUCCESS',
    });

    return sendSuccess(res, `License status set to ${status}`, updated);
  } catch (error: any) {
    return sendError(res, 'Failed to update license status', 500, error.message);
  }
}

export async function extendLicense(req: Request, res: Response) {
  const { id } = req.params;
  const { days } = req.body;

  try {
    const license = await prisma.license.findUnique({ where: { id } });
    if (!license) return sendError(res, 'License not found', 404);

    const now = new Date();
    // If license is already expired, extend from now; otherwise extend from existing expiresAt
    const baseDate = license.expiresAt < now ? now : license.expiresAt;
    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + days);

    // If new expiration is in the future and status was EXPIRED, reset status to ACTIVE
    let newStatus = license.status;
    if (newExpiresAt > now && license.status === 'EXPIRED') {
      newStatus = 'ACTIVE';
    }

    const updated = await prisma.license.update({
      where: { id },
      data: {
        expiresAt: newExpiresAt,
        status: newStatus,
      },
    });

    await logActivity({
      appId: updated.appId,
      action: days >= 0 ? 'LICENSE_ADD_DAYS' : 'LICENSE_REMOVE_DAYS',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { licenseKey: updated.key, days, newExpiresAt: updated.expiresAt },
      status: 'SUCCESS',
    });

    return sendSuccess(res, `License duration modified by ${days} day(s)`, updated);
  } catch (error: any) {
    return sendError(res, 'Failed to extend license', 500, error.message);
  }
}

export async function resetLicenseHwid(req: Request, res: Response) {
  const { id } = req.params;
  const { boundHwid } = req.body;

  try {
    const newBound = boundHwid ? hashHwid(boundHwid) : null;

    const updated = await prisma.license.update({
      where: { id },
      data: { boundHwid: newBound },
    });

    await logActivity({
      appId: updated.appId,
      action: 'LICENSE_RESET_HWID',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { licenseKey: updated.key, newBoundHwid: newBound },
      status: 'SUCCESS',
    });

    return sendSuccess(res, 'License bound HWID/identifier updated', updated);
  } catch (error: any) {
    return sendError(res, 'Failed to reset bound identifier', 500, error.message);
  }
}

export async function deleteLicense(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const license = await prisma.license.findUnique({ where: { id } });
    if (!license) return sendError(res, 'License not found', 404);

    await prisma.license.delete({ where: { id } });

    await logActivity({
      appId: license.appId,
      action: 'LICENSE_DELETE',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { licenseKey: license.key },
      status: 'SUCCESS',
    });

    return sendSuccess(res, 'License deleted successfully');
  } catch (error: any) {
    return sendError(res, 'Failed to delete license', 500, error.message);
  }
}

export async function bulkLicenseActions(req: Request, res: Response) {
  const { licenseIds, action, days } = req.body;

  try {
    if (action === 'PAUSE') {
      await prisma.license.updateMany({
        where: { id: { in: licenseIds } },
        data: { status: 'PAUSED' },
      });
    } else if (action === 'RESUME') {
      await prisma.license.updateMany({
        where: { id: { in: licenseIds } },
        data: { status: 'ACTIVE' },
      });
    } else if (action === 'DELETE') {
      await prisma.license.deleteMany({
        where: { id: { in: licenseIds } },
      });
    } else if (action === 'ADD_DAYS' && typeof days === 'number') {
      const licenses = await prisma.license.findMany({
        where: { id: { in: licenseIds } },
      });
      const now = new Date();

      await Promise.all(
        licenses.map(async (lic) => {
          const baseDate = lic.expiresAt < now ? now : lic.expiresAt;
          const newExp = new Date(baseDate);
          newExp.setDate(newExp.getDate() + days);
          let newStatus = lic.status;
          if (newExp > now && lic.status === 'EXPIRED') {
            newStatus = 'ACTIVE';
          }
          await prisma.license.update({
            where: { id: lic.id },
            data: { expiresAt: newExp, status: newStatus },
          });
        })
      );
    }

    await logActivity({
      action: `LICENSE_BULK_${action}`,
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { count: licenseIds.length, action, days },
      status: 'SUCCESS',
    });

    return sendSuccess(res, `Bulk action '${action}' completed on ${licenseIds.length} licenses`);
  } catch (error: any) {
    return sendError(res, 'Bulk action failed', 500, error.message);
  }
}
