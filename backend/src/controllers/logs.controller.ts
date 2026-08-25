import { Request, Response } from 'express';
import { prisma } from '../db.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function listActivityLogs(req: Request, res: Response) {
  const { appId, action, actorType, status, search, page = '1', limit = '30' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const whereClause: any = {};

  if (appId && typeof appId === 'string') {
    whereClause.appId = appId;
  }

  if (action && typeof action === 'string') {
    whereClause.action = action;
  }

  if (actorType && typeof actorType === 'string') {
    whereClause.actorType = actorType;
  }

  if (status && typeof status === 'string') {
    whereClause.status = status;
  }

  if (search && typeof search === 'string') {
    const s = search.trim();
    whereClause.OR = [
      { action: { contains: s } },
      { details: { contains: s } },
      { ipAddress: { contains: s } },
    ];
  }

  try {
    const totalCount = await prisma.activityLog.count({ where: whereClause });
    const logs = await prisma.activityLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    return sendSuccess(res, 'Activity logs retrieved', logs, 200, {
      totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch activity logs', 500, error.message);
  }
}

export async function getDashboardStats(_req: Request, res: Response) {
  try {
    const now = new Date();

    const [
      totalApps,
      activeApps,
      totalLicenses,
      activeLicenses,
      expiredLicenses,
      totalHwids,
      activeHwids,
      recentApps,
      recentLogs,
    ] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({ where: { status: 'ACTIVE' } }),
      prisma.license.count(),
      prisma.license.count({ where: { status: 'ACTIVE', expiresAt: { gt: now } } }),
      prisma.license.count({
        where: { OR: [{ status: 'EXPIRED' }, { expiresAt: { lte: now } }] },
      }),
      prisma.hwidAccess.count(),
      prisma.hwidAccess.count({ where: { status: 'ACTIVE', expiresAt: { gt: now } } }),
      prisma.application.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, appId: true, name: true, type: true, status: true, createdAt: true },
      }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return sendSuccess(res, 'Dashboard statistics fetched', {
      totalApps,
      activeApps,
      totalLicenses,
      activeLicenses,
      expiredLicenses,
      totalHwids,
      activeHwids,
      recentApps,
      recentLogs,
    });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch dashboard stats', 500, error.message);
  }
}
