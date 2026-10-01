import { prisma } from '../db.js';

export type DiscordEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAIL'
  | 'KEY_CREATE'
  | 'FREE_TRIAL'
  | 'ADMIN_ACTION';

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbedAuthor {
  name: string;
  icon_url?: string;
  url?: string;
}

export interface DiscordEmbedFooter {
  text: string;
  icon_url?: string;
}

export interface DiscordEmbedThumbnail {
  url: string;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  author?: DiscordEmbedAuthor;
  thumbnail?: DiscordEmbedThumbnail;
  fields?: DiscordEmbedField[];
  footer?: DiscordEmbedFooter;
  timestamp?: string;
}

export interface DiscordPayload {
  username?: string;
  avatar_url?: string;
  embeds: DiscordEmbed[];
}

export const DISCORD_COLORS = {
  SUCCESS: 0x10b981, // Emerald Green
  ALERT: 0xef4444,   // Crimson Red
  INFO: 0x3b82f6,    // Royal Blue
  WARNING: 0xf59e0b, // Amber Gold
  PURPLE: 0xa855f7, // Deep Purple
  CYAN: 0x06b6d4,   // Cyber Cyan
};

const DEFAULT_BOT_NAME = 'Null-Auth Security Guard';
const DEFAULT_AVATAR_URL = 'https://i.imgur.com/8Qp4w9f.png';

/**
 * Resolves the Discord Webhook URL for a specific app or system-wide
 */
export async function getDiscordWebhookUrl(appId?: string): Promise<string | null> {
  try {
    // 1. Check if application has custom webhook URL override
    if (appId) {
      const app = await prisma.application.findFirst({
        where: { OR: [{ id: appId }, { appId }] },
        select: { discordWebhookUrl: true } as any,
      });
      if ((app as any)?.discordWebhookUrl?.trim()) {
        return (app as any).discordWebhookUrl.trim();
      }
    }

    // 2. Check global DB setting
    const globalSetting = await (prisma as any).setting?.findUnique({
      where: { key: 'discord_webhook_url' },
    });
    if (globalSetting?.value?.trim()) {
      return globalSetting.value.trim();
    }

    // 3. Check environment variable fallback
    if (process.env.DISCORD_WEBHOOK_URL?.trim()) {
      return process.env.DISCORD_WEBHOOK_URL.trim();
    }
  } catch (err) {
    console.warn('[Discord Webhook] Failed to resolve webhook URL:', err);
  }

  return null;
}

/**
 * Resolves custom bot name & avatar profile from settings
 */
export async function getDiscordBotProfile(): Promise<{ name: string; avatarUrl: string }> {
  try {
    const nameSetting = await (prisma as any).setting?.findUnique({
      where: { key: 'discord_bot_name' },
    });
    const avatarSetting = await (prisma as any).setting?.findUnique({
      where: { key: 'discord_avatar_url' },
    });

    return {
      name: nameSetting?.value?.trim() || DEFAULT_BOT_NAME,
      avatarUrl: avatarSetting?.value?.trim() || DEFAULT_AVATAR_URL,
    };
  } catch {
    return { name: DEFAULT_BOT_NAME, avatarUrl: DEFAULT_AVATAR_URL };
  }
}

/**
 * Checks if a specific Discord notification event type is enabled
 */
export async function isEventEnabled(eventType: DiscordEventType): Promise<boolean> {
  try {
    const keyMap: Record<DiscordEventType, string> = {
      AUTH_SUCCESS: 'discord_notify_auth_success',
      AUTH_FAIL: 'discord_notify_auth_fail',
      KEY_CREATE: 'discord_notify_license_create',
      FREE_TRIAL: 'discord_notify_free_trial',
      ADMIN_ACTION: 'discord_notify_admin_actions',
    };

    const settingKey = keyMap[eventType];
    const setting = await (prisma as any).setting?.findUnique({
      where: { key: settingKey },
    });

    if (setting) {
      return setting.value === 'true';
    }
  } catch (err) {}

  return true; // Default enabled
}

/**
 * Raw dispatcher to send a Discord embed payload via HTTP POST
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  embed: DiscordEmbed
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return { success: false, error: 'Invalid Discord Webhook URL format' };
    }

    const botProfile = await getDiscordBotProfile();
    const timestamp = embed.timestamp || new Date().toISOString();

    const payload: DiscordPayload = {
      username: botProfile.name,
      avatar_url: botProfile.avatarUrl,
      embeds: [
        {
          ...embed,
          timestamp,
          footer: embed.footer || {
            text: 'Null-Auth Platform • Cloud Security Gate',
            icon_url: botProfile.avatarUrl,
          },
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
      return { success: false, error: `Discord HTTP ${response.status}: ${text}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Discord Webhook Error]:', error);
    return { success: false, error: error.message || 'Network error dispatching webhook' };
  }
}

/**
 * Dispatch an event notification if event is enabled and webhook is configured
 */
