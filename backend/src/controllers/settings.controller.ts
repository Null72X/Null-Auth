import { Request, Response } from 'express';
import { prisma } from '../db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { sendDiscordWebhook, DISCORD_COLORS } from '../services/discord.service.js';

/**
 * Helper to mask sensitive webhook URLs (shows only prefix and domain)
 */
function maskWebhookUrl(url: string): string {
  if (!url || url.length < 20) return '';
  const parts = url.split('/');
  const token = parts[parts.length - 1] || '';
  const webhookId = parts[parts.length - 2] || '';
  const maskedToken = token.length > 6 ? token.substring(0, 4) + '...' + token.substring(token.length - 4) : '••••';
  return `https://discord.com/api/webhooks/${webhookId}/${maskedToken}`;
}

export async function getSettings(req: Request, res: Response) {
  try {
    let webhookUrlSetting: any = null;
    let notifyAuthSuccessSetting: any = null;
    let notifyAuthFailSetting: any = null;
    let notifyLicenseCreateSetting: any = null;

    try {
      webhookUrlSetting = await (prisma as any).setting?.findUnique({
        where: { key: 'discord_webhook_url' },
      });
      notifyAuthSuccessSetting = await (prisma as any).setting?.findUnique({
        where: { key: 'discord_notify_auth_success' },
      });
      notifyAuthFailSetting = await (prisma as any).setting?.findUnique({
        where: { key: 'discord_notify_auth_fail' },
      });
      notifyLicenseCreateSetting = await (prisma as any).setting?.findUnique({
        where: { key: 'discord_notify_license_create' },
      });
    } catch (dbErr) {
      // Table might not exist yet if db:push hasn't run
    }

    const rawUrl = webhookUrlSetting?.value || process.env.DISCORD_WEBHOOK_URL || '';

    return sendSuccess(res, 'Settings retrieved successfully', {
      discord: {
        hasWebhook: !!rawUrl.trim(),
        maskedUrl: maskWebhookUrl(rawUrl),
        notifyAuthSuccess: notifyAuthSuccessSetting ? notifyAuthSuccessSetting.value === 'true' : true,
        notifyAuthFail: notifyAuthFailSetting ? notifyAuthFailSetting.value === 'true' : true,
        notifyLicenseCreate: notifyLicenseCreateSetting ? notifyLicenseCreateSetting.value === 'true' : true,
      },
    });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch settings', 500, error.message);
  }
}

export async function updateWebhookSettings(req: Request, res: Response) {
  const { webhookUrl, notifyAuthSuccess, notifyAuthFail, notifyLicenseCreate } = req.body;

  try {
    if (webhookUrl !== undefined) {
      const trimmedUrl = (webhookUrl || '').trim();
      if (trimmedUrl && !trimmedUrl.startsWith('https://discord.com/api/webhooks/')) {
        return sendError(res, 'Webhook URL must begin with https://discord.com/api/webhooks/', 400);
      }

      await (prisma as any).setting?.upsert({
        where: { key: 'discord_webhook_url' },
        update: { value: trimmedUrl },
        create: { key: 'discord_webhook_url', value: trimmedUrl },
      });
    }

    if (notifyAuthSuccess !== undefined) {
      await (prisma as any).setting?.upsert({
        where: { key: 'discord_notify_auth_success' },
        update: { value: String(notifyAuthSuccess) },
        create: { key: 'discord_notify_auth_success', value: String(notifyAuthSuccess) },
      });
    }

    if (notifyAuthFail !== undefined) {
      await (prisma as any).setting?.upsert({
        where: { key: 'discord_notify_auth_fail' },
        update: { value: String(notifyAuthFail) },
        create: { key: 'discord_notify_auth_fail', value: String(notifyAuthFail) },
      });
    }

    if (notifyLicenseCreate !== undefined) {
      await (prisma as any).setting?.upsert({
        where: { key: 'discord_notify_license_create' },
        update: { value: String(notifyLicenseCreate) },
        create: { key: 'discord_notify_license_create', value: String(notifyLicenseCreate) },
      });
    }

    return sendSuccess(res, 'Discord Webhook settings saved successfully');
  } catch (error: any) {
    return sendError(res, 'Failed to save Discord settings', 500, error.message);
  }
}

export async function testWebhook(req: Request, res: Response) {
  const { webhookUrl } = req.body;

  try {
    let targetUrl = (webhookUrl || '').trim();

    if (!targetUrl) {
      const stored = await (prisma as any).setting?.findUnique({
        where: { key: 'discord_webhook_url' },
      });
      targetUrl = stored?.value || process.env.DISCORD_WEBHOOK_URL || '';
    }

    if (!targetUrl) {
      return sendError(res, 'No Discord Webhook URL provided or configured', 400);
    }

    const testEmbed = {
      title: '🛰️ Null-Auth Discord Webhook Test',
      description: 'Your Discord Webhook has been successfully linked to **Null-Auth**! All security alerts and licensing events will be delivered to this channel in real time.',
      color: DISCORD_COLORS.CYAN,
      fields: [
        { name: 'Status', value: '🟢 **Connected & Operational**', inline: true },
        { name: 'Platform', value: 'Null-Auth v1.0.0', inline: true },
        { name: 'Triggered By', value: req.ip || 'Admin Dashboard', inline: true },
      ],
      footer: { text: 'Null-Auth Security • Discord Integration' },
      timestamp: new Date().toISOString(),
    };

    const result = await sendDiscordWebhook(targetUrl, testEmbed);

    if (!result.success) {
      return sendError(res, result.error || 'Failed to dispatch test webhook to Discord', 400);
    }

    return sendSuccess(res, 'Test webhook sent successfully to Discord! Check your channel.');
  } catch (error: any) {
    return sendError(res, 'Failed to send test webhook', 500, error.message);
  }
}
