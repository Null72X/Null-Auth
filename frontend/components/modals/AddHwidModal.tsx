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
  Layers,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface AppOption {
  id: string;
  appId: string;
  name: string;
  type: string;
}

interface AuthorizedHwidItem {
  id: string;
  hwid: string;
  hwidHash: string;
  expiresAt: string;
  notes?: string;
}

interface AddHwidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (targetAppId?: string) => void;
  apps: AppOption[];
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
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [hwid, setHwid] = useState('');
  const [hwidBatchText, setHwidBatchText] = useState('');
  const [days, setDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success Batch Results View State
  const [authorizedBatch, setAuthorizedBatch] = useState<AuthorizedHwidItem[] | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAuthorizedBatch(null);
      setError(null);
      setCopiedAll(false);
      setCopiedItem(null);
      if (defaultAppId && hwidApps.some((a) => a.id === defaultAppId)) {
        setAppId(defaultAppId);
      } else if (hwidApps.length > 0 && !appId) {
        setAppId(hwidApps[0].id);
      }
    }
  }, [isOpen, apps, defaultAppId]);

  const selectedAppId = appId || (hwidApps.length > 0 ? hwidApps[0].id : '');

  // Calculate batch count
  const batchCount = useMemo(() => {
    return hwidBatchText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0).length;
  }, [hwidBatchText]);

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
      setError('Please create or select an HWID-access application first.');
      setIsLoading(false);
      return;
    }

    const hwidList = isBatchMode
      ? hwidBatchText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [hwid.trim()].filter(Boolean);

    if (hwidList.length === 0) {
      setError('Please enter at least one valid Machine SID / HWID.');
      setIsLoading(false);
      return;
    }

    try {
      const results: AuthorizedHwidItem[] = [];
      const failures: string[] = [];

      for (const h of hwidList) {
        try {
          const res = await fetchApi('/admin/hwid', {
            method: 'POST',
            body: JSON.stringify({
              appId: targetAppId,
              hwid: h,
              days: Number(days),
              notes: notes.trim() || undefined,
            }),
          });

          if (res.success && res.data) {
            results.push({
              id: res.data.id || Math.random().toString(),
              hwid: h,
              hwidHash: res.data.hwidHash || h,
              expiresAt: res.data.expiresAt || new Date().toISOString(),
              notes: notes.trim() || undefined,
            });
          } else {
            failures.push(`"${h.slice(0, 20)}": ${res.message || 'Failed'}`);
          }
        } catch (err: any) {
          failures.push(`"${h.slice(0, 20)}": Connection error`);
        }
      }

      if (results.length > 0) {
        setAuthorizedBatch(results);
        onSuccess(targetAppId);
        if (failures.length > 0) {
          setError(`Authorized ${results.length} machine(s), but ${failures.length} failed (possible duplicates).`);
        }
      } else {
        setError(failures.join(', ') || 'Failed to authorize machine HWID(s).');
      }
    } catch (err: any) {
      setError('An error occurred during HWID authorization.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyIndividualHwid = (hwidString: string) => {
    navigator.clipboard.writeText(hwidString);
    setCopiedItem(hwidString);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const copyAllHwids = () => {
    if (!authorizedBatch) return;
    const allText = authorizedBatch.map((b) => b.hwid).join('\n');
    navigator.clipboard.writeText(allText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const downloadTxtFile = () => {
    if (!authorizedBatch) return;
    const allText = authorizedBatch
      .map(
        (b) =>
          `HWID: ${b.hwid}\nHash: ${b.hwidHash}\nExpires: ${b.expiresAt}\nNotes: ${b.notes || 'None'}\n---`
      )
      .join('\n');
    const element = document.createElement('a');
    const file = new Blob([allText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `NullAuth_Authorized_HWIDs_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const resetForm = () => {
    setAuthorizedBatch(null);
    setHwid('');
    setHwidBatchText('');
    setNotes('');
    setDays(30);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={authorizedBatch ? 'HWID Machines Authorized' : 'Advanced HWID Authorizer'}
      maxWidth={authorizedBatch ? 'lg' : 'md'}
    >
      {!authorizedBatch ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-[10px] bg-red-950/60 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 p-1 rounded-[10px] bg-zinc-950 border border-zinc-800/90 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setIsBatchMode(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-[8px] transition-all ${
                !isBatchMode
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              Single Machine SID
            </button>
            <button
              type="button"
              onClick={() => setIsBatchMode(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-[8px] transition-all ${
                isBatchMode
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Batch Multi-Machine
            </button>
          </div>

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

          {/* HWID Input (Single vs Batch) */}
          {!isBatchMode ? (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Machine / Windows User SID / HWID String *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={hwid}
                  onChange={(e) => setHwid(e.target.value)}
                  required={!isBatchMode}
                  placeholder="e.g. S-1-5-21-382946193-84729104-..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] pl-3.5 pr-10 py-2.5 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
                <Cpu className="w-4 h-4 text-zinc-600 absolute right-3.5 top-3 pointer-events-none" />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Enter raw Windows SID or client machine hash. Automatically stored for instant authentication.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Paste Multiple Machine SIDs / HWIDs *
                </label>
                <span className="text-[11px] font-mono text-purple-400 font-bold bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
                  {batchCount} {batchCount === 1 ? 'HWID' : 'HWIDs'} detected
                </span>
              </div>
              <textarea
                value={hwidBatchText}
                onChange={(e) => setHwidBatchText(e.target.value)}
                required={isBatchMode}
                rows={4}
                placeholder={`S-1-5-21-382946193-84729104-...\nS-1-5-21-998234120-11234901-...\nS-1-5-21-482910394-55928103-...`}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] p-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 leading-relaxed"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Enter one SID / HWID per line or comma-separated. All entries will be authorized in batch.
              </p>
            </div>
          )}

          {/* Duration & Expiration Preview Row */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Duration (Days) *
              </label>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                <Clock className="w-3 h-3 text-emerald-400" />
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

          {/* Admin Notes / Customer Tag */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Customer / Device Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Authorized tester / Workstation Office #12"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!selectedAppId || (!isBatchMode ? !hwid.trim() : batchCount === 0)}
              className="gap-2 bg-gradient-to-r from-purple-950 via-purple-900 to-purple-800 hover:from-purple-900 hover:to-purple-700 text-white border border-purple-500/40 shadow-md shadow-purple-950/40"
            >
              <ShieldCheck className="w-4 h-4" />
              {isBatchMode
                ? `Authorize ${batchCount || 0} Machine(s)`
                : 'Authorize Machine HWID'}
            </Button>
          </div>
        </form>
      ) : (
        /* Batch Output / Success View */
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-bold">
                Successfully Authorized {authorizedBatch.length} Machine Identifier(s)!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={copyAllHwids} className="gap-1.5 text-xs font-bold">
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy All HWIDs
              </Button>
              <Button size="sm" onClick={downloadTxtFile} className="gap-1.5 text-xs font-bold">
                <Download className="w-3.5 h-3.5" /> Download TXT
              </Button>
            </div>
          </div>

          {/* Authorized HWID List Box */}
          <div className="p-4 rounded-[12px] bg-zinc-950 border border-zinc-800 space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar">
            {authorizedBatch.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-2.5 rounded-[8px] bg-zinc-900 border border-zinc-800/80 font-mono text-xs hover:border-purple-500/40 transition-all gap-3"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Cpu className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="text-purple-300 font-bold truncate text-xs" title={b.hwid}>
                    {b.hwid}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                    {days >= 9999 ? 'Lifetime' : `${days}d`}
                  </span>
                  <button
                    onClick={() => copyIndividualHwid(b.hwid)}
                    className="p-1.5 rounded-[6px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
                    title="Copy HWID"
                  >
                    {copiedItem === b.hwid ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <Button
              variant="secondary"
              size="sm"
              onClick={resetForm}
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Authorize More
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
