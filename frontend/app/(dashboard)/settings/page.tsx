'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import {
  Lock,
  Shield,
  Server,
  Check,
  AlertCircle,
  Code,
  Copy,
  Terminal,
  Cpu,
  Globe,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'security' | 'api' | 'sdk'>('security');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedSdk, setCopiedSdk] = useState<string | null>(null);

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

  const copyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSdk(label);
    setTimeout(() => setCopiedSdk(null), 2000);
  };

  const pythonSnippet = `import urllib.request, json, subprocess

def get_sid():
    return subprocess.check_output(["whoami", "/user"], text=True).split()[-1]

res = urllib.request.urlopen(urllib.request.Request(
    "https://null-auth-backend.vercel.app/api/v1/client/license/authenticate",
    data=json.dumps({"appId": "YOUR_APP_ID", "appSecret": "YOUR_APP_SECRET", "licenseKey": "NULL-XXXX", "hwid": get_sid()}).encode(),
    headers={"Content-Type": "application/json"}
))
print(json.loads(res.read()))`;

  const csharpSnippet = `using System.Net.Http;
using System.Text.Json;

var payload = new { appId = "YOUR_APP_ID", appSecret = "YOUR_APP_SECRET", licenseKey = "NULL-XXXX", hwid = "S-1-5-21-..." };
var res = await new HttpClient().PostAsync("https://null-auth-backend.vercel.app/api/v1/client/license/authenticate", new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json"));
Console.WriteLine(await res.Content.ReadAsStringAsync());`;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      <Header
        title="Settings & Platform Configuration"
        subtitle="Manage administrator security, view live production endpoints, and access SDK client code."
      />

      {/* Tab Selectors */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 text-sm">
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'security'
              ? 'bg-red-950/80 text-red-400 border border-red-800/60 shadow-md'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Lock className="w-4 h-4" /> Admin Security
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'api'
              ? 'bg-red-950/80 text-red-400 border border-red-800/60 shadow-md'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Server className="w-4 h-4" /> Live Endpoints
        </button>
        <button
          onClick={() => setActiveTab('sdk')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'sdk'
              ? 'bg-red-950/80 text-red-400 border border-red-800/60 shadow-md'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Code className="w-4 h-4" /> Client SDK Snippets
        </button>
      </div>

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card className="space-y-5 animate-slide-up">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400 shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Change Admin Password</h2>
              <p className="text-xs text-zinc-400">
                Update your administrator credentials for accessing the Null-Auth dashboard.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/50 flex items-center gap-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center gap-2 text-emerald-300 text-xs">
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <Button type="submit" isLoading={isLoading} className="mt-2 shadow-lg shadow-red-950/40">
              Update Password
            </Button>
          </form>
        </Card>
      )}

      {/* API Endpoints Tab */}
      {activeTab === 'api' && (
        <Card className="space-y-5 animate-slide-up">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
            <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 shadow-md">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Live Production API Endpoints</h2>
              <p className="text-xs text-zinc-400">
                HTTPS endpoints hosted on Vercel Serverless & Supabase PostgreSQL Cloud.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                  License Authentication Endpoint (Mode 1)
                </span>
                <span className="text-emerald-400 font-mono font-bold text-[11px]">POST</span>
              </div>
              <p className="font-mono text-red-400 font-bold text-sm bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800">
                https://null-auth-backend.vercel.app/api/v1/client/license/authenticate
              </p>
              <p className="text-zinc-400 text-[11px]">
                Payload: <code className="text-zinc-300">{"{ appId, appSecret, licenseKey, hwid }"}</code>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                  HWID Whitelist Authentication Endpoint (Mode 2)
                </span>
                <span className="text-emerald-400 font-mono font-bold text-[11px]">POST</span>
              </div>
              <p className="font-mono text-purple-400 font-bold text-sm bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800">
                https://null-auth-backend.vercel.app/api/v1/client/hwid/authenticate
              </p>
              <p className="text-zinc-400 text-[11px]">
                Payload: <code className="text-zinc-300">{"{ appId, appSecret, hwid }"}</code>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* SDK Snippets Tab */}
      {activeTab === 'sdk' && (
        <div className="space-y-6 animate-slide-up">
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Python 3 Quick Integration Snippet</h3>
              </div>
              <button
                onClick={() => copyCode(pythonSnippet, 'python')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
              >
                {copiedSdk === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Python Code
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto">
              {pythonSnippet}
            </pre>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">C# .NET Quick Integration Snippet</h3>
              </div>
              <button
                onClick={() => copyCode(csharpSnippet, 'csharp')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
              >
                {copiedSdk === 'csharp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy C# Code
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto">
              {csharpSnippet}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );
}
