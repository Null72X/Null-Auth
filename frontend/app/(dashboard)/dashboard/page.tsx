'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { fetchApi } from '@/lib/api';
import { formatRelativeTime } from '@/lib/time';
import { CreateAppModal } from '@/components/modals/CreateAppModal';
import { CreateLicenseModal } from '@/components/modals/CreateLicenseModal';
import { AddHwidModal } from '@/components/modals/AddHwidModal';
import { CreateUserModal } from '@/components/modals/CreateUserModal';
import {
  AppWindow,
  Key,
  ShieldCheck,
  Users,
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
  Search,
  User,
  Laptop,
  FileText,
  Info,
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
  totalUsers?: number;
  activeUsers?: number;
  recentApps: any[];
  recentLogs: any[];
}

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appsList, setAppsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Application Window Console State
  const [appFilterTab, setAppFilterTab] = useState<'ALL' | 'LICENSE' | 'HWID' | 'USER_AUTH'>('ALL');
  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);
  const [targetAppForModal, setTargetAppForModal] = useState<string | undefined>(undefined);

  // Live Stream State
  const [logsList, setLogsList] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CLIENT' | 'ADMIN' | 'THREATS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Helper Functions
  const parseLogDetails = (details: any) => {
    if (!details) return {};
    if (typeof details === 'object') return details;
    try {
      return JSON.parse(details);
    } catch {
      return { raw: details };
    }
  };

  const formatActionName = (action: string) => {
    if (!action) return 'System Event';
    switch (action) {
      case 'CLIENT_AUTH_SUCCESS':
        return 'User Authentication Success';
      case 'CLIENT_AUTH_FAILED':
        return 'User Authentication Failed';
      case 'CLIENT_FREE_TRIAL_USER_AUTH':
        return 'Free Trial Authentication';
      case 'CLIENT_HWID_BOUND':
        return 'HWID Bound to Account';
      case 'LICENSE_VALIDATE_SUCCESS':
      case 'LICENSE_VALIDATE':
        return 'License Key Verification';
      case 'LICENSE_VALIDATE_FAILED':
        return 'License Verification Failed';
      case 'HWID_CHECK_SUCCESS':
      case 'HWID_VALIDATE':
        return 'HWID Whitelist Verification';
      case 'HWID_CHECK_FAILED':
        return 'HWID Verification Failed';
      case 'LICENSE_GENERATE':
        return 'License Key Generated';
      case 'APP_CREATE':
        return 'Application Created';
      case 'USER_CREATE':
        return 'User Account Created';
      default:
        return action
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  // Modals
  const [isCreateAppOpen, setIsCreateAppOpen] = useState(false);
  const [isGenerateLicenseOpen, setIsGenerateLicenseOpen] = useState(false);
  const [isAddHwidOpen, setIsAddHwidOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);

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
      setAppsList(Array.isArray(appsRes.data) ? appsRes.data : appsRes.data.apps || []);
    }
    if (logsRes.success && logsRes.data) {
      setLogsList(Array.isArray(logsRes.data) ? logsRes.data : logsRes.data.logs || []);
    } else if (statsRes.success && statsRes.data?.recentLogs) {
      setLogsList(Array.isArray(statsRes.data.recentLogs) ? statsRes.data.recentLogs : []);
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
      if (selectedFilter === 'CLIENT' && log.actorType !== 'CLIENT') return false;
      if (selectedFilter === 'ADMIN' && log.actorType !== 'ADMIN') return false;
      if (selectedFilter === 'THREATS' && log.status !== 'FAILURE') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const detailsStr = typeof log.details === 'string' ? log.details.toLowerCase() : JSON.stringify(log.details || {}).toLowerCase();
        const actionStr = (log.action || '').toLowerCase();
        const ipStr = (log.ipAddress || '').toLowerCase();
        const actorStr = (log.actorType || '').toLowerCase();
        const appName = (appsList.find((a) => a.id === log.appId)?.name || log.appId || '').toLowerCase();

        return (
          actionStr.includes(q) ||
          ipStr.includes(q) ||
          actorStr.includes(q) ||
          appName.includes(q) ||
          detailsStr.includes(q)
        );
      }

      return true;
    });
  }, [logsList, selectedFilter, searchQuery, appsList]);

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
        title="Dashboard"
        subtitle="Platform telemetry, active client authentications, and system overview."
      />

      {/* Hero Welcome Banner */}
      <Card className="bg-zinc-950/80 border-zinc-800/80 p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Null Authentication Active</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Welcome back, Administrator
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl">
              Real-time administrative control center for client apps, license keys, machine hardware IDs, and live authentication telemetry.
            </p>
          </div>

          {/* Quick Control Shortcuts */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              onClick={() => setIsCreateAppOpen(true)}
              className="gap-1.5 text-xs font-bold h-8 px-3"
            >
              <Plus className="w-3.5 h-3.5" /> App
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsGenerateLicenseOpen(true)}
              className="gap-1.5 text-xs font-bold text-blue-300 hover:text-blue-200 h-8 px-3"
            >
              <Key className="w-3.5 h-3.5" /> License
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsAddHwidOpen(true)}
              className="gap-1.5 text-xs font-bold text-purple-300 hover:text-purple-200 h-8 px-3"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> HWID
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsCreateUserOpen(true)}
              className="gap-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200 h-8 px-3"
            >
              <Users className="w-3.5 h-3.5" /> User
            </Button>
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="flex items-center gap-3.5 bg-zinc-900/90 border-zinc-800/80">
          <div className="w-10 h-10 rounded-lg bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0">
            <AppWindow className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block truncate">Total Apps</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{isLoading ? '...' : stats?.totalApps || 0}</h4>
            <span className="text-[10px] text-emerald-400 font-medium block truncate">{stats?.activeApps || 0} Active</span>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 bg-zinc-900/90 border-zinc-800/80">
          <div className="w-10 h-10 rounded-lg bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block truncate">Active Licenses</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{isLoading ? '...' : stats?.activeLicenses || 0}</h4>
            <span className="text-[10px] text-zinc-500 font-medium block truncate">/ {stats?.totalLicenses || 0} Total</span>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 bg-zinc-900/90 border-zinc-800/80">
          <div className="w-10 h-10 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block truncate">Active HWIDs</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{isLoading ? '...' : stats?.activeHwids || 0}</h4>
            <span className="text-[10px] text-zinc-500 font-medium block truncate">/ {stats?.totalHwids || 0} Total</span>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 bg-zinc-900/90 border-zinc-800/80">
          <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block truncate">User Accounts</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{isLoading ? '...' : stats?.activeUsers || 0}</h4>
            <span className="text-[10px] text-zinc-500 font-medium block truncate">/ {stats?.totalUsers || 0} Total</span>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 bg-zinc-900/90 border-zinc-800/80">
          <div className="w-10 h-10 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block truncate">Expired Keys</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{isLoading ? '...' : stats?.expiredLicenses || 0}</h4>
            <span className="text-[10px] text-zinc-500 font-medium block truncate">Inactive / Expired</span>
          </div>
        </Card>
      </div>

      {/* Main Live Telemetry Section - Modern Card Window UI */}
      <div className="w-full">
        <Card className="space-y-5 animate-slide-up border-zinc-800/80 bg-zinc-950/80 shadow-xl p-5" style={{ animationDelay: '100ms' }}>
          {/* Header Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Live Authentication Stream
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-[10px] font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Real-time telemetry of authentication traffic, license verification, HWID authorization, and system logs.
                </p>
              </div>
            </div>

            {/* Controls Right */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Bar */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search logs by IP, user, key, HWID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Auto Refresh Toggle */}
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'btn-action text-xs text-white' : 'btn-action text-xs text-zinc-400'}
                title="Toggle 10-second automatic polling"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Auto: {autoRefresh ? 'ON' : 'OFF'}</span>
              </button>

              {/* Manual Refresh Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={loadLogs}
                disabled={isRefreshingLogs}
                className="gap-1.5 text-xs font-semibold h-8"
                title="Refresh Stream Now"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin text-red-400' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          {/* Telemetry Summary Stats Strip & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
            {/* Filter Tabs */}
            <div className="flex items-center p-1 bg-white/[0.04] border border-white/10 rounded-lg text-xs">
              {[
                { id: 'ALL', label: `All (${logsList.length})` },
                { id: 'CLIENT', label: 'Client Traffic' },
                { id: 'ADMIN', label: 'Admin Ops' },
                { id: 'THREATS', label: `Alerts (${logMetrics.blocked})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFilter(tab.id as any)}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    selectedFilter === tab.id
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick Metrics Pills */}
            <div className="flex items-center gap-3 shrink-0 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {logMetrics.passed} Passed ({logMetrics.passRate}%)
              </span>
              {logMetrics.blocked > 0 && (
                <span className="flex items-center gap-1.5 text-red-400 font-semibold">
                  <XCircle className="w-4 h-4 text-red-500" />
                  {logMetrics.blocked} Blocked
                </span>
              )}
            </div>
          </div>

          {/* Activity Log Feed Items */}
          <div className="space-y-3 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-zinc-400 animate-pulse flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 text-red-500 animate-spin" />
                <span>Loading activity log stream...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-500 space-y-1 bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800">
                <Info className="w-6 h-6 mx-auto text-zinc-600 mb-2" />
                <p className="font-semibold text-zinc-400">No telemetry events found</p>
                <p className="text-zinc-600 text-[11px]">
                  {searchQuery ? 'Try clearing your search query or switching filters.' : 'No activity logs recorded yet.'}
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const isFail = log.status === 'FAILURE';
                const details = parseLogDetails(log.details);
                const username = details.username || details.user || details.clientUser;
                const licenseKey = details.licenseKey || details.key;
                const hwid = details.hwid || details.hardwareId;
                const reason = details.reason || details.error || details.message;
                const matchedApp = appsList.find((a) => a.id === log.appId);

                return (
                  <div
                    key={log.id}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isFail
                        ? 'bg-red-950/10 border-red-900/40 hover:border-red-600/50 shadow-sm shadow-red-950/10'
                        : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    {/* Main Event Row */}
                    <div
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      {/* Left: Status Icon & Details */}
                      <div className="flex items-start gap-3 overflow-hidden">
                        <div className="mt-0.5 shrink-0">
                          {isFail ? (
                            <div className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400">
                              <XCircle className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 overflow-hidden">
                          {/* Event Title & Badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-zinc-100">
                              {formatActionName(log.action)}
                            </span>

                            {/* Raw Action Code Tag */}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                              {log.action}
                            </span>

                            {/* Actor Type Badge */}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                              log.actorType === 'ADMIN'
                                ? 'bg-purple-950/60 text-purple-400 border-purple-800/60'
                                : 'bg-blue-950/60 text-blue-400 border-blue-800/60'
                            }`}>
                              {log.actorType}
                            </span>

                            {/* Application Badge */}
                            {matchedApp && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800 flex items-center gap-1">
                                <AppWindow className="w-3 h-3 text-red-400" />
                                {matchedApp.name}
                              </span>
                            )}
                          </div>

                          {/* Secondary Event Meta Summary */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                            {username && (
                              <span className="flex items-center gap-1 text-zinc-300 font-medium">
                                <User className="w-3.5 h-3.5 text-emerald-400" />
                                User: <span className="text-white">{username}</span>
                              </span>
                            )}

                            {licenseKey && (
                              <span className="flex items-center gap-1 font-mono text-zinc-300">
                                <Key className="w-3.5 h-3.5 text-blue-400" />
                                Key: <span className="text-zinc-200">{licenseKey}</span>
                              </span>
                            )}

                            {hwid && (
                              <span className="flex items-center gap-1 font-mono text-zinc-400">
                                <Laptop className="w-3.5 h-3.5 text-purple-400" />
                                HWID: <span className="text-zinc-300 truncate max-w-[160px]">{hwid}</span>
                              </span>
                            )}

                            {log.ipAddress && (
                              <span className="flex items-center gap-1 text-zinc-400">
                                <Globe className="w-3.5 h-3.5 text-zinc-500" />
                                IP: {log.ipAddress}
                              </span>
                            )}

                            {isFail && reason && (
                              <span className="flex items-center gap-1 text-red-400 font-medium">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                {reason}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Timestamp & Toggle Arrow */}
                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800/60">
                        <span className="text-xs text-zinc-400 font-medium" title={new Date(log.createdAt).toLocaleString()}>
                          {formatRelativeTime(log.createdAt)}
                        </span>
                        <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail Window */}
                    {isExpanded && (
                      <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {/* Card 1: Event & App */}
                          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-zinc-500 block">Event & Application</span>
                            <div className="text-zinc-200 font-semibold">{formatActionName(log.action)}</div>
                            <div className="text-zinc-400 text-[11px] font-mono">{log.action}</div>
                            {matchedApp && (
                              <div className="text-red-400 font-medium text-[11px] pt-1">
                                App: {matchedApp.name} ({matchedApp.appId})
                              </div>
                            )}
                          </div>

                          {/* Card 2: Network & Client */}
                          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-zinc-500 block">Network & Device</span>
                            <div className="text-zinc-200 font-semibold flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-zinc-400" />
                              {log.ipAddress || 'Internal Request'}
                            </div>
                            {log.userAgent && (
                              <div className="text-zinc-400 text-[11px] truncate" title={log.userAgent}>
                                UA: {log.userAgent}
                              </div>
                            )}
                          </div>

                          {/* Card 3: Exact Timestamp */}
                          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-zinc-500 block">Log Timestamp & ID</span>
                            <div className="text-zinc-200 font-medium">{new Date(log.createdAt).toLocaleString()}</div>
                            <div className="text-zinc-500 font-mono text-[10px] truncate">ID: {log.id}</div>
                          </div>
                        </div>

                        {/* Full Parsed Payload Grid / JSON Inspector */}
                        {log.details && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                                Payload Details
                              </span>
                            </div>
                            <div className="p-3 rounded-lg bg-black/70 border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto">
                              <pre className="whitespace-pre-wrap text-emerald-400">
                                {(() => {
                                  try {
                                    const parsed = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                                    return JSON.stringify(parsed, null, 2);
                                  } catch {
                                    return String(log.details);
                                  }
                                })()}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
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

      <CreateUserModal
        isOpen={isCreateUserOpen}
        onClose={() => {
          setIsCreateUserOpen(false);
          setTargetAppForModal(undefined);
        }}
        onSuccess={loadData}
        apps={appsList}
        defaultAppId={targetAppForModal}
      />
    </div>
  );
}
