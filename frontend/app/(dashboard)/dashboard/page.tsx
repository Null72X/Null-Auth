'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { fetchApi } from '@/lib/api';
import {
  AppWindow,
  Key,
  ShieldCheck,
  Activity,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalApps: number;
  activeApps: number;
  totalLicenses: number;
  activeLicenses: number;
  expiredLicenses: number;
  totalHwids: number;
  activeHwids: number;
  recentApps: any[];
  recentLogs: any[];
}

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    setIsLoading(true);
    const res = await fetchApi('/admin/logs/stats');
    if (res.success && res.data) {
      setStats(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <Header
        title="Dashboard Overview"
        subtitle="Real-time statistics and summary of your Null-Auth applications and access keys."
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="flex items-center gap-4 animate-slide-up group" style={{ animationDelay: '0ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-red-950/70 border border-red-800/50 flex items-center justify-center text-red-400 shadow-md shadow-red-950/40 group-hover:scale-110 transition-transform">
            <AppWindow className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Apps</p>
            <h3 className="text-2xl font-black text-white mt-0.5">
              {isLoading ? '...' : stats?.totalApps || 0}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {stats?.activeApps || 0} Active Applications
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 animate-slide-up group" style={{ animationDelay: '50ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-blue-950/70 border border-blue-800/50 flex items-center justify-center text-blue-400 shadow-md shadow-blue-950/40 group-hover:scale-110 transition-transform">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Licenses</p>
            <h3 className="text-2xl font-black text-white mt-0.5">
              {isLoading ? '...' : stats?.activeLicenses || 0}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Out of {stats?.totalLicenses || 0} Total Licenses
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 animate-slide-up group" style={{ animationDelay: '100ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-purple-950/70 border border-purple-800/50 flex items-center justify-center text-purple-400 shadow-md shadow-purple-950/40 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active HWID Users</p>
            <h3 className="text-2xl font-black text-white mt-0.5">
              {isLoading ? '...' : stats?.activeHwids || 0}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Out of {stats?.totalHwids || 0} Total Whitelisted
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 animate-slide-up group" style={{ animationDelay: '150ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-amber-950/70 border border-amber-800/50 flex items-center justify-center text-amber-400 shadow-md shadow-amber-950/40 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Expired Licenses</p>
            <h3 className="text-2xl font-black text-white mt-0.5">
              {isLoading ? '...' : stats?.expiredLicenses || 0}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Expired or Inactive Keys</p>
          </div>
        </Card>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Applications */}
        <Card className="space-y-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2">
              <AppWindow className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-bold text-white">Recent Applications</h2>
            </div>
            <Link
              href="/applications"
              className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 group"
            >
              View All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-zinc-500">Loading applications...</div>
            ) : stats?.recentApps && stats.recentApps.length > 0 ? (
              stats.recentApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 hover:border-red-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center text-zinc-300 text-xs font-bold font-mono border border-zinc-700/50">
                      {app.appId.slice(3, 5)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-100">{app.name}</h4>
                      <p className="text-xs font-mono text-zinc-400">{app.appId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge status={app.type} />
                    <Badge status={app.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-zinc-500">
                No applications created yet. Head over to Applications to create one.
              </div>
            )}
          </div>
        </Card>

        {/* Recent Authentication Activity */}
        <Card className="space-y-4 animate-slide-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-bold text-white">Recent Security Logs</h2>
            </div>
            <Link
              href="/logs"
              className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 group"
            >
              View All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-zinc-500">Loading activity logs...</div>
            ) : stats?.recentLogs && stats.recentLogs.length > 0 ? (
              stats.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs hover:border-zinc-700/60 transition-all"
                >
                  <div>
                    <span className="font-bold text-zinc-200">{log.action}</span>
                    <span className="block text-[11px] text-zinc-500 mt-0.5">
                      {log.ipAddress || 'Internal'} &bull; {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <Badge status={log.status} />
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-zinc-500">No activity logged yet.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
