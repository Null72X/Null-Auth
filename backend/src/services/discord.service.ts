import { prisma } from '../db.js';

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
}

interface DiscordPayload {
  username?: string;
  avatar_url?: string;
  embeds: DiscordEmbed[];
}

export const DISCORD_COLORS = {
  SUCCESS: 0x22c55e, // Emerald Green
  ALERT: 0xef4444,   // Crimson Red
  INFO: 0x6366f1,    // Indigo
  WARNING: 0xf59e0b, // Amber
  CYAN: 0x06b6d4,    // Cyan
};

/**
 * Resolves the Discord Webhook URL for an app or system-wide
 */
export async function getDiscordWebhookUrl(appId?: string): Promise<string | null> {
  try {
    // 1. Check if application has custom webhook URL
    if (appId) {
      const app = await prisma.application.findFirst({
        where: { OR: [{ id: appId }, { appId }] },
        select: { discordWebhookUrl: true } as any,
      });
      if ((app as any)?.discordWebhookUrl?.trim()) {
        return (app as any).discordWebhookUrl.trim();
      }
    }

    // 2. Check database global setting
    const globalSetting = await (prisma as any).setting?.findUnique({
      where: { key: 'discord_webhook_url' },
    });
    if (globalSetting?.value?.trim()) {
      return globalSetting.value.trim();
    }

    // 3. Check environment variable
    if (process.env.DISCORD_WEBHOOK_URL?.trim()) {
      return process.env.DISCORD_WEBHOOK_URL.trim();
    }
  } catch (err) {
    console.warn('[Discord Webhook] Failed to resolve webhook URL:', err);
  }

  return null;
}

/**
 * Raw dispatcher to send a Discord embed
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  embed: DiscordEmbed
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return { success: false, error: 'Invalid Discord Webhook URL format' };
    }

    const payload: DiscordPayload = {
      username: 'Null-Auth Guard',
      avatar_url: 'https://i.imgur.com/8Qp4w9f.png',
      embeds: [
        {
          ...embed,
          timestamp: embed.timestamp || new Date().toISOString(),
          footer: embed.footer || { text: 'Null-Auth Security • Licensing Platform' },
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Discord responded with HTTP ${response.status}: ${text}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Discord Webhook Error]:', error);
    return { success: false, error: error.message || 'Network error dispatching webhook' };
  }
}

/**
 * Dispatch an event notification using the resolved webhook
 */
export async function notifyDiscordEvent(options: {
  appId?: string;
  embed: DiscordEmbed;
}): Promise<void> {
  const url = await getDiscordWebhookUrl(options.appId);
  if (!url) return; // Webhook not configured, silently skip

  await sendDiscordWebhook(url, options.embed);
}

/**
 * Notification: License Created / Generated
 */
export async function notifyLicenseCreated(data: {
  appName: string;
  appId: string;
  keys: string[];
  clientName?: string | null;
  days: number;
  adminIp?: string;
}): Promise<void> {
  const isBatch = data.keys.length > 1;
  const keyDisplay = isBatch
    ? `\`${data.keys.length} License Keys Generated\``
    : `\`${data.keys[0]}\``;

  const fields: DiscordEmbedField[] = [
    { name: 'Application', value: `**${data.appName}** (\`${data.appId}\`)`, inline: true },
    { name: 'Duration', value: `${data.days} Days`, inline: true },
    { name: 'Client Name', value: data.clientName ? `**${data.clientName}**` : '*None specified*', inline: true },
  ];

  if (!isBatch) {
    fields.push({ name: 'License Key', value: keyDisplay, inline: false });
  }

  if (data.adminIp) {
    fields.push({ name: 'Admin IP', value: `\`${data.adminIp}\``, inline: true });
  }

  await notifyDiscordEvent({
    appId: data.appId,
    embed: {
      title: isBatch ? '📦 Batch License Keys Generated' : '🔑 New License Key Created',
      description: isBatch
        ? `Successfully generated **${data.keys.length}** licenses for **${data.appName}**.`
        : `A new client license has been provisioned and is ready for activation.`,
      color: DISCORD_COLORS.INFO,
      fields,
    },
  });
}

/**
 * Notification: HWID Whitelist Authorized
 */
export async function notifyHwidWhitelisted(data: {
  appName: string;
  appId: string;
  hwidHash: string;
  clientName?: string | null;
  days: number;
  adminIp?: string;
}): Promise<void> {
  await notifyDiscordEvent({
    appId: data.appId,
    embed: {
      title: '💻 HWID Whitelist Authorized',
      description: `A machine has been authorized to access **${data.appName}**.`,
      color: DISCORD_COLORS.SUCCESS,
      fields: [
        { name: 'Application', value: `**${data.appName}** (\`${data.appId}\`)`, inline: true },
        { name: 'Client Name', value: data.clientName ? `**${data.clientName}**` : '*None specified*', inline: true },
        { name: 'Duration', value: `${data.days} Days`, inline: true },
        { name: 'Machine Hash', value: `\`${data.hwidHash.substring(0, 16)}...\``, inline: false },
      ],
    },
  });
}

/**
 * Notification: Client Auth Success
 */
