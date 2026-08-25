'use client';

import React, { useEffect, useState } from 'react';
import { User, ShieldCheck, Sparkles } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [adminUser, setAdminUser] = useState<string>('admin');

  useEffect(() => {
    fetchApi('/admin/auth/me').then((res) => {
      if (res.success && res.data) {
        setAdminUser(res.data.username);
      }
    });
  }, []);

  return (
    <header className="h-16 bg-zinc-900/70 backdrop-blur-2xl border-b border-zinc-800/80 px-8 flex items-center justify-between sticky top-0 z-30 shadow-md">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          {title} <Sparkles className="w-4 h-4 text-red-500/80 animate-pulse" />
        </h1>
        {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Security Badge with Pulsing Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-[7px] bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 text-xs font-semibold shadow-md shadow-emerald-950/40">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Private Admin Online
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-[7px] bg-zinc-900/90 border border-zinc-700/60 hover:border-red-500/40 transition-colors shadow-sm">
          <div className="w-6 h-6 rounded-[5px] bg-red-950/90 flex items-center justify-center text-red-400 border border-red-800/50 shadow-sm">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-bold text-zinc-100">{adminUser}</span>
        </div>
      </div>
    </header>
  );
}
