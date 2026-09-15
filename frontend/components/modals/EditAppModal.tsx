'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { fetchApi } from '@/lib/api';
import {
  AppWindow,
  Tag,
  Download,
  Shield,
  Key,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Bell,
} from 'lucide-react';

export interface AppItem {
  id: string;
  appId?: string;
  name: string;
  secret?: string;
  type?: 'LICENSE' | 'HWID' | string;
  status?: 'ACTIVE' | 'PAUSED' | string;
  version?: string;
  downloadUrl?: string | null;
  freeTrialEnabled?: boolean;
  freeTrialKey?: string | null;
  discordWebhookUrl?: string | null;
  createdAt?: string;
  activeUsers?: number;
  expiredUsers?: number;
  totalUsers?: number;
  lastActivity?: string | null;
  [key: string]: any;
}

interface EditAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  app: any;
}

export function EditAppModal({
  isOpen,
  onClose,
  onSuccess,
  app,
}: EditAppModalProps) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE');
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(false);
  const [freeTrialKey, setFreeTrialKey] = useState('');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (app && isOpen) {
      setName(app.name);
      setVersion(app.version || '1.0.0');
      setDownloadUrl(app.downloadUrl || '');
      setStatus(app.status);
      setFreeTrialEnabled(app.freeTrialEnabled);
      setFreeTrialKey(app.freeTrialKey || '');
      setDiscordWebhookUrl(app.discordWebhookUrl || '');
      setSecret(app.secret);
      setShowSecret(false);
      setError(null);
    }
  }, [app, isOpen]);

  const handleCopySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleRegenerateSecret = async () => {
    if (!app) return;
    if (!confirm('Are you sure you want to regenerate this Secret API Key? Existing clients using the old secret will be rejected.')) {
      return;
    }

    setIsRegenerating(true);
    try {
      const res = await fetchApi(`/admin/apps/${app.id}/regenerate-secret`, {
        method: 'POST',
      });
      if (res.success && res.data?.secret) {
        setSecret(res.data.secret);
        onSuccess();
      }
    } catch (err) {
      alert('Failed to regenerate secret API key');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetchApi(`/admin/apps/${app.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          version: version.trim(),
          downloadUrl: downloadUrl.trim() || null,
          status,
          freeTrialEnabled,
          freeTrialKey: freeTrialKey.trim() || null,
          discordWebhookUrl: discordWebhookUrl.trim() || null,
        }),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to update application.');
      }
    } catch (err: any) {
      setError('An error occurred while saving application changes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Application Configurations" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-[10px] text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Application Name & Mode Badge */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Application Name</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              Mode: {app?.type}
            </span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>

        {/* Version & Update Download URL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-zinc-400" /> Enforced Version
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm font-mono text-zinc-200 focus:outline-none focus:border-red-500 transition-colors"
              placeholder="1.0.0"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-zinc-400" /> Update Download URL
            </label>
            <input
              type="url"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-red-500 transition-colors"
              placeholder="https://example.com/download/update.exe"
            />
          </div>
        </div>

        {/* Application Status Toggle */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-zinc-400" /> Operational Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStatus('ACTIVE')}
              className={`py-2 px-3 rounded-[8px] text-xs font-bold border transition-all text-center ${
                status === 'ACTIVE'
                  ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              🟢 Active (Accepting Auth)
            </button>
            <button
              type="button"
              onClick={() => setStatus('PAUSED')}
              className={`py-2 px-3 rounded-[8px] text-xs font-bold border transition-all text-center ${
                status === 'PAUSED'
                  ? 'border-amber-500/50 bg-amber-950/40 text-amber-400 ring-1 ring-amber-500/30'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              ⏸️ Paused (Maintenance Mode)
            </button>
          </div>
        </div>

        {/* Free Trial Settings */}
        <div className="p-3.5 rounded-[10px] bg-zinc-950/80 border border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-zinc-200 block">Free Trial Mode</span>
              <span className="text-[11px] text-zinc-500">
                {app?.type === 'LICENSE'
                  ? 'Permits instant login via master trial key'
                  : 'Permits instant login for all devices without whitelisting'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFreeTrialEnabled(!freeTrialEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                freeTrialEnabled ? 'bg-red-600' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  freeTrialEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {freeTrialEnabled && app?.type === 'LICENSE' && (
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                Dynamic Master Free Trial Key:
              </label>
              <input
                type="text"
                value={freeTrialKey}
                onChange={(e) => setFreeTrialKey(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-[8px] px-3 py-1.5 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
                placeholder="FREE-TRIAL-XXXX-XXXX"
              />
            </div>
          )}
        </div>

        {/* Per-Application Discord Webhook Override */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-indigo-400" /> App Discord Webhook (Optional Override)
          </label>
          <input
            type="url"
            value={discordWebhookUrl}
            onChange={(e) => setDiscordWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/... (leave empty to use global setting)"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-xs font-mono text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Secret API Key Management */}
        <div className="p-3.5 rounded-[10px] bg-zinc-950/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-zinc-400" /> Secret API Key
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopySecret}
                className="px-2 py-1 rounded-[6px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[11px] font-mono flex items-center gap-1 border border-zinc-800 transition-all"
              >
                {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedSecret ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={handleRegenerateSecret}
                disabled={isRegenerating}
                className="px-2 py-1 rounded-[6px] bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/60 text-[11px] font-mono flex items-center gap-1 transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                Regen
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={secret}
              readOnly
              className="w-full bg-zinc-900 border border-zinc-800 rounded-[8px] px-3 py-2 text-xs font-mono text-zinc-300 pr-10 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/80">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} className="gap-2">
            <Sparkles className="w-4 h-4" /> Save App Settings
          </Button>
        </div>
      </form>
    </Modal>
  );
}