export async function notifyClientAuthSuccess(data: {
  appName: string;
  appId: string;
  clientName?: string | null;
  keyOrHwid: string;
  ip?: string;
  version: string;
}): Promise<void> {
  await notifyDiscordEvent({
    appId: data.appId,
    embed: {
      title: '✅ Client Authentication Successful',
      description: `Client successfully authenticated into **${data.appName}**.`,
      color: DISCORD_COLORS.SUCCESS,
      fields: [
        { name: 'Application', value: `**${data.appName}**`, inline: true },
        { name: 'Client Name', value: data.clientName ? `**${data.clientName}**` : '*Unbound*', inline: true },
        { name: 'Client Version', value: `\`v${data.version}\``, inline: true },
        { name: 'Identifier / Key', value: `\`${data.keyOrHwid}\``, inline: false },
        { name: 'Client IP', value: `\`${data.ip || 'Unknown'}\``, inline: true },
      ],
    },
  });
}

/**
 * Notification: Security Alert / Auth Failure (Invalid HWID, Version mismatch, Banned user)
 */
export async function notifySecurityAlert(data: {
  appName: string;
  appId: string;
  reason: string;
  clientName?: string | null;
  keyOrHwid?: string;
  ip?: string;
  hwid?: string;
  clientVersion?: string;
}): Promise<void> {
  const fields: DiscordEmbedField[] = [
    { name: 'Application', value: `**${data.appName}**`, inline: true },
    { name: 'Violation / Reason', value: `⚠️ **${data.reason}**`, inline: true },
  ];

  if (data.clientName) {
    fields.push({ name: 'Client Name', value: `**${data.clientName}**`, inline: true });
  }

  if (data.keyOrHwid) {
    fields.push({ name: 'Provided Key / Hash', value: `\`${data.keyOrHwid}\``, inline: false });
  }

  if (data.hwid) {
    fields.push({ name: 'Reported HWID', value: `\`${data.hwid.substring(0, 24)}...\``, inline: false });
  }

  fields.push({ name: 'Origin IP', value: `\`${data.ip || 'Unknown'}\``, inline: true });

  if (data.clientVersion) {
    fields.push({ name: 'Client Version', value: `\`v${data.clientVersion}\``, inline: true });
  }

  await notifyDiscordEvent({
    appId: data.appId,
    embed: {
      title: '🚨 Null-Auth Security Alert',
      description: `An unauthorized or invalid authentication attempt was blocked by the security gate.`,
      color: DISCORD_COLORS.ALERT,
      fields,
    },
  });
}

/**
 * Notification: Critical Security Threat (Debugger, Packet Sniffer, Reversing Tool)
 */
export async function notifyCriticalThreat(data: {
  appName: string;
  appId: string;
  threatType: string;
  threatDetails?: string;
  clientName?: string | null;
  keyOrHwid?: string;
  ip?: string;
  hwid?: string;
  actionTaken?: string;
}): Promise<void> {
  const fields: DiscordEmbedField[] = [
    { name: 'Application', value: `**${data.appName}** (\`${data.appId}\`)`, inline: true },
    { name: 'Threat Type', value: `🔥 **${data.threatType}**`, inline: true },
  ];

  if (data.clientName) {
    fields.push({ name: 'Client Name', value: `**${data.clientName}**`, inline: true });
  }

  if (data.threatDetails) {
    fields.push({ name: 'Threat Details', value: `\`${data.threatDetails}\``, inline: false });
  }

  if (data.keyOrHwid) {
    fields.push({ name: 'Offending Key / Identifier', value: `\`${data.keyOrHwid}\``, inline: false });
  }

  if (data.hwid) {
    fields.push({ name: 'Reported HWID', value: `\`${data.hwid.substring(0, 24)}...\``, inline: false });
  }

  fields.push({ name: 'Action Taken', value: `🔒 **${data.actionTaken || 'Access Revoked / Key Auto-Banned'}**`, inline: true });
  fields.push({ name: 'Attacker IP', value: `\`${data.ip || 'Unknown'}\``, inline: true });

  await notifyDiscordEvent({
    appId: data.appId,
    embed: {
      title: '🚨 CRITICAL SECURITY THREAT DETECTED',
      description: `A reverse-engineering or debugging tool was detected by the client defense shield. Automated sanctions applied.`,
      color: DISCORD_COLORS.ALERT,
      fields,
    },
  });
}

/**
 * Send a test webhook notification to verify Discord integration
 */
export async function notifyTestWebhook(data: {
  appName: string;
  appId: string;
  id: string;
  adminIp?: string;
}): Promise<{ success: boolean; error?: string }> {
  const url = await getDiscordWebhookUrl(data.id);
  if (!url) {
    return {
      success: false,
      error: 'No Discord webhook URL configured for this application or globally.',
    };
  }

  return await sendDiscordWebhook(url, {
    title: '🔔 Discord Webhook Test Verified',
    description: `Successfully established communication between **Null-Auth** and Discord for **${data.appName}**!`,
    color: DISCORD_COLORS.INFO,
    fields: [
      { name: 'Application', value: `**${data.appName}**`, inline: true },
      { name: 'App ID', value: `\`${data.appId}\``, inline: true },
      { name: 'Triggered By Admin IP', value: `\`${data.adminIp || 'Console'}\``, inline: true },
      { name: 'Status', value: '🟢 **Operational**', inline: true },
      { name: 'Timestamp', value: new Date().toUTCString(), inline: true },
    ],
  });
}

