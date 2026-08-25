'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { fetchApi } from '@/lib/api';
import { CreateAppModal } from '@/components/modals/CreateAppModal';
import { CreateLicenseModal } from '@/components/modals/CreateLicenseModal';
import { AddHwidModal } from '@/components/modals/AddHwidModal';
import {
  AppWindow,
  Key,
  ShieldCheck,
  Activity,
  AlertTriangle,
  ArrowRight,
  Plus,
  Zap,
  Shield,
  Clock,
  TrendingUp,
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
  const [appsList, setAppsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateAppOpen, setIsCreateAppOpen] = useState(false);
  const [isGenerateLicenseOpen, setIsGenerateLicenseOpen] = useState(false);
  const [isAddHwidOpen, setIsAddHwidOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const [statsRes, appsRes] = await Promise.all([
      fetchApi('/admin/logs/stats'),
      fetchApi('/admin/apps'),
    ]);

    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }
    if (appsRes.success && appsRes.data) {
      setAppsList(appsRes.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <Header
        title="Dashboard Overview"
        subtitle="Real-time performance metrics, system status, and administrative quick controls."
      />

      {/* Hero Welcome Banner */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-zinc-900 via-red-950/40 to-zinc-900 border-zinc-800 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/60 text-red-400 text-xs font-bold">
              <Zap className="w-3.5 h-3.5" /> Null-Auth Private Cloud Platform
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Welcome back, Administrator
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl">
              Manage your applications, generate secure license keys bound to client machine SIDs, and control HWID access whitelists.
            </p>
          </div>

          {/* Quick Control Shortcuts */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              onClick={() => setIsCreateAppOpen(true)}
              className="gap-2 text-xs font-bold shadow-lg shadow-red-950/50"
            >
              <Plus className="w-3.5 h-3.5" /> App
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsGenerateLicenseOpen(true)}
              className="gap-2 text-xs font-bold border-blue-900/40 hover:border-blue-500/50"
            >
              <Key className="w-3.5 h-3.5 text-blue-400" /> License
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsAddHwidOpen(true)}
              className="gap-2 text-xs font-bold border-purple-900/40 hover:border-purple-500/50"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> HWID
            </Button>
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="flex items-center gap-4 animate-slide-up group" style={{ animationDelay: '0ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400 shadow-md shadow-red-950/40 group-hover:scale-110 transition-transform">
            <AppWindow className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Apps</p>
            <h3 className="text-2xl font-black text-white mt-0.5">
              {isLoading ? '...' : stats?.totalApps || 0}
            </h3>
            <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
              {stats?.activeApps || 0} Active Applications
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 animate-slide-up group" style={{ animationDelay: '50ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 shadow-md shadow-blue-950/40 group-hover:scale-110 transition-transform">
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
          <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400 shadow-md shadow-purple-950/40 group-hover:scale-110 transition-transform">
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
          <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 shadow-md shadow-amber-950/40 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Expired Keys</p>
            <h3 className="text-2xl font-black text-white mt-0.5">
              {isLoading ? '...' : stats?.expiredLicenses || 0}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Expired or Inactive Keys</p>
          </div>
        </Card>
      </div>

      {/* Two Column Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Applications Summary & Quick Manage */}
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
              View All Apps <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-zinc-500 animate-pulse">
                Loading applications...
              </div>
            ) : stats?.recentApps && stats.recentApps.length > 0 ? (
              stats.recentApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 hover:border-red-500/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800/80 flex items-center justify-center text-zinc-300 text-xs font-bold font-mono border border-zinc-700/50 group-hover:border-red-500/40 transition-colors">
                      {app.appId.slice(3, 5)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-100 group-hover:text-red-400 transition-colors">
                        {app.name}
                      </h4>
                      <p className="text-xs font-mono text-zinc-400">{app.appId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Badge status={app.type} />
                    <Badge status={app.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-zinc-500 space-y-2">
                <p>No applications created yet.</p>
                <Button onClick={() => setIsCreateAppOpen(true)} size="sm" className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Create Application
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Security Audit Feed */}
        <Card className="space-y-4 animate-slide-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-bold text-white">Recent Security Logs</h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono">Live Audit Trail</span>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-zinc-500 animate-pulse">
                Loading security logs...
              </div>
            ) : stats?.recentLogs && stats.recentLogs.length > 0 ? (
              stats.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs hover:border-zinc-700/60 transition-all"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-zinc-200 font-mono">{log.action}</span>
                    <span className="block text-[11px] text-zinc-500">
                      {log.ipAddress || 'Internal'} &bull; {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <Badge status={log.status} />
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-zinc-500">No activity logged yet.</div>
            )}
          </div>
        </Card>
      </div>

      {/* Modals */}
      <CreateAppModal
        isOpen={isCreateAppOpen}
        onClose={() => setIsCreateAppOpen(false)}
        onSuccess={loadData}
      />

      <CreateLicenseModal
        isOpen={isGenerateLicenseOpen}
        onClose={() => setIsGenerateLicenseOpen(false)}
        onSuccess={loadData}
        apps={appsList}
      />

      <AddHwidModal
        isOpen={isAddHwidOpen}
        onClose={() => setIsAddHwidOpen(false)}
        onSuccess={loadData}
        apps={appsList}
      />
    </div>
  );
}