export async function notifyDiscordEvent(options: {
  appId?: string;
  eventType: DiscordEventType;
  embed: DiscordEmbed;
}): Promise<void> {
  try {
    const enabled = await isEventEnabled(options.eventType);
    if (!enabled) return;

    const url = await getDiscordWebhookUrl(options.appId);
    if (!url) return;

    await sendDiscordWebhook(url, options.embed);
  } catch (err) {
    console.error('[Discord Notification Event Error]:', err);
  }
}

/**
 * Notification: License Key(s) Generated
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
  const unixTime = Math.floor(Date.now() / 1000);

  const fields: DiscordEmbedField[] = [
    { name: 'Application', value: `**${data.appName}** (\`${data.appId}\`)`, inline: true },
    { name: 'Duration', value: `\`${data.days} Days\``, inline: true },
    { name: 'Client Name', value: data.clientName ? `**${data.clientName}**` : '*None specified*', inline: true },
  ];

  if (!isBatch) {
    fields.push({ name: 'License Key', value: `\`\`\`${data.keys[0]}\`\`\``, inline: false });
  } else {
    fields.push({ name: 'Generated Batch', value: `\`${data.keys.length} License Keys Created\``, inline: false });
  }

  if (data.adminIp) {
    fields.push({ name: 'Triggered By Admin IP', value: `\`${data.adminIp}\``, inline: true });
    fields.push({ name: 'Timestamp', value: `<t:${unixTime}:R>`, inline: true });
  }

  await notifyDiscordEvent({
    appId: data.appId,
    eventType: 'KEY_CREATE',
    embed: {
      title: isBatch ? '📦 Batch License Keys Provisioned' : '🔑 New License Key Created',
      description: isBatch
        ? `Successfully generated **${data.keys.length}** licenses for **${data.appName}**.`
        : `A new client license key has been provisioned and is ready for activation.`,
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
  const unixTime = Math.floor(Date.now() / 1000);

  await notifyDiscordEvent({
    appId: data.appId,
    eventType: 'KEY_CREATE',
    embed: {
      title: '💻 HWID Whitelist Authorized',
      description: `A machine HWID SID has been authorized to access **${data.appName}**.`,
      color: DISCORD_COLORS.PURPLE,
      fields: [
        { name: 'Application', value: `**${data.appName}** (\`${data.appId}\`)`, inline: true },
        { name: 'Client Name', value: data.clientName ? `**${data.clientName}**` : '*None specified*', inline: true },
        { name: 'Duration', value: `\`${data.days} Days\``, inline: true },
        { name: 'Authorized Machine SID', value: `\`\`\`${data.hwidHash}\`\`\``, inline: false },
        { name: 'Admin IP', value: `\`${data.adminIp || 'Console'}\``, inline: true },
        { name: 'Timestamp', value: `<t:${unixTime}:R>`, inline: true },
      ],
    },
  });
}

/**
 * Notification: User Account Created
 */
export async function notifyUserCreated(data: {
  appName: string;
  appId: string;
  username: string;
  clientName?: string | null;
  days: number;
  adminIp?: string;
}): Promise<void> {
  const unixTime = Math.floor(Date.now() / 1000);

  await notifyDiscordEvent({
    appId: data.appId,
    eventType: 'KEY_CREATE',
    embed: {
      title: '👤 User Account Created',
      description: `A new client user account credential was provisioned for **${data.appName}**.`,
      color: DISCORD_COLORS.CYAN,
      fields: [
        { name: 'Application', value: `**${data.appName}** (\`${data.appId}\`)`, inline: true },
        { name: 'Username', value: `\`${data.username}\``, inline: true },
        { name: 'Duration', value: `\`${data.days} Days\``, inline: true },
        { name: 'Client Name', value: data.clientName ? `**${data.clientName}**` : '*None specified*', inline: true },
        { name: 'Admin IP', value: `\`${data.adminIp || 'Console'}\``, inline: true },
        { name: 'Timestamp', value: `<t:${unixTime}:R>`, inline: true },
      ],
    },
  });
}

/**
 * Notification: Client Auth Success (or Free Trial Auth)
 */
