'use client';

import React, { useEffect, useState } from 'react';
import { User, ShieldAlert } from 'lucide-react';
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
    <header className="h-16 bg-zinc-900/60 border-b border-zinc-800/80 px-8 flex items-center justify-between backdrop-blur-md sticky top-0 z-40">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Security Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Private Admin Online
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
          <div className="w-6 h-6 rounded-full bg-red-950 flex items-center justify-center text-red-400 border border-red-800/40">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold text-zinc-200">{adminUser}</span>
        </div>
      </div>
    </header>
  );
}
