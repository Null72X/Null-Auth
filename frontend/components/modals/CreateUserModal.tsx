'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { fetchApi } from '@/lib/api';
import { Users, User, Lock, Clock, Tag, Eye, EyeOff, Sparkles, Copy, Check, CheckCircle2, Key } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [days, setDays] = useState(30);
  const [clientName, setClientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdAccount, setCreatedAccount] = useState<{
    username: string;
    password: string;
    days: number;
    clientName?: string;
    appName?: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<'user' | 'pass' | 'combo' | null>(null);

  const copyToClipboard = (text: string, field: 'user' | 'pass' | 'combo') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
    setShowPassword(true);
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setUsername('');
      setPassword('');
      setShowPassword(false);
      setClientName('');
      setDays(30);
      setCreatedAccount(null);
      setCopiedField(null);
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
        const appObj = userApps.find((a) => a.id === appId);
        setCreatedAccount({
          username: username.trim(),
          password: password.trim(),
          days: Number(days),
          clientName: clientName.trim() || undefined,
          appName: appObj?.name || 'User-Auth Application',
        });
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

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3 text-xs">
            {/* Username Row */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-zinc-400 text-[11px] uppercase font-bold">Username:</span>
                <span className="font-mono font-bold text-white text-sm select-all">{createdAccount.username}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(createdAccount.username, 'user')}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Copy Username"
              >
                {copiedField === 'user' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Password Row */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-zinc-400 text-[11px] uppercase font-bold">Password:</span>
                <span className="font-mono font-bold text-amber-400 text-sm select-all">{createdAccount.password}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(createdAccount.password, 'pass')}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Copy Password"
              >
                {copiedField === 'pass' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* One-click user:pass combo */}
            <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-900/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  One-Click Combo (user:pass):
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(`${createdAccount.username}:${createdAccount.password}`, 'combo')}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-cyan-100 hover:underline"
                >
                  {copiedField === 'combo' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Credentials</span>
                    </>
                  )}
                </button>
              </div>
              <code className="block p-2 rounded bg-black/60 border border-cyan-800/40 text-cyan-300 font-mono text-xs select-all break-all">
                {createdAccount.username}:{createdAccount.password}
              </code>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1">
              <div>
                <span className="font-bold text-zinc-500">Duration:</span> {createdAccount.days} Days
              </div>
              {createdAccount.clientName && (
                <div>
                  <span className="font-bold text-zinc-500">Client:</span> {createdAccount.clientName}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3 h-3" /> Generate Password
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-10 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors font-mono"
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
                      ? 'bg-red-950 text-red-400 border-red-700 shadow-sm'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
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
      )}
    </Modal>
  );
}
