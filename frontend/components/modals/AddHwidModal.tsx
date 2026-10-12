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
  Clock,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface AuthorizedHwidItem {
  id: string;
  hwid: string;
  hwidHash: string;
  expiresAt: string;
  clientName?: string;
}

interface AddHwidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (targetAppId?: string) => void;
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

  // Success Results View State
  const [authorizedItem, setAuthorizedItem] = useState<AuthorizedHwidItem | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAuthorizedItem(null);
      setError(null);
      setCopied(false);
      setClientName('');
      setHwid('');
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
    const allText = `NullAuth HWID Whitelist Authorization\n===================================\nHWID: ${authorizedItem.hwid}\nHash: ${authorizedItem.hwidHash}\nExpires: ${authorizedItem.expiresAt}\nClient: ${authorizedItem.clientName || 'Unassigned'}\nGenerated: ${new Date().toISOString()}`;
    const element = document.createElement('a');
    const file = new Blob([allText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `NullAuth_HWID_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const resetForm = () => {
    setAuthorizedItem(null);
    setHwid('');
    setClientName('');
    setDays(30);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={authorizedItem ? 'HWID Authorized' : 'Authorize Hardware ID'}
      maxWidth="md"
    >
      {!authorizedItem ? (
        <form onSubmit={handleSubmit} className="space-y-5">
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold text-zinc-100 focus:outline-none focus:border-purple-500"
            >
              {hwidApps.length === 0 && <option value="">No HWID-access apps found</option>}
              {hwidApps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name} ({app.appId})
                </option>
              ))}
            </select>
            {hwidApps.length === 0 && (
              <p className="text-xs text-red-400 mt-1.5">
                Please go to Applications and create an 'HWID Whitelist' type app first.
              </p>
            )}
          </div>

          {/* Hardware ID (HWID) Hash Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Hardware ID (HWID) Hash *
            </label>
            <div className="relative">
              <input
                type="text"
                value={hwid}
                onChange={(e) => setHwid(e.target.value)}
                required
                placeholder="e.g. 43f3ef9ce386ba5ca3a97714c92346a2a4da153e0c1fbbc23e4d75234cdaff4b"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] pl-3.5 pr-10 py-2.5 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
              />
              <Cpu className="w-4 h-4 text-zinc-600 absolute right-3.5 top-3 pointer-events-none" />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Enter the client machine SHA-256 HWID (MachineGuid + Volume Serial). Stored for instant authentication.
            </p>
          </div>

          {/* Duration & Expiration Preview Row */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Duration (Days) *
              </label>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{expirationPreview}</span>
              </div>
            </div>
            <input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10) || 1)}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm font-mono font-bold text-purple-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Quick Duration Presets */}
          <div>
            <span className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Quick Duration Presets
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
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
                  className={`px-3 py-1 rounded-[8px] text-xs font-mono font-bold border transition-all ${
                    days === preset.value
                      ? 'bg-purple-950 text-purple-300 border-purple-600 shadow-sm'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!selectedAppId || !hwid.trim()}
              className="gap-2 bg-gradient-to-r from-purple-950 via-purple-900 to-purple-800 hover:from-purple-900 hover:to-purple-700 text-white border border-purple-500/40 shadow-md shadow-purple-950/40"
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
          <div className="p-4 rounded-[12px] bg-zinc-950 border border-zinc-800 space-y-3">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Authorized Hardware ID
              </span>
              <div className="flex items-center justify-between p-2.5 rounded-[8px] bg-zinc-900 border border-zinc-800/80 font-mono text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-purple-300 font-bold truncate text-xs" title={authorizedItem.hwid}>
                    {authorizedItem.hwid}
                  </span>
                </div>
                <button
                  onClick={copyHwid}
                  className="p-1.5 rounded-[6px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800 shrink-0"
                  title="Copy HWID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-900 text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Access Duration</span>
                <span className="font-semibold text-zinc-200">
                  {days >= 9999 ? 'Lifetime Access' : `${days} Days`}
                </span>
              </div>
              {authorizedItem.clientName && (
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Assigned Client</span>
                  <span className="font-semibold text-zinc-200 truncate block">
                    {authorizedItem.clientName}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <Button
              variant="secondary"
              size="sm"
              onClick={resetForm}
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Authorize Another
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                resetForm();
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
