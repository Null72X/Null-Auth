'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  AppWindow,
  Key,
  ShieldCheck,
  Users,
  Settings,
  LogOut,
  Shield,
  Sparkles,
} from 'lucide-react';
import { fetchApi, removeAuthToken } from '@/lib/api';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, shortcut: '1' },
  { name: 'Applications', href: '/applications', icon: AppWindow, shortcut: '2' },
  { name: 'Licenses', href: '/licenses', icon: Key, shortcut: '3' },
  { name: 'HWID Access', href: '/hwid', icon: ShieldCheck, shortcut: '4' },
  { name: 'User Accounts', href: '/users', icon: Users, shortcut: '5' },
  { name: 'Settings', href: '/settings', icon: Settings, shortcut: '6' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<string>('admin');
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);

  // Sync optimistic href back when route finishes loading
  useEffect(() => {
    setOptimisticHref(null);
  }, [pathname]);

  useEffect(() => {
    fetchApi('/admin/auth/me')
      .then((res) => {
        if (res.success && res.data?.username) {
          setAdminUser(res.data.username);
        }
      })
      .catch(() => {});
  }, []);

  // Keyboard Navigation: Press 1-6 or ArrowUp / ArrowDown to switch tabs immediately (matching Null-Tools)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElem = document.activeElement as HTMLElement | null;
      const tag = activeElem?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (activeElem && (activeElem as any).isContentEditable)) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= navItems.length) {
        e.preventDefault();
        const target = navItems[num - 1];
        if (target) {
          setOptimisticHref(target.href);
          router.push(target.href);
        }
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const currentActive = optimisticHref || pathname;
        const currentIdx = navItems.findIndex(
          (item) => currentActive === item.href || currentActive.startsWith(item.href + '/')
        );
        if (currentIdx !== -1) {
          e.preventDefault();
          const nextIdx =
            e.key === 'ArrowDown'
              ? (currentIdx + 1) % navItems.length
              : (currentIdx - 1 + navItems.length) % navItems.length;
          const nextTarget = navItems[nextIdx];
          if (nextTarget) {
            setOptimisticHref(nextTarget.href);
            router.push(nextTarget.href);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [optimisticHref, pathname, router]);

  const handleLogout = async () => {
    await fetchApi('/admin/auth/logout', { method: 'POST' });
    removeAuthToken();
    router.push('/login');
  };

  const currentPath = optimisticHref || pathname;

  return (
    <aside className="w-[240px] min-w-[240px] max-w-[240px] bg-zinc-950/90 backdrop-blur-2xl border-r border-zinc-800/80 flex flex-col h-screen sticky top-0 select-none z-40 shadow-2xl">
      {/* Brand Logo Header */}
      <div className="h-16 flex items-center px-4 border-b border-zinc-800/80 gap-3 relative overflow-hidden">
        <div className="w-8 h-8 rounded-[7px] bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-500 shadow-lg shadow-red-950/60 relative group shrink-0">
          <Shield className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
        </div>
        <div className="min-w-0">
          <span className="font-extrabold text-[15px] text-white tracking-wide flex items-center gap-1.5 font-sans leading-tight">
            Null-Auth <Sparkles className="w-3.5 h-3.5 text-red-500 shrink-0" />
          </span>
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[8.5px] font-bold uppercase tracking-wider mt-0.5">
            <span className="logo-badge-dot" /> Private Admin
          </div>
        </div>
      </div>

      {/* Navigation Links (Matching Null-Tools exact tab style & speed) */}
      <nav className="flex-1 px-2.5 py-3.5 space-y-1 overflow-y-auto" aria-label="Sidebar Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => setOptimisticHref(item.href)}
              title={`Switch to ${item.name} (Shortcut: Press ${item.shortcut})`}
              className={`flex items-center justify-between px-2.5 py-2 min-h-[34px] rounded-[7px] text-[11.5px] font-semibold transition-all duration-120 cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-red-400 border border-zinc-800/90 shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-[15px] h-[15px] shrink-0 transition-colors ${
                    isActive ? 'text-red-400' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </div>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)] shrink-0 ml-1.5" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-zinc-800/80 space-y-2">
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[7px] bg-zinc-900/70 border border-zinc-800/80">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-semibold text-zinc-200 truncate text-[11.5px]">{adminUser}</span>
          </div>
          <span className="text-[9.5px] text-zinc-500 uppercase tracking-wider font-bold">Online</span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 min-h-[32px] rounded-[7px] text-[11.5px] font-semibold text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-120"
        >
          <LogOut className="w-3.5 h-3.5 text-zinc-400" />
          Logout
        </button>
      </div>
    </aside>
  );
}
