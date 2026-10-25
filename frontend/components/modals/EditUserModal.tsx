'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { fetchApi } from '@/lib/api';
import {
  User,
  Key,
  Lock,
  Clock,
  Tag,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
}

export function EditUserModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: EditUserModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [expiresAt, setExpiresAt] = useState('');
  const [boundHwid, setBoundHwid] = useState('');
  const [clientName, setClientName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [copiedCurrent, setCopiedCurrent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      setUsername(user.username || '');
      setPassword('');
      setStatus(user.status || 'ACTIVE');
      setBoundHwid(user.boundHwid || '');
      setClientName(user.clientName || '');
      setError(null);
      setShowPassword(false);
      setShowCurrentPassword(false);
      setCopiedCurrent(false);

      if (user.expiresAt) {
        const d = new Date(user.expiresAt);
        const pad = (n: number) => String(n).padStart(2, '0');
        const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
          d.getHours()
        )}:${pad(d.getMinutes())}`;
        setExpiresAt(localIso);
      } else {
        setExpiresAt('');
      }
    }
  }, [user, isOpen]);

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    if (password.trim() && password.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const payload: any = {
        username: username.trim(),
        status,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        boundHwid: boundHwid.trim() || null,
        clientName: clientName.trim() || null,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      const res = await fetchApi(`/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to update user account');
      }
    } catch (err: any) {
      setError('An error occurred while updating user account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User Account" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/70 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full modal-input rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100"
            />
          </div>
        </div>

        {user?.plainPassword && (
          <div className="p-3 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-zinc-400 font-bold uppercase text-[10px]">Current Password:</span>
              <span className="font-mono font-bold text-amber-300">
                {showCurrentPassword ? user.plainPassword : '••••••••'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="btn-action text-xs"
                title={showCurrentPassword ? 'Hide current password' : 'Show current password'}
              >
                {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(user.plainPassword);
                  setCopiedCurrent(true);
                  setTimeout(() => setCopiedCurrent(false), 2000);
                }}
                className="btn-action text-xs"
                title="Copy current password"
              >
                {copiedCurrent ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurrent ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              New Password (Leave blank to keep existing)
            </label>
            <button
              type="button"
              onClick={generateRandomPassword}
              className="btn-action btn-action-amber text-[11px]"
            >
              <Sparkles className="w-3 h-3 text-amber-400" /> Generate Password
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full modal-input rounded-lg pl-9 pr-10 py-2 text-sm text-zinc-100 placeholder-zinc-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-200 transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Account Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full modal-input rounded-lg px-3 py-2 text-sm text-zinc-100"
            >
              <option value="ACTIVE" className="bg-zinc-900 text-zinc-100">ACTIVE</option>
              <option value="PAUSED" className="bg-zinc-900 text-zinc-100">PAUSED</option>
              <option value="EXPIRED" className="bg-zinc-900 text-zinc-100">EXPIRED</option>
              <option value="BANNED" className="bg-zinc-900 text-zinc-100">BANNED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Expiration Date & Time
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full modal-input rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono"
            />
          </div>
        </div>

        {/* Quick Duration Extension Presets */}
        <div>
          <span className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Quick Extend Expiration
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: '+1 Day', days: 1 },
              { label: '+7 Days', days: 7 },
              { label: '+30 Days', days: 30 },
              { label: '+90 Days', days: 90 },
              { label: '+1 Year', days: 365 },
              { label: 'Lifetime', days: 9999 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  const now = new Date();
                  const current = expiresAt ? new Date(expiresAt) : now;
                  const base = current < now ? now : current;
                  base.setDate(base.getDate() + preset.days);
                  setExpiresAt(base.toISOString().slice(0, 16));
                }}
                className="btn-preset text-[11px] py-1 px-2.5"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Bound Hardware ID (HWID)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={boundHwid}
              onChange={(e) => setBoundHwid(e.target.value)}
              placeholder="Unbound / Hardware ID"
              className="flex-1 modal-input rounded-lg px-3 py-2 text-sm font-mono text-zinc-100 placeholder-zinc-500"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setBoundHwid('')}
              title="Unbind HWID"
              className="gap-1 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Unbind
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Client Name / Notes
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Optional customer reference"
            className="w-full modal-input rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
