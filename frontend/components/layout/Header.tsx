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
    <header className="h-16 bg-zinc-900/70 backdrop-blur-2xl border-b border-zinc-800/80 px-8 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          {title} <Sparkles className="w-4 h-4 text-red-500/80" />
        </h1>
        {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Security Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Private Admin Online
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200">
          <div className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-300">
            <User className="w-3 h-3" />
          </div>
          <span className="font-medium text-zinc-200">{adminUser}</span>
        </div>
      </div>
    </header>
  );
}
