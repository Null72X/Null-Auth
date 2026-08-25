'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  AppWindow,
  Key,
  ShieldCheck,
  FileText,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';
import { fetchApi, removeAuthToken } from '@/lib/api';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Applications', href: '/applications', icon: AppWindow },
  { name: 'Licenses', href: '/licenses', icon: Key },
  { name: 'HWID Access', href: '/hwid', icon: ShieldCheck },
  { name: 'Activity Logs', href: '/logs', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetchApi('/admin/auth/logout', { method: 'POST' });
    removeAuthToken();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-zinc-900/90 backdrop-blur-xl border-r border-zinc-800/80 flex flex-col h-screen sticky top-0 select-none z-50">
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-zinc-800/80 gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-500 shadow-md shadow-red-950/50 relative group">
          <Shield className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
          <span className="absolute inset-0 rounded-xl bg-red-500/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div>
          <span className="font-bold text-lg text-white tracking-wide">Null-Auth</span>
          <span className="block text-[10px] uppercase tracking-wider text-red-500 font-bold -mt-1">
            Private Admin
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3.5 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-red-950/80 to-zinc-900 text-red-400 border border-red-800/50 shadow-md shadow-red-950/30 translate-x-1'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 hover:translate-x-0.5'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-red-400' : 'text-zinc-400 group-hover:text-zinc-200'
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-3.5 border-t border-zinc-800/80">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-900/40 transition-all duration-200 active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4 text-zinc-400 group-hover:text-red-400" />
          Logout
        </button>
      </div>
    </aside>
  );
}
