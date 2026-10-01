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
    let botNameSetting: any = null;
    let botAvatarSetting: any = null;
    let notifyAuthSuccessSetting: any = null;
    let notifyAuthFailSetting: any = null;
    let notifyLicenseCreateSetting: any = null;
    let notifyFreeTrialSetting: any = null;
    let notifyAdminActionsSetting: any = null;

    try {
      webhookUrlSetting = await (prisma as any).setting?.findUnique({
        where: { key: 'discord_webhook_url' },
      });
      botNameSetting = await (prisma as any).setting?.findUnique({
        where: { key: 'discord_bot_name' },
      });
      botAvatarSetting = await (prisma as any).setting?.findUnique({
        where: { key: 'discord_avatar_url' },
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
      notifyFreeTrialSetting = await (prisma as any).setting?.findUnique({
        where: { key: 'discord_notify_free_trial' },
      });
      notifyAdminActionsSetting = await (prisma as any).setting?.findUnique({
        where: { key: 'discord_notify_admin_actions' },
      });
    } catch (dbErr) {
      // Table might not exist yet if db:push hasn't run
    }

    const rawUrl = webhookUrlSetting?.value || process.env.DISCORD_WEBHOOK_URL || '';

    return sendSuccess(res, 'Settings retrieved successfully', {
      discord: {
        hasWebhook: !!rawUrl.trim(),
        webhookUrl: rawUrl.trim(),
        maskedUrl: maskWebhookUrl(rawUrl),
        botName: botNameSetting?.value || 'Null-Auth Security Guard',
        botAvatarUrl: botAvatarSetting?.value || 'https://i.imgur.com/8Qp4w9f.png',
        notifyAuthSuccess: notifyAuthSuccessSetting ? notifyAuthSuccessSetting.value === 'true' : true,
        notifyAuthFail: notifyAuthFailSetting ? notifyAuthFailSetting.value === 'true' : true,
        notifyLicenseCreate: notifyLicenseCreateSetting ? notifyLicenseCreateSetting.value === 'true' : true,
        notifyFreeTrial: notifyFreeTrialSetting ? notifyFreeTrialSetting.value === 'true' : true,
        notifyAdminActions: notifyAdminActionsSetting ? notifyAdminActionsSetting.value === 'true' : true,
      },
    });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch settings', 500, error.message);
  }
}

export async function updateWebhookSettings(req: Request, res: Response) {
  const {
    webhookUrl,
    botName,
    botAvatarUrl,
    notifyAuthSuccess,
    notifyAuthFail,
    notifyLicenseCreate,
    notifyFreeTrial,
    notifyAdminActions,
  } = req.body;

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

    if (botName !== undefined) {
      await (prisma as any).setting?.upsert({
        where: { key: 'discord_bot_name' },
        update: { value: String(botName).trim() },
        create: { key: 'discord_bot_name', value: String(botName).trim() },
      });
    }

    if (botAvatarUrl !== undefined) {
      await (prisma as any).setting?.upsert({
        where: { key: 'discord_avatar_url' },
        update: { value: String(botAvatarUrl).trim() },
        create: { key: 'discord_avatar_url', value: String(botAvatarUrl).trim() },
      });
    }

    const toggles = [
      { key: 'discord_notify_auth_success', val: notifyAuthSuccess },
      { key: 'discord_notify_auth_fail', val: notifyAuthFail },
      { key: 'discord_notify_license_create', val: notifyLicenseCreate },
      { key: 'discord_notify_free_trial', val: notifyFreeTrial },
      { key: 'discord_notify_admin_actions', val: notifyAdminActions },
    ];

    for (const toggle of toggles) {
      if (toggle.val !== undefined) {
        await (prisma as any).setting?.upsert({
          where: { key: toggle.key },
          update: { value: String(toggle.val) },
          create: { key: toggle.key, value: String(toggle.val) },
        });
      }
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

    const unixTime = Math.floor(Date.now() / 1000);

    const testEmbed = {
      title: '🛰️ Null-Auth Discord Command Center Verified',
      description: 'Your Discord Webhook channel has been successfully linked to **Null-Auth Security Cloud**! All licensing events and security violations will be delivered to this channel in real time.',
      color: DISCORD_COLORS.CYAN,
      fields: [
        { name: 'Status', value: '🟢 **Connected & Operational**', inline: true },
        { name: 'Platform', value: 'Null-Auth v2.4', inline: true },
        { name: 'Triggered By Admin IP', value: `\`${req.ip || 'Admin Dashboard'}\``, inline: true },
        { name: 'Timestamp', value: `<t:${unixTime}:F>`, inline: false },
      ],
      footer: { text: 'Null-Auth Security • Discord Integration' },
      timestamp: new Date().toISOString(),
    };

    const result = await sendDiscordWebhook(targetUrl, testEmbed);

    if (!result.success) {
      return sendError(res, result.error || 'Failed to dispatch test webhook to Discord', 400);
    }

    return sendSuccess(res, 'Test webhook delivered successfully to Discord!');
  } catch (error: any) {
    return sendError(res, 'Failed to send test webhook', 500, error.message);
  }
}
