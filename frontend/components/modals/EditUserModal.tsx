'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { fetchApi } from '@/lib/api';
import { User, Lock, Clock, Tag, RefreshCw } from 'lucide-react';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any | null;
}

export function EditUserModal({ isOpen, onClose, onSuccess, user }: EditUserModalProps) {
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [boundHwid, setBoundHwid] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [clientName, setClientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setNewPassword('');
      setStatus(user.status || 'ACTIVE');
      setBoundHwid(user.boundHwid || '');
      setClientName(user.clientName || user.notes || '');
      if (user.expiresAt) {
        const d = new Date(user.expiresAt);
        setExpiresAt(d.toISOString().slice(0, 16));
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchApi(`/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          username: username.trim(),
          password: newPassword.trim() || undefined,
          status,
          boundHwid: boundHwid.trim(),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          clientName: clientName.trim(),
        }),
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
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit User Account: ${user?.username || ''}`}>
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-500/80 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            New Password (Leave blank to keep existing)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-500/80 transition-colors"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="BANNED">BANNED</option>
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-500/80 transition-colors"
            />
          </div>
        </div>

        {/* Quick Duration Extension Presets */}
        <div>
          <span className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Quick Extend Expiration
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
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
                className="px-2.5 py-1 rounded-[7px] text-xs font-mono font-bold bg-zinc-950 text-zinc-300 border border-zinc-800 hover:border-red-500/60 hover:text-red-400 transition-all"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Bound Machine SID / HWID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={boundHwid}
              onChange={(e) => setBoundHwid(e.target.value)}
              placeholder="Unbound / Machine SID"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-500/80 transition-colors"
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
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
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
