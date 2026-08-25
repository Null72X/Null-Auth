'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { Lock, Shield, Server, Check, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetchApi('/admin/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.success) {
        setSuccess('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(res.message || 'Failed to change password.');
      }
    } catch (err: any) {
      setError('An error occurred while updating password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <Header
        title="Settings & Security"
        subtitle="Manage administrator account credentials and view system endpoint configurations."
      />

      {/* Change Password Card */}
      <Card className="space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
          <div className="w-10 h-10 rounded-lg bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Change Admin Password</h2>
            <p className="text-xs text-zinc-400">
              Update your administrator login password securely.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-800/50 flex items-center gap-2 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center gap-2 text-emerald-300 text-xs">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <Button type="submit" isLoading={isLoading} className="mt-2">
            Update Password
          </Button>
        </form>
      </Card>

      {/* Deployment & API Specs */}
      <Card className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">System Information & Client Endpoints</h2>
            <p className="text-xs text-zinc-400">
              Reference URLs for desktop applications and Wispbyte backend integration.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1.5">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider block text-[10px]">
              License Authentication Endpoint
            </span>
            <p className="font-mono text-red-400 font-bold">
              POST /api/v1/client/license/authenticate
            </p>
            <p className="text-zinc-400 text-[11px]">
              Params: <code className="text-zinc-300">appId</code>, <code className="text-zinc-300">appSecret</code>, <code className="text-zinc-300">licenseKey</code>, <code className="text-zinc-300">hwid</code>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1.5">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider block text-[10px]">
              HWID Authentication Endpoint
            </span>
            <p className="font-mono text-purple-400 font-bold">
              POST /api/v1/client/hwid/authenticate
            </p>
            <p className="text-zinc-400 text-[11px]">
              Params: <code className="text-zinc-300">appId</code>, <code className="text-zinc-300">appSecret</code>, <code className="text-zinc-300">hwid</code>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