export async function notifyClientAuthSuccess(data: {
  appName: string;
  appId: string;
  clientName?: string | null;
  keyOrHwid: string;
  ip?: string;
  version: string;
  isFreeTrial?: boolean;
}): Promise<void> {
  const isTrial = data.isFreeTrial || data.clientName?.toLowerCase().includes('free trial');
  const eventType: DiscordEventType = isTrial ? 'FREE_TRIAL' : 'AUTH_SUCCESS';
  const unixTime = Math.floor(Date.now() / 1000);

  await notifyDiscordEvent({
    appId: data.appId,
    eventType,
    embed: {
      title: isTrial ? '🎁 Free Trial Authentication' : '🟢 Client Authentication Success',
      description: isTrial
        ? `A client authenticated using **Free Trial Access** on **${data.appName}**.`
        : `Client successfully authenticated into **${data.appName}**.`,
      color: isTrial ? DISCORD_COLORS.CYAN : DISCORD_COLORS.SUCCESS,
      fields: [
        { name: 'Application', value: `**${data.appName}**`, inline: true },
        { name: 'Client Identity', value: data.clientName ? `**${data.clientName}**` : '*Unbound Device*', inline: true },
        { name: 'App Version', value: `\`v${data.version}\``, inline: true },
        { name: 'Key / Identifier', value: `\`${data.keyOrHwid}\``, inline: false },
        { name: 'Origin IP', value: `\`${data.ip || 'Unknown'}\``, inline: true },
        { name: 'Timestamp', value: `<t:${unixTime}:R>`, inline: true },
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
  const unixTime = Math.floor(Date.now() / 1000);

  const fields: DiscordEmbedField[] = [
    { name: 'Application', value: `**${data.appName}**`, inline: true },
    { name: 'Security Violation', value: `🚨 **${data.reason}**`, inline: true },
  ];

  if (data.clientName) {
    fields.push({ name: 'Client Name', value: `**${data.clientName}**`, inline: true });
  }

  if (data.keyOrHwid) {
    fields.push({ name: 'Attempted Key / User', value: `\`${data.keyOrHwid}\``, inline: false });
  }

  if (data.hwid) {
    fields.push({ name: 'Reported Machine SID', value: `\`${data.hwid}\``, inline: false });
  }

  fields.push({ name: 'Origin IP', value: `\`${data.ip || 'Unknown'}\``, inline: true });
  fields.push({ name: 'Blocked At', value: `<t:${unixTime}:R>`, inline: true });

  if (data.clientVersion) {
    fields.push({ name: 'Reported Version', value: `\`v${data.clientVersion}\``, inline: true });
  }

  await notifyDiscordEvent({
    appId: data.appId,
    eventType: 'AUTH_FAIL',
    embed: {
      title: '🚨 Null-Auth Security Gate Alert',
      description: `An unauthorized or invalid authentication attempt was **blocked** by the security gate.`,
      color: DISCORD_COLORS.ALERT,
      fields,
    },
  });
}

/**
 * Notification: Admin Management Action (Pause, Ban, Unban, Extend, Reset HWID, Delete)
 */
export async function notifyAdminAction(data: {
  appName: string;
  appId: string;
  action: string;
  target: string;
  details?: string;
  adminIp?: string;
}): Promise<void> {
  const unixTime = Math.floor(Date.now() / 1000);

  await notifyDiscordEvent({
    appId: data.appId,
    eventType: 'ADMIN_ACTION',
    embed: {
      title: '⚙️ Administrative Security Action',
      description: `An administrative action was executed on **${data.appName}**.`,
      color: DISCORD_COLORS.WARNING,
      fields: [
        { name: 'Application', value: `**${data.appName}**`, inline: true },
        { name: 'Action', value: `\`${data.action}\``, inline: true },
        { name: 'Target Record', value: `\`${data.target}\``, inline: false },
        { name: 'Details', value: data.details || 'Executed via Console', inline: true },
        { name: 'Admin IP', value: `\`${data.adminIp || 'Dashboard Console'}\``, inline: true },
        { name: 'Timestamp', value: `<t:${unixTime}:R>`, inline: true },
      ],
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

  const unixTime = Math.floor(Date.now() / 1000);

  return await sendDiscordWebhook(url, {
    title: '🛰️ Null-Auth Discord Integration Verified',
    description: `Successfully established communication between **Null-Auth Security Cloud** and Discord for **${data.appName}**!`,
    color: DISCORD_COLORS.CYAN,
    fields: [
      { name: 'Application', value: `**${data.appName}**`, inline: true },
      { name: 'App ID', value: `\`${data.appId}\``, inline: true },
      { name: 'Status', value: '🟢 **Operational**', inline: true },
      { name: 'Triggered By Admin IP', value: `\`${data.adminIp || 'Console'}\``, inline: true },
      { name: 'Verified At', value: `<t:${unixTime}:F>`, inline: true },
    ],
  });
}
