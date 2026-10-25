'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { fetchApi } from '@/lib/api';
import {
  Cpu,
  ShieldCheck,
  Copy,
  Check,
  Download,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Terminal,
} from 'lucide-react';

interface AppOption {
  id: string;
  appId: string;
  name: string;
  type: string;
}

interface AuthorizedHwid {
  id: string;
  hwid: string;
  hwidHash: string;
  expiresAt: string;
  clientName?: string;
}

interface AddHwidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (targetAppId: string) => void;
  apps: any[];
  defaultAppId?: string;
}

export function AddHwidModal({
  isOpen,
  onClose,
  onSuccess,
  apps,
  defaultAppId,
}: AddHwidModalProps) {
  const hwidApps = apps.filter((a) => a.type === 'HWID');
  const [appId, setAppId] = useState(defaultAppId || '');
  const [hwid, setHwid] = useState('');
  const [days, setDays] = useState(30);
  const [clientName, setClientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authorized Result State
  const [authorizedItem, setAuthorizedItem] = useState<AuthorizedHwid | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAuthorizedItem(null);
      setError(null);
      setCopied(false);
      setHwid('');
      setClientName('');
      setDays(30);

      if (defaultAppId && hwidApps.some((a) => a.id === defaultAppId)) {
        setAppId(defaultAppId);
      } else if (hwidApps.length > 0 && !appId) {
        setAppId(hwidApps[0].id);
      }
    }
  }, [isOpen, apps, defaultAppId]);

  const selectedAppId = appId || (hwidApps.length > 0 ? hwidApps[0].id : '');

  // Dynamic Expiration Preview Text
  const expirationPreview = useMemo(() => {
    if (days >= 9999) return 'Lifetime Access (Never Expires)';
    const d = new Date();
    d.setDate(d.getDate() + Number(days));
    return `Expires on ${d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })} (${days} days)`;
  }, [days]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const targetAppId = selectedAppId;

    if (!targetAppId) {
      setError('Please select an authorized HWID-mode application.');
      setIsLoading(false);
      return;
    }

    const trimmedHwid = hwid.trim();
    if (!trimmedHwid) {
      setError('Please provide a valid Hardware ID (HWID).');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetchApi('/admin/hwid', {
        method: 'POST',
        body: JSON.stringify({
          appId: targetAppId,
          hwid: trimmedHwid,
          days: Number(days),
          clientName: clientName.trim() || undefined,
        }),
      });

      if (res.success && res.data) {
        setAuthorizedItem({
          id: res.data.id || Math.random().toString(),
          hwid: trimmedHwid,
          hwidHash: res.data.hwidHash || trimmedHwid,
          expiresAt: res.data.expiresAt || new Date().toISOString(),
          clientName: clientName.trim() || undefined,
        });
        onSuccess(targetAppId);
      } else {
        setError(res.message || 'Failed to authorize machine HWID.');
      }
    } catch (err: any) {
      setError('An error occurred during HWID authorization.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyHwid = () => {
    if (!authorizedItem) return;
    navigator.clipboard.writeText(authorizedItem.hwid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxtFile = () => {
    if (!authorizedItem) return;
    const content = `NullAuth Machine HWID Authorization\n\nHWID: ${authorizedItem.hwid}\nExpires: ${new Date(
      authorizedItem.expiresAt
    ).toLocaleDateString()}\nClient: ${authorizedItem.clientName || 'N/A'}\nAuthorized At: ${new Date().toISOString()}`;
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `NullAuth_HWID_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={authorizedItem ? 'HWID Authorized' : 'Authorize Machine HWID'}
      maxWidth={authorizedItem ? 'lg' : 'md'}
    >
      {!authorizedItem ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-[10px] bg-red-950/60 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Application Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Target Application *
            </label>
            <select
              value={selectedAppId}
              onChange={(e) => setAppId(e.target.value)}
              required
              className="w-full modal-input rounded-[10px] px-3.5 py-2.5 text-sm font-semibold text-zinc-100"
            >
              {hwidApps.length === 0 && <option value="">No HWID-based applications found</option>}
              {hwidApps.map((app) => (
                <option key={app.id} value={app.id} className="bg-zinc-900 text-zinc-100">
                  {app.name} ({app.appId})
                </option>
              ))}
            </select>
            {hwidApps.length === 0 && (
              <p className="text-xs text-purple-400 mt-1.5">
                Please create a 'Hardware ID' (HWID) application first in the Applications tab.
              </p>
            )}
          </div>

          {/* HWID Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                Hardware Identifier (HWID) *
              </label>
              <span className="text-[10px] font-mono text-zinc-400">SHA-256 Hash or Raw String</span>
            </div>
            <textarea
              rows={2}
              value={hwid}
              onChange={(e) => setHwid(e.target.value)}
              required
              placeholder="e.g. 43f3ef9ce386ba5ca3a97714c92346a2a4da153e0c1fbbc23e4d75234cdaff4b"
              className="w-full modal-input rounded-[10px] px-3.5 py-2.5 text-xs font-mono text-purple-300 placeholder-zinc-500 resize-none"
            />
            <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
              <Terminal className="w-3 h-3 text-purple-400" />
              Machine SHA-256 identifier generated by official C# / C++ / Python NullAuth SDK.
            </p>
          </div>

          {/* Duration (Days) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Duration (Days) *
              </label>
              <span className="text-xs font-mono font-bold text-purple-300">
                {expirationPreview}
              </span>
            </div>
            <input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10) || 1)}
              required
              className="w-full modal-input rounded-[10px] px-3.5 py-2.5 text-sm font-mono font-bold text-purple-300"
            />
          </div>

          {/* Quick Duration Presets */}
          <div>
            <span className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Quick Duration Presets
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: '1 Day', value: 1 },
                { label: '7 Days', value: 7 },
                { label: '30 Days', value: 30 },
                { label: '90 Days', value: 90 },
                { label: '365 Days', value: 365 },
                { label: 'Lifetime', value: 9999 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setDays(preset.value)}
                  className={`btn-preset ${days === preset.value ? 'btn-preset-active-purple' : ''}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Client Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Client Name (Optional)
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. John Doe / Office Workstation #12"
              className="w-full modal-input rounded-[10px] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!selectedAppId || !hwid.trim()}
              className="gap-2 bg-gradient-to-r from-purple-700 via-purple-600 to-purple-500 hover:from-purple-600 hover:to-purple-400 text-white border border-purple-400/40 shadow-md shadow-purple-950/40"
            >
              <ShieldCheck className="w-4 h-4" />
              Authorize Machine HWID
            </Button>
          </div>
        </form>
      ) : (
        /* Authorized Output / Confirmation View */
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-bold">
                Successfully Authorized Machine Identifier!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={copyHwid} className="gap-1.5 text-xs font-bold">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy HWID
              </Button>
              <Button size="sm" onClick={downloadTxtFile} className="gap-1.5 text-xs font-bold">
                <Download className="w-3.5 h-3.5" /> Download TXT
              </Button>
            </div>
          </div>

          {/* Authorized HWID Detail Box */}
          <div className="p-4 rounded-[12px] bg-zinc-950/80 border border-white/10 space-y-3">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Authorized Hardware ID
              </span>
              <div className="flex items-center justify-between p-2.5 rounded-[8px] bg-white/[0.04] border border-white/10 font-mono text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-purple-300 font-bold truncate select-all">{authorizedItem.hwid}</span>
                </div>
                <button
                  onClick={copyHwid}
                  className="btn-action ml-2 shrink-0"
                  title="Copy HWID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-[8px] bg-white/[0.04] border border-white/10">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                  Expiration
                </span>
                <span className="text-zinc-200 font-mono font-bold">
                  {days >= 9999 ? 'Lifetime Access' : new Date(authorizedItem.expiresAt).toLocaleDateString()}
                </span>
              </div>
              <div className="p-2.5 rounded-[8px] bg-white/[0.04] border border-white/10">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                  Client Reference
                </span>
                <span className="text-zinc-200 font-medium truncate block">
                  {authorizedItem.clientName || 'None assigned'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-white/10">
            <Button
              variant="secondary"
              onClick={() => {
                setAuthorizedItem(null);
                onClose();
              }}
            >
              Done & Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
