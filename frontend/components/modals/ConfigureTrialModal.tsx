'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { fetchApi } from '@/lib/api';
import {
  Sparkles,
  Key,
  User,
  Shield,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Check,
  Copy,
  PowerOff,
} from 'lucide-react';

interface ConfigureTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: any;
  onSuccess: () => void;
}

export function ConfigureTrialModal({
  isOpen,
  onClose,
  app,
  onSuccess,
}: ConfigureTrialModalProps) {
  const [suffix, setSuffix] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('trial123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRandomSuffix = () => {
    const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${p1}-${p2}`;
  };

  const generateRandomUsername = () => {
    const p = Math.random().toString(36).substring(2, 6).toLowerCase();
    return `trial_${p}`;
  };

  const generateRandomPassword = () => {
    return 'trial_' + Math.random().toString(36).substring(2, 8);
  };

  useEffect(() => {
    if (app && isOpen) {
      setError(null);
      setShowPassword(false);

      if (app.type === 'LICENSE') {
        const existingKey = app.freeTrialSuffix || app.freeTrialKey || '';
        const clean = existingKey.replace(/^(FREE-TRIAL-|TRIAL-)/i, '').trim();
        setSuffix(clean || generateRandomSuffix());
      } else if (app.type === 'USER_AUTH') {
        const existingUser = app.trialUsername || app.freeTrialKey || '';
        const existingPass = app.freeTrialPassword || 'trial123';
        setUsername(existingUser || generateRandomUsername());
        setPassword(existingPass);
      }
    }
  }, [app, isOpen]);

  if (!app) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (app.type === 'LICENSE') {
      const cleanSuffix = suffix.trim();
      if (!cleanSuffix) {
        setError('Please enter a license suffix.');
        return;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(cleanSuffix)) {
        setError('Suffix can only contain letters, numbers, dashes, and underscores.');
        return;
      }
      if (cleanSuffix.length > 40) {
        setError('Suffix cannot exceed 40 characters.');
        return;
      }
    } else if (app.type === 'USER_AUTH') {
      const cleanUser = username.trim();
      if (!cleanUser) {
        setError('Please enter a trial username.');
        return;
      }
      if (cleanUser.length < 2 || cleanUser.length > 32) {
        setError('Trial username must be between 2 and 32 characters.');
        return;
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
        setError('Trial username can only contain letters, numbers, dots, and underscores.');
        return;
      }
      if (!app.freeTrialEnabled && !password.trim()) {
        setError('Please enter a password for the trial account (min 4 characters).');
        return;
      }
      if (password.trim() && password.trim().length < 4) {
        setError('Password must be at least 4 characters.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const payload: any = {
        freeTrialEnabled: true,
      };

      if (app.type === 'LICENSE') {
        payload.freeTrialSuffix = suffix.trim().toUpperCase();
      } else if (app.type === 'USER_AUTH') {
        payload.trialUsername = username.trim();
        payload.trialPassword = password.trim() || app.freeTrialPassword || 'trial123';
      }

      const res = await fetchApi(`/admin/apps/${app.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to update free trial settings.');
      }
    } catch (err: any) {
      setError('An unexpected error occurred while saving free trial settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableTrial = async () => {
    if (!confirm(`Are you sure you want to disable Free Trial for "${app.name}"? Active trial accounts will be expired.`)) {
      return;
    }

    setIsDisabling(true);
    try {
      const res = await fetchApi(`/admin/apps/${app.id}/free-trial`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: false }),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to disable free trial.');
      }
    } catch (err) {
      setError('An error occurred while disabling free trial.');
    } finally {
      setIsDisabling(false);
    }
  };

  const modalTitle = app.freeTrialEnabled
    ? `Edit Free Trial — ${app.name}`
    : `Enable Free Trial — ${app.name}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-[10px] text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* License Mode Trial Configuration */}
        {app.type === 'LICENSE' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">
              Set the Master Free Trial license key suffix. The prefix{' '}
              <span className="font-mono text-amber-400 font-bold">TRIAL-</span> is locked and
              automatically enforced.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Trial License Suffix</span>
                <button
                  type="button"
                  onClick={() => setSuffix(generateRandomSuffix())}
                  className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Randomize
                </button>
              </label>

              <div className="flex rounded-[8px] overflow-hidden border border-zinc-800 focus-within:border-amber-500">
                <span className="bg-zinc-800 text-amber-400 font-mono text-xs px-3 py-2 flex items-center select-none font-bold border-r border-zinc-700">
                  TRIAL-
                </span>
                <input
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value.toUpperCase())}
                  placeholder="e.g. VIP-ACCESS"
                  maxLength={40}
                  required
                  className="flex-1 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none uppercase"
                />
              </div>
            </div>

            <div className="p-3 rounded-[8px] bg-amber-950/20 border border-amber-800/30 text-xs">
              <span className="text-zinc-400 block text-[11px] mb-0.5">Master License Key Preview:</span>
              <span className="font-mono text-amber-400 font-bold text-sm tracking-wide">
                TRIAL-{suffix || '...'}
              </span>
              <span className="text-[11px] text-zinc-500 block mt-1">
                Clients using this key bypass single-machine HWID hardware locking.
              </span>
            </div>
          </div>
        )}

        {/* User Auth Mode Trial Configuration */}
        {app.type === 'USER_AUTH' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">
              Set the dedicated username and password for free trial client logins.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" /> Trial Username
                </span>
                <button
                  type="button"
                  onClick={() => setUsername(generateRandomUsername())}
                  className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Randomize
                </button>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. trial_guest"
                maxLength={32}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-[8px] px-3 py-2 text-xs font-mono text-cyan-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" /> Trial Password
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPassword(generateRandomPassword());
                    setShowPassword(true);
                  }}
                  className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Randomize
                </button>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter trial password (min 4 chars)"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-[8px] px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 pr-10 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-[8px] bg-cyan-950/30 border border-cyan-800/40 text-xs space-y-1.5">
              <span className="text-[11px] font-bold text-cyan-400 block uppercase tracking-wider">
                Current Trial Credentials Preview:
              </span>
              <div className="flex items-center gap-3 font-mono text-xs">
                <div>
                  <span className="text-zinc-500 text-[10px] block">Username</span>
                  <span className="text-white font-bold">{username || '...'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">Password</span>
                  <span className="text-amber-400 font-bold">{showPassword ? password : '••••••••'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                <code className="text-cyan-300 font-mono text-[11px] bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 select-all">
                  {username || 'trial_user'}:{password || 'trial123'}
                </code>
                <span className="text-[10px] text-zinc-500 italic">Universal multi-device trial</span>
              </div>
            </div>
          </div>
        )}

        {/* HWID Mode */}
        {app.type === 'HWID' && (
          <div className="p-3.5 rounded-[8px] bg-purple-950/20 border border-purple-800/30 text-xs space-y-2">
            <div className="flex items-center gap-2 text-purple-300 font-bold">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Universal HWID Free Trial</span>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Enabling free trial mode permits any machine hardware ID (HWID) to authenticate
              instantly without requiring manual administrative approval or whitelisting.
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
          <div>
            {app.freeTrialEnabled && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDisableTrial}
                disabled={isDisabling || isLoading}
                className="gap-1.5 text-xs"
              >
                <PowerOff className="w-3.5 h-3.5" /> Disable Trial
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} className="gap-2">
              <Sparkles className="w-4 h-4" />
              {app.freeTrialEnabled ? 'Save Changes' : 'Activate Free Trial'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
