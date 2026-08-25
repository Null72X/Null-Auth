'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, User, AlertCircle, Sparkles } from 'lucide-react';
import { fetchApi, setAuthToken } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetchApi('/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (res.success && res.data?.token) {
        setAuthToken(res.data.token);
        router.push('/dashboard');
      } else {
        setError(res.error || res.message || 'Invalid username or password');
      }
    } catch (err: any) {
      setError('An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Animated Glowing Mesh */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-red-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-red-950/30 rounded-full blur-[140px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-zinc-900/90 backdrop-blur-2xl border border-zinc-800/90 rounded-[7px] p-8 shadow-2xl relative z-10 animate-scale-in">
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[7px] bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-500 mb-4 shadow-xl shadow-red-950/50 relative group">
            <Shield className="w-8 h-8 transition-transform duration-300 group-hover:scale-110" />
            <span className="absolute inset-0 rounded-[7px] bg-red-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
            Null-Auth <Sparkles className="w-4 h-4 text-red-500" />
          </h1>
          <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider font-bold">
            Private Admin Dashboard
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-[7px] bg-red-950/70 border border-red-800/60 flex items-start gap-3 text-red-300 text-xs shadow-md animate-slide-up">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username (e.g. NULL)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-[7px] pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/80 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-[7px] pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/80 transition-all"
              />
            </div>
          </div>

          <Button type="submit" isLoading={isLoading} className="w-full py-3.5 text-sm font-bold tracking-wide mt-2 shadow-xl shadow-red-950/60">
            Log In to Null-Auth
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800/80 text-center">
          <p className="text-[11px] text-zinc-500">
            Protected Private Licensing & Authentication System &bull; Authorized Access Only
          </p>
        </div>
      </div>
    </div>
  );
}
