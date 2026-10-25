'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { fetchApi } from '@/lib/api';
import {
  Key,
  Copy,
  Check,
  Calendar,
  Shield,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Tag,
} from 'lucide-react';

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

  const [copiedKey, setCopiedKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (license && isOpen) {
      setKey(license.key || '');
      setClientName(license.clientName || '');
      setStatus(license.status || 'ACTIVE');
      setBoundHwid(license.boundHwid || '');
      setIsHwidReset(false);
      setError(null);
      setCopiedKey(false);

      if (license.expiresAt) {
        const d = new Date(license.expiresAt);
        const pad = (n: number) => String(n).padStart(2, '0');
        const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
          d.getHours()
        )}:${pad(d.getMinutes())}`;
        setExpiresAt(localIso);
      } else {
        setExpiresAt('');
      }
    }
  }, [license, isOpen]);

  const handleCopyKey = () => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleResetHwid = () => {
    setBoundHwid('');
    setIsHwidReset(true);
  };

  const addDaysToExpiry = (daysToAdd: number) => {
    const current = expiresAt ? new Date(expiresAt) : new Date();
    const base = current < new Date() ? new Date() : current;
    base.setDate(base.getDate() + daysToAdd);
    const pad = (n: number) => String(n).padStart(2, '0');
    setExpiresAt(
      `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(
        base.getHours()
      )}:${pad(base.getMinutes())}`
    );
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
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">License Key</span>
            <button
              type="button"
              onClick={handleCopyKey}
              className="btn-action text-[11px]"
            >
              {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              className="w-full modal-input rounded-[10px] px-3.5 py-2.5 text-sm font-mono font-bold text-red-400"
            />
          </div>
        </div>

        {/* Client Name */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-zinc-400" /> Client Name / Reference
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. John Doe / discord_user / Order #104"
            className="w-full modal-input rounded-[10px] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500"
          />
        </div>

        {/* Status Selector */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-zinc-400" /> License State
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'ACTIVE', label: 'Active', activeClass: 'border-emerald-500/70 bg-emerald-950/50 text-emerald-300 ring-1 ring-emerald-500/40' },
              { id: 'PAUSED', label: 'Paused', activeClass: 'border-amber-500/70 bg-amber-950/50 text-amber-300 ring-1 ring-amber-500/40' },
              { id: 'EXPIRED', label: 'Expired', activeClass: 'border-white/20 bg-white/10 text-zinc-200 ring-1 ring-white/20' },
              { id: 'BANNED', label: 'Banned', activeClass: 'border-red-500/70 bg-red-950/50 text-red-300 ring-1 ring-red-500/40' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatus(s.id as any)}
                className={`py-2 px-2.5 rounded-[8px] text-xs font-bold border transition-all text-center ${
                  status === s.id
                    ? `${s.activeClass} font-extrabold shadow-sm`
                    : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/25 hover:text-white'
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
            className="w-full modal-input rounded-[10px] px-3.5 py-2.5 text-sm font-mono text-zinc-200"
          />
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[11px] text-zinc-400 font-mono mr-1">Extend:</span>
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
                className="btn-preset text-[11px] py-1 px-2.5"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bound Hardware Identifier (HWID) */}
        <div className="p-3.5 rounded-[10px] bg-zinc-950/80 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              Bound Hardware ID (HWID)
            </span>
            {boundHwid && (
              <button
                type="button"
                onClick={handleResetHwid}
                className="btn-action btn-action-amber text-[11px] font-bold"
              >
                <RotateCcw className="w-3 h-3" /> Reset / Unbind HWID
              </button>
            )}
          </div>

          {boundHwid ? (
            <div className="p-2 rounded-[8px] bg-white/[0.04] border border-white/10 font-mono text-xs text-zinc-300 break-all select-all">
              {boundHwid}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-zinc-400 italic py-1">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              <span>{isHwidReset ? 'HWID unbind staged — device lock will be cleared on save.' : 'Not bound to any hardware yet. Automatically locks to the client machine on first login.'}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
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
