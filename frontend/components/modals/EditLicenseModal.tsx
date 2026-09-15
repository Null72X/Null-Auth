'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { fetchApi } from '@/lib/api';
import {
  Key,
  Calendar,
  User,
  Shield,
  RotateCcw,
  Check,
  Sparkles,
  AlertCircle,
  Copy,
} from 'lucide-react';

export interface LicenseItem {
  id: string;
  key: string;
  appId?: string;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'BANNED' | string;
  effectiveStatus?: string;
  boundHwid?: string | null;
  expiresAt: string;
  clientName?: string | null;
  remainingDays?: number;
  firstActivatedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  application?: any;
  [key: string]: any;
}

interface EditLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  license: any;
}

export function EditLicenseModal({
  isOpen,
  onClose,
  onSuccess,
  license,
}: EditLicenseModalProps) {
  const [key, setKey] = useState('');
  const [clientName, setClientName] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'BANNED'>('ACTIVE');
  const [expiresAt, setExpiresAt] = useState('');
  const [boundHwid, setBoundHwid] = useState('');
  const [isHwidReset, setIsHwidReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (license && isOpen) {
      setKey(license.key);
      setClientName(license.clientName || '');
      setStatus(license.status);
      setIsHwidReset(false);
      setBoundHwid(license.boundHwid || '');
      setError(null);

      // Convert ISO date to datetime-local input format: YYYY-MM-DDTHH:mm
      try {
        const d = new Date(license.expiresAt);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setExpiresAt(formatted);
      } catch {
        setExpiresAt('');
      }
    }
  }, [license, isOpen]);

  const addDaysToExpiry = (days: number) => {
    const base = expiresAt ? new Date(expiresAt) : new Date();
    base.setDate(base.getDate() + days);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setExpiresAt(`${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`);
  };

  const handleResetHwid = () => {
    setBoundHwid('');
    setIsHwidReset(true);
  };

  const handleCopyKey = () => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!license) return;

    setError(null);
    setIsLoading(true);

    try {
      const payload: any = {
        key: key.trim(),
        clientName: clientName.trim() || null,
        status,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        boundHwid: isHwidReset ? null : (boundHwid.trim() || undefined),
      };

      const res = await fetchApi(`/admin/licenses/${license.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to update license.');
      }
    } catch (err: any) {
      setError('An error occurred while saving license modifications.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit License Details" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-[10px] text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* License Key & Copy */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>License Key</span>
            <button
              type="button"
              onClick={handleCopyKey}
              className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedKey ? 'Copied' : 'Copy Key'}
            </button>
          </label>
          <div className="relative">
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm font-mono text-red-400 font-bold focus:outline-none focus:border-red-500 transition-colors"
              placeholder="NULL-XXXX-XXXX-XXXX"
            />
          </div>
        </div>

        {/* Client Name */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-zinc-400" /> Client Name / Customer
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. Alex / DiscordUser#1234 / Customer Name"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>

        {/* License Status Selector */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-zinc-400" /> License Status
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'ACTIVE', label: 'Active', color: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-400' },
              { id: 'PAUSED', label: 'Paused', color: 'border-amber-500/50 bg-amber-950/30 text-amber-400' },
              { id: 'EXPIRED', label: 'Expired', color: 'border-zinc-700 bg-zinc-900 text-zinc-400' },
              { id: 'BANNED', label: 'Banned', color: 'border-red-500/50 bg-red-950/30 text-red-400' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatus(s.id as any)}
                className={`py-2 px-2.5 rounded-[8px] text-xs font-bold border transition-all text-center ${
                  status === s.id
                    ? `${s.color} ring-1 ring-white/20 font-extrabold shadow-sm`
                    : 'border-zinc-800/80 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Expiration Date & Time */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Expiration Date & Time
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            required
            className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm font-mono text-zinc-200 focus:outline-none focus:border-red-500 transition-colors"
          />
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[11px] text-zinc-500 font-mono mr-1">Extend:</span>
            {[
              { label: '+1 Day', days: 1 },
              { label: '+7 Days', days: 7 },
              { label: '+30 Days', days: 30 },
              { label: '+90 Days', days: 90 },
              { label: '+1 Year', days: 365 },
              { label: 'Lifetime', days: 3650 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => addDaysToExpiry(preset.days)}
                className="px-2.5 py-1 rounded-[6px] text-[11px] font-mono font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white transition-all"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bound Hardware Identifier (HWID) */}
        <div className="p-3.5 rounded-[10px] bg-zinc-950/80 border border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              Machine SID / Bound HWID
            </span>
            {boundHwid && (
              <button
                type="button"
                onClick={handleResetHwid}
                className="px-2.5 py-1 rounded-[6px] bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 text-[11px] font-bold flex items-center gap-1 transition-all"
              >
                <RotateCcw className="w-3 h-3" /> Reset / Unbind HWID
              </button>
            )}
          </div>

          {boundHwid ? (
            <div className="p-2 rounded-[8px] bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-300 break-all select-all">
              {boundHwid}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-zinc-500 italic py-1">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              <span>{isHwidReset ? 'HWID unbind staged — device lock will be cleared on save.' : 'Not bound to any hardware yet. Automatically locks to the client machine on first login.'}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/80">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} className="gap-2">
            <Sparkles className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
