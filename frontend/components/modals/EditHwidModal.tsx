'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { fetchApi } from '@/lib/api';
import {
  Cpu,
  Calendar,
  User,
  Shield,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export interface HwidItem {
  id: string;
  hwidHash: string;
  appId: string;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'BANNED';
  effectiveStatus?: string;
  expiresAt: string;
  clientName: string | null;
  remainingDays?: number;
  lastAuthAt: string | null;
  application?: {
    id: string;
    appId: string;
    name: string;
    status: string;
  };
}

interface EditHwidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: HwidItem | null;
}

export function EditHwidModal({
  isOpen,
  onClose,
  onSuccess,
  item,
}: EditHwidModalProps) {
  const [hwid, setHwid] = useState('');
  const [clientName, setClientName] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'BANNED'>('ACTIVE');
  const [expiresAt, setExpiresAt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    if (item && isOpen) {
      setHwid(item.hwidHash);
      setClientName(item.clientName || '');
      setStatus(item.status);
      setError(null);

      // Convert ISO to datetime-local string
      try {
        const d = new Date(item.expiresAt);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setExpiresAt(formatted);
      } catch {
        setExpiresAt('');
      }
    }
  }, [item, isOpen]);

  const addDaysToExpiry = (days: number) => {
    const base = expiresAt ? new Date(expiresAt) : new Date();
    base.setDate(base.getDate() + days);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setExpiresAt(`${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`);
  };

  const handleCopyHash = () => {
    if (!item?.hwidHash) return;
    navigator.clipboard.writeText(item.hwidHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setError(null);
    setIsLoading(true);

    try {
      const payload: any = {
        hwid: hwid.trim() !== item.hwidHash ? hwid.trim() : undefined,
        clientName: clientName.trim() || null,
        status,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      };

      const res = await fetchApi(`/admin/hwid/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to update HWID record.');
      }
    } catch (err: any) {
      setError('An error occurred while saving HWID modifications.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit HWID Authorization" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-[10px] text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Machine SID / HWID Identifier */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> Machine SID / HWID Hash
            </span>
            <button
              type="button"
              onClick={handleCopyHash}
              className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedHash ? 'Copied' : 'Copy Hash'}
            </button>
          </label>
          <input
            type="text"
            value={hwid}
            onChange={(e) => setHwid(e.target.value)}
            required
            className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm font-mono text-purple-300 focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="Windows SID or HWID string"
          />
          <span className="block text-[11px] text-zinc-500 font-mono mt-1">
            Raw SID values (e.g. S-1-5-21-...) will be automatically SHA256 hashed on save.
          </span>
        </div>

        {/* Client Name */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-zinc-400" /> Client Name / Device Owner
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. Alex / Primary Desktop / Workstation #1"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Status Selector */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-zinc-400" /> Authorization Status
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
            className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm font-mono text-zinc-200 focus:outline-none focus:border-purple-500 transition-colors"
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

        <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/80">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            className="gap-2 bg-gradient-to-r from-purple-950 via-purple-900 to-purple-800 hover:from-purple-900 hover:to-purple-700 text-white border border-purple-500/40"
          >
            <Sparkles className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
