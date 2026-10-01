'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { fetchApi } from '@/lib/api';
import { Users, User, Lock, Clock, Tag } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apps: any[];
  defaultAppId?: string;
}

export function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
  apps,
  defaultAppId,
}: CreateUserModalProps) {
  const userApps = apps.filter((a) => a.type === 'USER_AUTH');
  const [appId, setAppId] = useState(defaultAppId || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [days, setDays] = useState(30);
  const [clientName, setClientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setUsername('');
      setPassword('');
      setClientName('');
      setDays(30);
      if (defaultAppId && userApps.some((a) => a.id === defaultAppId)) {
        setAppId(defaultAppId);
      } else if (userApps.length > 0) {
        setAppId(userApps[0].id);
      }
    }
  }, [isOpen, defaultAppId, apps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId) {
      setError('Please select a target application');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchApi('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          appId,
          username: username.trim(),
          password: password.trim(),
          days: Number(days),
          clientName: clientName.trim() || undefined,
        }),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to create user account');
      }
    } catch (err: any) {
      setError('An error occurred while creating user account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create User Account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/70 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Target Application
          </label>
          <select
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            required
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500/80 transition-colors"
          >
            <option value="" disabled>Select User-Auth Application</option>
            {userApps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name} ({app.appId})
              </option>
            ))}
          </select>
          {userApps.length === 0 && (
            <p className="text-[11px] text-amber-400 mt-1">
              ⚠️ No USER_AUTH applications found. Create a User-Auth app first in Applications tab.
            </p>
          )}
        </div>

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
              placeholder="e.g. john_doe"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••••••"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Duration (Days)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Clock className="w-4 h-4" />
              </div>
              <input
                type="number"
                min="1"
                max="3650"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-500/80 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Client Name / Notes
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Tag className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Optional customer name"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={userApps.length === 0}>
            Create User Account
          </Button>
        </div>
      </form>
    </Modal>
  );
}
