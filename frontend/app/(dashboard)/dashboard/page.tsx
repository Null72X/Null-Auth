'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  Terminal,
  Globe,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Radio,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
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

  // Application Window Console State
  const [appFilterTab, setAppFilterTab] = useState<'ALL' | 'LICENSE' | 'HWID'>('ALL');
  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);
  const [targetAppForModal, setTargetAppForModal] = useState<string | undefined>(undefined);

  // Live Terminal Stream State
  const [logsList, setLogsList] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CLIENT' | 'ADMIN' | 'THREATS'>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Modals
  const [isCreateAppOpen, setIsCreateAppOpen] = useState(false);
  const [isGenerateLicenseOpen, setIsGenerateLicenseOpen] = useState(false);
  const [isAddHwidOpen, setIsAddHwidOpen] = useState(false);

  const loadLogs = async () => {
    setIsRefreshingLogs(true);
    const res = await fetchApi('/admin/logs?limit=30');
    if (res.success && res.data) {
      setLogsList(res.data);
    }
    setIsRefreshingLogs(false);
  };

  const loadData = async () => {
    setIsLoading(true);
    const [statsRes, appsRes, logsRes] = await Promise.all([
      fetchApi('/admin/logs/stats'),
      fetchApi('/admin/apps'),
      fetchApi('/admin/logs?limit=30'),
    ]);

    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }
    if (appsRes.success && appsRes.data) {
      setAppsList(appsRes.data);
    }
    if (logsRes.success && logsRes.data) {
      setLogsList(logsRes.data);
    } else if (statsRes.success && statsRes.data?.recentLogs) {
      setLogsList(statsRes.data.recentLogs);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh live feed every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchApi('/admin/logs?limit=30').then((res) => {
        if (res.success && res.data) {
          setLogsList(res.data);
        }
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logsList.filter((log) => {
      if (selectedFilter === 'CLIENT') return log.actorType === 'CLIENT';
      if (selectedFilter === 'ADMIN') return log.actorType === 'ADMIN';
      if (selectedFilter === 'THREATS') return log.status === 'FAILURE';
      return true;
    });
  }, [logsList, selectedFilter]);

  // Log Telemetry Summary
  const logMetrics = useMemo(() => {
    const total = logsList.length;
    const passed = logsList.filter((l) => l.status === 'SUCCESS').length;
    const blocked = logsList.filter((l) => l.status === 'FAILURE').length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 100;
    return { total, passed, blocked, passRate };
  }, [logsList]);

  // Filtered Dashboard Applications
  const filteredDashboardApps = useMemo(() => {
    return appsList.filter((app) => {
      if (appFilterTab === 'LICENSE') return app.type === 'LICENSE';
      if (appFilterTab === 'HWID') return app.type === 'HWID';
      return true;
    });
  }, [appsList, appFilterTab]);

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
        {/* Cyberpunk Application Console Window */}
        <Card className="space-y-4 animate-slide-up border-zinc-800/90 bg-zinc-950/80 backdrop-blur-md shadow-2xl flex flex-col justify-between" style={{ animationDelay: '200ms' }}>
          <div className="space-y-3">
            {/* Console Window Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                {/* Simulated Linux / Mac Terminal Window Control Dots */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800">
                  <span className="w-2 h-2 rounded-full bg-red-500/80" />
                  <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-2">
                  <AppWindow className="w-4 h-4 text-red-400" />
                  <h2 className="text-sm font-bold font-mono text-white tracking-tight">
                    app-manager.console
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateAppOpen(true)}
                  className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/70 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3" /> New App
                </button>
                <Link
                  href="/applications"
                  className="px-2.5 py-1 rounded text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all flex items-center gap-1 group"
                >
                  <span>All Apps</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Category Filter Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
              {[
                { id: 'ALL', label: `All (${appsList.length})` },
                { id: 'LICENSE', label: `License (${appsList.filter((a) => a.type === 'LICENSE').length})` },
                { id: 'HWID', label: `HWID (${appsList.filter((a) => a.type === 'HWID').length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAppFilterTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                    appFilterTab === tab.id
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'bg-zinc-950/60 text-zinc-500 hover:text-zinc-300 border border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Applications List Box */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
              {isLoading ? (
                <div className="py-12 text-center text-xs font-mono text-zinc-500 animate-pulse flex items-center justify-center gap-2">
                  <AppWindow className="w-4 h-4 text-zinc-600 animate-spin" />
                  <span>Loading applications catalog...</span>
                </div>
              ) : filteredDashboardApps.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-zinc-600 space-y-2">
                  <p>[CATALOG_EMPTY] No applications matching filter.</p>
                  <Button onClick={() => setIsCreateAppOpen(true)} size="sm" className="gap-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Create Application
                  </Button>
                </div>
              ) : (
                filteredDashboardApps.map((app) => (
                  <div
                    key={app.id}
                    className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-950/70 hover:border-zinc-700 transition-all font-mono text-xs flex flex-col gap-2 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                            app.type === 'LICENSE'
                              ? 'bg-blue-950/60 border-blue-800/50 text-blue-400'
                              : 'bg-purple-950/60 border-purple-800/50 text-purple-400'
                          }`}
                        >
                          {app.type === 'LICENSE' ? <Key className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-white group-hover:text-red-400 transition-colors truncate">
                            {app.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                            <span className="text-zinc-400 font-bold">{app.appId}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(app.appId);
                                setCopiedAppId(app.appId);
                                setTimeout(() => setCopiedAppId(null), 2000);
                              }}
                              className="hover:text-white transition-colors"
                              title="Copy App ID"
                            >
                              {copiedAppId === app.appId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-amber-400 border border-zinc-800 font-bold">
                          v{app.version || '1.0.0'}
                        </span>
                        <Badge status={app.status} />
                      </div>
                    </div>

                    {/* Bottom row: User count & Quick Modal launcher */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-zinc-900 text-[11px] text-zinc-400">
                      <span className="text-zinc-500">
                        {app.activeUsers ?? 0} active users
                      </span>
                      {app.type === 'LICENSE' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetAppForModal(app.id);
                            setIsGenerateLicenseOpen(true);
                          }}
                          className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-blue-400 hover:text-blue-300 border border-zinc-800 text-[10px] font-bold transition-all flex items-center gap-1"
                        >
                          <Key className="w-2.5 h-2.5" /> + Key
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetAppForModal(app.id);
                            setIsAddHwidOpen(true);
                          }}
                          className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-purple-400 hover:text-purple-300 border border-zinc-800 text-[10px] font-bold transition-all flex items-center gap-1"
                        >
                          <ShieldCheck className="w-2.5 h-2.5" /> + HWID
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Application Console Telemetry Footer Ticker */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <div className="flex items-center gap-3">
              <span className="text-zinc-400">
                Total: <strong className="text-white">{appsList.length}</strong>
              </span>
              <span className="text-emerald-400">
                Active: <strong className="text-emerald-400">{appsList.filter((a) => a.status === 'ACTIVE').length}</strong>
              </span>
            </div>

            <span className="text-zinc-600">catalog: synchronized</span>
          </div>
        </Card>

        {/* Cyberpunk Live Terminal Auth Stream */}
        <Card className="space-y-4 animate-slide-up border-zinc-800/90 bg-zinc-950/80 backdrop-blur-md shadow-2xl flex flex-col justify-between" style={{ animationDelay: '250ms' }}>
          <div className="space-y-3">
            {/* Terminal Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                {/* Simulated Linux / Mac Terminal Window Control Dots */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800">
                  <span className="w-2 h-2 rounded-full bg-red-500/80" />
                  <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-red-400" />
                  <h2 className="text-sm font-bold font-mono text-white tracking-tight">
                    live-auth.stream
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Live Radar Pulse Tag */}
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-[10px] font-mono font-bold text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                  LIVE STREAM
                </div>

                {/* Auto Refresh Toggle */}
                <button
                  type="button"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                    autoRefresh
                      ? 'bg-zinc-900 text-zinc-300 border-zinc-700'
                      : 'bg-zinc-950 text-zinc-500 border-zinc-800'
                  }`}
                  title="Toggle 10-second background polling"
                >
                  Auto: {autoRefresh ? 'ON' : 'OFF'}
                </button>

                {/* Manual Refresh Button */}
                <button
                  type="button"
                  onClick={loadLogs}
                  disabled={isRefreshingLogs}
                  className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                  title="Refresh Logs Now"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin text-red-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Quick Filter Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
              {[
                { id: 'ALL', label: `All (${logsList.length})` },
                { id: 'CLIENT', label: 'Auth Traffic' },
                { id: 'ADMIN', label: 'Admin Ops' },
                { id: 'THREATS', label: `Alerts (${logMetrics.blocked})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                    selectedFilter === tab.id
                      ? tab.id === 'THREATS' && logMetrics.blocked > 0
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : 'bg-zinc-800 text-white border border-zinc-700'
                      : 'bg-zinc-950/60 text-zinc-500 hover:text-zinc-300 border border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Terminal Logs Stream Box */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
              {isLoading ? (
                <div className="py-12 text-center text-xs font-mono text-zinc-500 animate-pulse flex items-center justify-center gap-2">
                  <Terminal className="w-4 h-4 text-zinc-600 animate-spin" />
                  <span>Connecting to Null-Auth telemetry stream...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-zinc-600 space-y-1">
                  <p>[STREAM_EMPTY] No events match selected filter.</p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const isFail = log.status === 'FAILURE';

                  return (
                    <div
                      key={log.id}
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer font-mono text-xs ${
                        isFail
                          ? 'bg-red-950/20 border-red-900/40 hover:border-red-500/50 shadow-sm shadow-red-950/20'
                          : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      {/* Row 1: Status & Action & Time */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold shrink-0 border ${
                              isFail
                                ? 'bg-red-950 text-red-400 border-red-800 animate-pulse'
                                : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
                            }`}
                          >
                            {isFail ? 'FAIL' : 'PASS'}
                          </span>

                          <span className={`font-bold truncate text-xs ${isFail ? 'text-red-300' : 'text-zinc-200'}`}>
                            {log.action}
                          </span>

                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800 shrink-0 uppercase">
                            {log.actorType}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-zinc-500 text-[11px]">
                          <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                          <span className="text-zinc-600 hover:text-zinc-400">
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: IP & Details summary */}
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1 text-zinc-500 shrink-0">
                          <Globe className="w-3 h-3 text-zinc-600" />
                          {log.ipAddress || 'Internal'}
                        </span>
                        {log.details && (
                          <span className="text-zinc-400 truncate max-w-[280px]">
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                          </span>
                        )}
                      </div>

                      {/* Row 3: Expanded JSON Inspector */}
                      {isExpanded && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-800/80 space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between text-zinc-400">
                            <span className="text-zinc-500 font-bold uppercase text-[10px]">Log Event ID:</span>
                            <span className="font-mono text-zinc-300">{log.id}</span>
                          </div>
                          {log.userAgent && (
                            <div className="text-zinc-400">
                              <span className="text-zinc-500 font-bold uppercase text-[10px] block">User Agent:</span>
                              <span className="text-zinc-400 break-all">{log.userAgent}</span>
                            </div>
                          )}
                          {log.details && (
                            <div>
                              <span className="text-zinc-500 font-bold uppercase text-[10px] block mb-1">Payload / Error Details:</span>
                              <pre className="p-2 rounded bg-black/90 border border-zinc-800 text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap font-mono">
                                {(() => {
                                  try {
                                    const parsed = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                                    return JSON.stringify(parsed, null, 2);
                                  } catch {
                                    return log.details;
                                  }
                                })()}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Terminal SOC Telemetry Footer Ticker */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {logMetrics.passed} Passed ({logMetrics.passRate}%)
              </span>
              {logMetrics.blocked > 0 && (
                <span className="flex items-center gap-1.5 text-red-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  {logMetrics.blocked} Blocked
                </span>
              )}
            </div>

            <span className="text-zinc-600">daemon: ok</span>
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
        onClose={() => {
          setIsGenerateLicenseOpen(false);
          setTargetAppForModal(undefined);
        }}
        onSuccess={loadData}
        apps={appsList}
        defaultAppId={targetAppForModal}
      />

      <AddHwidModal
        isOpen={isAddHwidOpen}
        onClose={() => {
          setIsAddHwidOpen(false);
          setTargetAppForModal(undefined);
        }}
        onSuccess={loadData}
        apps={appsList}
        defaultAppId={targetAppForModal}
      />
    </div>
  );
}
