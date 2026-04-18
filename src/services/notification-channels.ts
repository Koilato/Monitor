import { getClerkToken } from '@/services/clerk';
// import { SITE_VARIANT } from '@/config/variant'; // Removed: unused after share feature removal

export type ChannelType = 'telegram' | 'slack' | 'email' | 'discord' | 'webhook';
export type Sensitivity = 'all' | 'high' | 'critical';
export type QuietHoursOverride = 'critical_only' | 'silence_all' | 'batch_on_wake';
export type DigestMode = 'realtime' | 'daily' | 'twice_daily' | 'weekly';

export interface NotificationChannel {
  channelType: ChannelType;
  verified: boolean;
  linkedAt: number;
  chatId?: string;
  email?: string;
  slackChannelName?: string;
  slackTeamName?: string;
  slackConfigurationUrl?: string;
  webhookLabel?: string;
}

export interface AlertRule {
  variant: string;
  enabled: boolean;
  eventTypes: string[];
  sensitivity: Sensitivity;
  channels: ChannelType[];
  quietHoursEnabled?: boolean;
  quietHoursStart?: number;
  quietHoursEnd?: number;
  quietHoursTimezone?: string;
  quietHoursOverride?: QuietHoursOverride;
  digestMode?: DigestMode;
  digestHour?: number;
  digestTimezone?: string;
  aiDigestEnabled?: boolean;
}

export interface ChannelsData {
  channels: NotificationChannel[];
  alertRules: AlertRule[];
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  let token = await getClerkToken();
  if (!token) {
    console.warn('[authFetch] getClerkToken returned null, retrying in 2s...');
    await new Promise((r) => setTimeout(r, 2000));
    token = await getClerkToken();
  }
  if (!token) throw new Error('Not authenticated (Clerk token null after retry)');
  return fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getChannelsData(): Promise<ChannelsData> {
  const res = await authFetch('/api/notification-channels');
  if (!res.ok) throw new Error(`get channels: ${res.status}`);
  return res.json() as Promise<ChannelsData>;
}

// Removed: share/subscription feature — createPairingToken (Telegram Bot pairing) removed
// Removed: share/subscription feature — setEmailChannel (Email notification) removed
// Removed: share/subscription feature — setSlackChannel (Slack notification) removed
// Removed: share/subscription feature — setWebhookChannel (Webhook notification) removed
// Removed: share/subscription feature — startSlackOAuth (Slack OAuth) removed
// Removed: share/subscription feature — startDiscordOAuth (Discord OAuth) removed

export async function deleteChannel(channelType: ChannelType): Promise<void> {
  const res = await authFetch('/api/notification-channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete-channel', channelType }),
  });
  if (!res.ok) throw new Error(`delete channel: ${res.status}`);
}

export async function saveAlertRules(rules: AlertRule): Promise<void> {
  const res = await authFetch('/api/notification-channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set-alert-rules', ...rules }),
  });
  if (!res.ok) throw new Error(`save alert rules: ${res.status}`);
}

export async function setQuietHours(settings: {
  variant: string;
  quietHoursEnabled: boolean;
  quietHoursStart?: number;
  quietHoursEnd?: number;
  quietHoursTimezone?: string;
  quietHoursOverride?: QuietHoursOverride;
}): Promise<void> {
  const res = await authFetch('/api/notification-channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set-quiet-hours', ...settings }),
  });
  if (!res.ok) throw new Error(`set quiet hours: ${res.status}`);
}

export async function setDigestSettings(settings: {
  variant: string;
  digestMode: DigestMode;
  digestHour?: number;
  digestTimezone?: string;
}): Promise<void> {
  const res = await authFetch('/api/notification-channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set-digest-settings', ...settings }),
  });
  if (!res.ok) throw new Error(`set digest settings: ${res.status}`);
}
