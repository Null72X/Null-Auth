import { prisma } from '../db.js';

export interface LogParams {
  appId?: string;
  action: string;
  actorType: 'ADMIN' | 'CLIENT';
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any> | string;
  status: 'SUCCESS' | 'FAILURE';
}

export async function logActivity(params: LogParams): Promise<void> {
  try {
    let detailsString: string | null = null;
    if (params.details) {
      detailsString = typeof params.details === 'string' 
        ? params.details 
        : JSON.stringify(params.details);
    }

    await prisma.activityLog.create({
      data: {
        appId: params.appId || null,
        action: params.action,
        actorType: params.actorType,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        details: detailsString,
        status: params.status,
      },
    });
  } catch (error) {
    console.error('[Logger Service Error]: Failed to write activity log:', error);
  }
}
