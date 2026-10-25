'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { fetchApi } from '@/lib/api';
import {
  User,
  Lock,
  Clock,
  Tag,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Key,
} from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (targetAppId: string) => void;
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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success view state
  const [createdAccount, setCreatedAccount] = useState<{
    id: string;
    username: string;
    password: string;
    expiresAt: string;
    appName: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCreatedAccount(null);
      setUsername('');
      setPassword('');
      setDays(30);
      setClientName('');
      setShowPassword(false);
      setCopiedField(null);

      if (defaultAppId && userApps.some((a) => a.id === defaultAppId)) {
        setAppId(defaultAppId);
      } else if (userApps.length > 0 && !appId) {
        setAppId(userApps[0].id);
      }
    }
  }, [isOpen, apps, defaultAppId]);

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    setShowPassword(true);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyFullCredentials = () => {
    if (!createdAccount) return;
    const text = `Username: ${createdAccount.username}\nPassword: ${createdAccount.password}\nExpires: ${new Date(
      createdAccount.expiresAt
    ).toLocaleDateString()}\nApp: ${createdAccount.appName}`;
    navigator.clipboard.writeText(text);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetAppId = appId || (userApps.length > 0 ? userApps[0].id : '');
    if (!targetAppId) {
      setError('Please select a User-Auth application first.');
      return;
    }

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    if (!password.trim() || password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetchApi('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          appId: targetAppId,
          username: username.trim(),
          password: password.trim(),
          days: Number(days),
          clientName: clientName.trim() || undefined,
        }),
      });

      if (res.success && res.data) {
        const selectedAppObj = userApps.find((a) => a.id === targetAppId);
        setCreatedAccount({
          id: res.data.id || Math.random().toString(),
          username: username.trim(),
          password: password.trim(),
          expiresAt: res.data.expiresAt || new Date().toISOString(),
          appName: selectedAppObj?.name || 'Application',
        });
        onSuccess(targetAppId);
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
      {createdAccount ? (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-center space-y-1.5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">User Account Created Successfully!</h3>
            <p className="text-xs text-zinc-400">
              Credentials are saved and ready for client authorization in <b>{createdAccount.appName}</b>.
            </p>
          </div>

          <div className="bg-zinc-950/80 p-4 rounded-xl border border-white/10 space-y-3 text-xs">
            {/* Username Row */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-zinc-400 text-[11px] uppercase font-bold">Username:</span>
                <span className="font-mono font-bold text-white text-sm select-all">{createdAccount.username}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(createdAccount.username, 'user')}
                className="btn-action"
                title="Copy Username"
              >
                {copiedField === 'user' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedField === 'user' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Password Row */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-zinc-400 text-[11px] uppercase font-bold">Password:</span>
                <span className="font-mono font-bold text-amber-400 text-sm select-all">{createdAccount.password}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(createdAccount.password, 'pass')}
                className="btn-action"
                title="Copy Password"
              >
                {copiedField === 'pass' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedField === 'pass' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Expiry Row */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-zinc-400 text-[11px] uppercase font-bold">Expires:</span>
                <span className="font-mono text-zinc-300">
                  {days >= 9999 ? 'Lifetime Access' : new Date(createdAccount.expiresAt).toLocaleDateString()}
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-400">
                {days >= 9999 ? 'No Expiry' : `${days} Days`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={copyFullCredentials}
              className="gap-1.5 text-xs"
            >
              {copiedField === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedField === 'all' ? 'Copied Everything!' : 'Copy Credentials'}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setCreatedAccount(null);
                  setUsername('');
                  setPassword('');
                  setShowPassword(false);
                }}
              >
                Create Another
              </Button>
              <Button type="button" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : (
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
              className="w-full modal-input rounded-lg px-3 py-2.5 text-sm text-zinc-100"
            >
              <option value="" disabled className="bg-zinc-900 text-zinc-400">Select User-Auth Application</option>
              {userApps.map((app) => (
                <option key={app.id} value={app.id} className="bg-zinc-900 text-zinc-100">
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
                className="w-full modal-input rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Password
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
                required
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
                Duration (Days)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Clock className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  required
                  className="w-full modal-input rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 font-mono font-bold text-amber-400"
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
                  className="w-full modal-input rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
                />
              </div>
            </div>
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
                  className={`btn-preset ${days === preset.value ? 'active' : ''}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} disabled={userApps.length === 0}>
              Create User Account
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
