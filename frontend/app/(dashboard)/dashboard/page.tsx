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
  UserCheck,
  AlertTriangle,
  Clock,
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
    <div className="space-y-8">
      <Header
        title="Dashboard Overview"
        subtitle="Real-time statistics and summary of your Null-Auth applications and access keys."
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-400">
            <AppWindow className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Apps</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">
              {isLoading ? '...' : stats?.totalApps || 0}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {stats?.activeApps || 0} Active Applications
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Licenses</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">
              {isLoading ? '...' : stats?.activeLicenses || 0}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Out of {stats?.totalLicenses || 0} Total Licenses
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active HWID Users</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">
              {isLoading ? '...' : stats?.activeHwids || 0}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Out of {stats?.totalHwids || 0} Total Whitelisted
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Expired Licenses</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">
              {isLoading ? '...' : stats?.expiredLicenses || 0}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Expired or Inactive Keys</p>
          </div>
        </Card>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Applications */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2">
              <AppWindow className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-bold text-white">Recent Applications</h2>
            </div>
            <Link
              href="/applications"
              className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-zinc-500">Loading applications...</div>
            ) : stats?.recentApps && stats.recentApps.length > 0 ? (
              stats.recentApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 text-xs font-bold font-mono">
                      {app.appId.slice(3, 5)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100">{app.name}</h4>
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
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-bold text-white">Recent Security Logs</h2>
            </div>
            <Link
              href="/logs"
              className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-zinc-500">Loading activity logs...</div>
            ) : stats?.recentLogs && stats.recentLogs.length > 0 ? (
              stats.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/60 text-xs"
                >
                  <div>
                    <span className="font-semibold text-zinc-200">{log.action}</span>
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
