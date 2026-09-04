'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CreateAppModal } from '@/components/modals/CreateAppModal';
import { CreateLicenseModal } from '@/components/modals/CreateLicenseModal';
import { AddHwidModal } from '@/components/modals/AddHwidModal';
import { AppRecordsModal } from '@/components/modals/AppRecordsModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { Modal } from '@/components/ui/Modal';
import { fetchApi } from '@/lib/api';
import {
  Plus,
  AppWindow,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Pause,
  Play,
  Edit2,
  Copy,
  Check,
  Search,
  Users,
  Tag,
  Shield,
  Code,
  Sparkles,
  ListFilter,
  Download,
  Settings2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AppItem {
  id: string;
  appId: string;
  name: string;
  secret: string;
  type: 'LICENSE' | 'HWID';
  status: 'ACTIVE' | 'PAUSED';
  version: string;
  downloadUrl: string | null;
  freeTrialEnabled: boolean;
  freeTrialKey: string | null;
  createdAt: string;
  activeUsers: number;
  expiredUsers: number;
  totalUsers: number;
  lastActivity: string | null;
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LICENSE' | 'HWID'>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAppSecret, setSelectedAppSecret] = useState<AppItem | null>(null);
  const [appToDelete, setAppToDelete] = useState<AppItem | null>(null);
  const [appToEdit, setAppToEdit] = useState<AppItem | null>(null);
  const [editName, setEditName] = useState('');

  // Records View Modal State
  const [recordsApp, setRecordsApp] = useState<AppItem | null>(null);

  // Secret visibility toggle per card
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  // Version Checker Edit Modal
  const [appToEditVersion, setAppToEditVersion] = useState<AppItem | null>(null);
  const [editVersion, setEditVersion] = useState('1.0.0');
  const [editDownloadUrl, setEditDownloadUrl] = useState('');

  const [quickLicenseApp, setQuickLicenseApp] = useState<AppItem | null>(null);
  const [quickHwidApp, setQuickHwidApp] = useState<AppItem | null>(null);

  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);

  // Drag & Reorder State
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedOverId, setDraggedOverId] = useState<string | null>(null);

  const applySavedOrder = (loadedApps: AppItem[]): AppItem[] => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('null_auth_apps_order') : null;
      if (!saved) return loadedApps;
      const orderIds: string[] = JSON.parse(saved);
      if (!Array.isArray(orderIds) || orderIds.length === 0) return loadedApps;

      const map = new Map<string, AppItem>();
      loadedApps.forEach((a) => map.set(a.id, a));

      const ordered: AppItem[] = [];
      orderIds.forEach((id) => {
        const item = map.get(id);
        if (item) {
          ordered.push(item);
          map.delete(id);
        }
      });
      // Append any remaining apps
      map.forEach((item) => ordered.push(item));
      return ordered;
    } catch {
      return loadedApps;
    }
  };

  const saveOrder = (orderedApps: AppItem[]) => {
    try {
      if (typeof window !== 'undefined') {
        const orderIds = orderedApps.map((a) => a.id);
        localStorage.setItem('null_auth_apps_order', JSON.stringify(orderIds));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedOverId !== id) {
      setDraggedOverId(id);
    }
  };

  const handleDragLeave = () => {
    // Leave intact
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId;
    setDraggedId(null);
    setDraggedOverId(null);

    if (!sourceId || sourceId === targetId) return;

    const currentApps = [...apps];
    const sourceIndex = currentApps.findIndex((a) => a.id === sourceId);
    const targetIndex = currentApps.findIndex((a) => a.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const [movedApp] = currentApps.splice(sourceIndex, 1);
    currentApps.splice(targetIndex, 0, movedApp);

    setApps(currentApps);
    saveOrder(currentApps);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDraggedOverId(null);
  };

  const moveApp = (appId: string, direction: number) => {
    const visibleIndex = filteredApps.findIndex((a) => a.id === appId);
    if (visibleIndex === -1) return;
    const targetVisibleIndex = visibleIndex + direction;
    if (targetVisibleIndex < 0 || targetVisibleIndex >= filteredApps.length) return;

    const targetApp = filteredApps[targetVisibleIndex];

    const currentApps = [...apps];
    const sourceIdx = currentApps.findIndex((a) => a.id === appId);
    const targetIdx = currentApps.findIndex((a) => a.id === targetApp.id);

    if (sourceIdx === -1 || targetIdx === -1) return;

    const [movedApp] = currentApps.splice(sourceIdx, 1);
    currentApps.splice(targetIdx, 0, movedApp);

    setApps(currentApps);
    saveOrder(currentApps);
  };

  const loadApps = async () => {
    setIsLoading(true);
    const res = await fetchApi('/admin/apps');
    if (res.success && res.data) {
      setApps(applySavedOrder(res.data));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadApps();
  }, []);

  // Filtered Applications
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesSearch =
        app.name.toLowerCase().includes(search.toLowerCase()) ||
        app.appId.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || app.status === statusFilter;

      const matchesType =
        typeFilter === 'ALL' || app.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [apps, search, statusFilter, typeFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = apps.length;
    const licenseCount = apps.filter((a) => a.type === 'LICENSE').length;
    const hwidCount = apps.filter((a) => a.type === 'HWID').length;
    const totalActiveUsers = apps.reduce((acc, a) => acc + (a.activeUsers || 0), 0);
    return { total, licenseCount, hwidCount, totalActiveUsers };
  }, [apps]);

  const toggleRevealSecret = (appId: string) => {
    setRevealedSecrets((prev) => ({
      ...prev,
      [appId]: !prev[appId],
    }));
  };

  const handleToggleStatus = async (app: AppItem) => {
    const newStatus = app.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await fetchApi(`/admin/apps/${app.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    loadApps();
  };

  const handleToggleFreeTrial = async (app: AppItem) => {
    const newEnabled = !app.freeTrialEnabled;
    await fetchApi(`/admin/apps/${app.id}/free-trial`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: newEnabled }),
    });
    loadApps();
  };

  const handleRegenerateSecret = async (app: AppItem) => {
    const res = await fetchApi(`/admin/apps/${app.id}/regenerate-secret`, {
      method: 'POST',
    });
    if (res.success && res.data) {
      setSelectedAppSecret({ ...app, secret: res.data.secret });
      loadApps();
    }
  };

  const handleDeleteApp = async () => {
    if (!appToDelete) return;
    await fetchApi(`/admin/apps/${appToDelete.id}`, {
      method: 'DELETE',
    });
    setAppToDelete(null);
    loadApps();
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appToEdit) return;
    await fetchApi(`/admin/apps/${appToEdit.id}/name`, {
      method: 'PATCH',
      body: JSON.stringify({ name: editName }),
    });
    setAppToEdit(null);
    loadApps();
  };

  const handleUpdateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appToEditVersion) return;
    await fetchApi(`/admin/apps/${appToEditVersion.id}/version`, {
      method: 'PATCH',
      body: JSON.stringify({
        version: editVersion.trim(),
        downloadUrl: editDownloadUrl.trim() || null,
      }),
    });
    setAppToEditVersion(null);
    loadApps();
  };

  const copyAppId = (appId: string) => {
    navigator.clipboard.writeText(appId);
    setCopiedAppId(appId);
    setTimeout(() => setCopiedAppId(null), 2000);
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(secret);
    setTimeout(() => setCopiedSecret(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Header
          title="Applications Manager"
          subtitle="Create, configure, view all licenses and HWID records, enforce application versions, and manage access."
        />
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0 shadow-lg shadow-red-950/40">
          <Plus className="w-4 h-4" /> Create Application
        </Button>
      </div>

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-[7px] bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400">
            <AppWindow className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Applications</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{stats.total}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-[7px] bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">License Key Apps</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{stats.licenseCount}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-[7px] bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">HWID Whitelist Apps</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{stats.hwidCount}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-[7px] bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Active Users</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{stats.totalActiveUsers}</h4>
          </div>
        </Card>
      </div>

      {/* Control Bar: Search & Filter Pills */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search applications by name or App ID (e.g. NA-48392017)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[7px] pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/80 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-zinc-950 border border-zinc-800 rounded-[7px] text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-[5px] font-semibold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1 rounded-[5px] font-semibold transition-all ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('PAUSED')}
                className={`px-3 py-1 rounded-[5px] font-semibold transition-all ${
                  statusFilter === 'PAUSED'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Paused
              </button>
            </div>

            <div className="flex items-center p-1 bg-zinc-950 border border-zinc-800 rounded-[7px] text-xs">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1 rounded-[5px] font-semibold transition-all ${
                  typeFilter === 'ALL'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All Modes
              </button>
              <button
                onClick={() => setTypeFilter('LICENSE')}
                className={`px-3 py-1 rounded-[5px] font-semibold transition-all ${
                  typeFilter === 'LICENSE'
                    ? 'bg-blue-950 text-blue-400 border border-blue-800/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                License Key
              </button>
              <button
                onClick={() => setTypeFilter('HWID')}
                className={`px-3 py-1 rounded-[5px] font-semibold transition-all ${
                  typeFilter === 'HWID'
                    ? 'bg-purple-950 text-purple-400 border border-purple-800/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                HWID Whitelist
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Applications Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-zinc-500 animate-pulse">
          Loading applications...
        </div>
      ) : filteredApps.length === 0 ? (
        <Card className="py-16 text-center space-y-4">
          <AppWindow className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-zinc-200">No Applications Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {apps.length === 0
              ? "You haven't created any applications yet. Click 'Create Application' to get started."
              : 'No applications match your current search or filter criteria.'}
          </p>
          {apps.length === 0 && (
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 mt-2">
              <Plus className="w-4 h-4" /> Create Application
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApps.map((app, index) => {
            const userRatio =
              app.totalUsers > 0 ? Math.round((app.activeUsers / app.totalUsers) * 100) : 0;
            const isSecretRevealed = !!revealedSecrets[app.id];

            return (
              <div
                key={app.id}
                draggable
                onDragStart={(e) => handleDragStart(e, app.id)}
                onDragOver={(e) => handleDragOver(e, app.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, app.id)}
                onDragEnd={handleDragEnd}
                className={`transition-all duration-200 h-full flex flex-col ${
                  draggedOverId === app.id
                    ? 'ring-2 ring-red-500 rounded-xl scale-[1.02] shadow-xl shadow-red-950/50'
                    : ''
                } ${draggedId === app.id ? 'opacity-40 scale-[0.98]' : 'opacity-100'}`}
              >
                <Card
                  className="flex flex-col justify-between space-y-5 animate-slide-up group border-zinc-800/90 hover:border-red-500/50 bg-zinc-950/80 backdrop-blur-md shadow-xl h-full"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="space-y-4">
                    {/* App Header & Title */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white tracking-wide group-hover:text-red-400 transition-colors">
                            {app.name}
                          </h3>
                          <button
                            onClick={() => {
                              setAppToEdit(app);
                              setEditName(app.name);
                            }}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                            title="Edit Application Name"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge status={app.type} />
                          {/* Reorder / Arrange Widget */}
                          <div
                            className="inline-flex items-center gap-0.5 bg-zinc-900/90 border border-zinc-800/80 rounded px-1.5 py-0.5 text-zinc-400"
                            title="Drag card to reorder or use arrows"
                          >
                            <span className="cursor-grab active:cursor-grabbing p-0.5 hover:text-white" title="Drag to reorder">
                              <GripVertical className="w-3 h-3 text-zinc-400" />
                            </span>
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveApp(app.id, -1);
                              }}
                              className="p-0.5 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-500 transition-colors"
                              title="Move left"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={index === filteredApps.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveApp(app.id, 1);
                              }}
                              className="p-0.5 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-500 transition-colors"
                              title="Move right"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <Badge status={app.status} />

                      {/* ULTRA-PREMIUM VERSION CONTROL BUTTON */}
                      <button
                        onClick={() => {
                          setAppToEditVersion(app);
                          setEditVersion(app.version || '1.0.0');
                          setEditDownloadUrl(app.downloadUrl || '');
                        }}
                        className="group/ver relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-950/70 via-zinc-900 to-amber-950/50 hover:from-amber-900/80 hover:to-amber-900/60 text-[11px] font-mono font-extrabold text-amber-300 border border-amber-500/40 hover:border-amber-400 shadow-md shadow-amber-950/40 transition-all duration-200 hover:scale-105 active:scale-95"
                        title="Click to manage version enforcement & auto-update download link"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                        </span>
                        <Tag className="w-3 h-3 text-amber-400 group-hover/ver:rotate-12 transition-transform" />
                        <span className="tracking-wide">v{app.version || '1.0.0'}</span>
                        <Settings2 className="w-2.5 h-2.5 text-amber-400/70 opacity-0 group-hover/ver:opacity-100 transition-opacity ml-0.5" />
                      </button>
                    </div>
                  </div>

                  {/* HIGH-END APPLICATION CREDENTIALS BLOCK */}
                  <div className="p-3.5 rounded-[7px] bg-zinc-900/90 border border-zinc-800/80 space-y-2 font-mono text-xs shadow-inner">
                    {/* App ID Row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5 shrink-0">
                        <Key className="w-3 h-3 text-red-400" /> App ID
                      </span>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-red-400 font-bold truncate">{app.appId}</span>
                        <button
                          onClick={() => copyAppId(app.appId)}
                          className="p-1 rounded-[5px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0 border border-zinc-800"
                          title="Copy App ID"
                        >
                          {copiedAppId === app.appId ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* App Secret Row */}
                    <div className="flex items-center justify-between gap-2 border-t border-zinc-800/90 pt-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5 shrink-0">
                        <Shield className="w-3 h-3 text-amber-400" /> Secret Key
                      </span>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-zinc-300 font-mono text-[11px] truncate max-w-[130px]">
                          {isSecretRevealed
                            ? app.secret
                            : `${app.secret.slice(0, 6)}••••••••`}
                        </span>
                        <button
                          onClick={() => toggleRevealSecret(app.id)}
                          className="p-1 rounded-[5px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0 border border-zinc-800"
                          title={isSecretRevealed ? 'Hide Secret' : 'Reveal Secret'}
                        >
                          {isSecretRevealed ? (
                            <EyeOff className="w-3 h-3 text-amber-400" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={() => copySecret(app.secret)}
                          className="p-1 rounded-[5px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0 border border-zinc-800"
                          title="Copy Secret Key"
                        >
                          {copiedSecret === app.secret ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Free Trial Mode Toggle Block */}
                  <div className="p-3 rounded-[7px] bg-zinc-900/90 border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Free Trial Mode
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          {app.type === 'LICENSE'
                            ? (app.freeTrialEnabled ? 'Active: Universal Free Trial Key' : 'Enable to generate free trial key')
                            : (app.freeTrialEnabled ? 'Active: All devices allowed' : 'Enable to allow all devices')}
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggleFreeTrial(app)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          app.freeTrialEnabled ? 'bg-emerald-500' : 'bg-zinc-800'
                        }`}
                        title={app.freeTrialEnabled ? 'Click to Disable Free Trial' : 'Click to Enable Free Trial (Generates fresh key)'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            app.freeTrialEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Free Trial Active Banner */}
                    {app.freeTrialEnabled && (
                      <div className="p-2 rounded-[5px] bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-between gap-2 text-xs mt-1">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          <span className="text-emerald-300 font-mono font-bold truncate text-[11px]">
                            {app.type === 'LICENSE' ? (app.freeTrialKey || 'FREE-TRIAL-ACTIVE') : 'FREE TRIAL: All HWIDs Authorized'}
                          </span>
                        </div>

                        {app.type === 'LICENSE' && app.freeTrialKey && (
                          <button
                            onClick={() => copySecret(app.freeTrialKey!)}
                            className="p-1 rounded-[4px] bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 transition-colors shrink-0 text-[10px] font-bold flex items-center gap-1"
                            title="Copy Master Free Trial Key"
                          >
                            {copiedSecret === app.freeTrialKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy Key
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Active User Progress Meter & Records Count */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-zinc-500" /> Active Users
                      </span>
                      <span className="text-emerald-400">
                        {app.activeUsers} <span className="text-zinc-500 font-normal">/ {app.totalUsers} Total</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-[7px] bg-zinc-950 overflow-hidden border border-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-[7px] transition-all duration-500"
                        style={{ width: `${userRatio}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 border-t border-zinc-800/80 space-y-2">
                  {/* Primary Quick Action Button */}
                  {app.type === 'LICENSE' ? (
                    <Button
                      size="sm"
                      onClick={() => setQuickLicenseApp(app)}
                      className="w-full gap-2 text-xs font-bold btn-red-gradient shadow-md shadow-red-950/40"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Generate License Keys
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setQuickHwidApp(app)}
                      className="w-full gap-2 text-xs font-bold bg-gradient-to-r from-purple-950 via-purple-900 to-purple-800 hover:from-purple-900 hover:to-purple-700 text-white border border-purple-500/40 shadow-md shadow-purple-950/40"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Authorize HWID User
                    </Button>
                  )}

                  {/* View All Licenses / HWIDs Button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setRecordsApp(app)}
                    className="w-full gap-2 border-zinc-800 hover:border-amber-500/40 bg-zinc-900/90 hover:bg-zinc-800 text-xs font-mono font-bold text-amber-400 group/rec"
                  >
                    <ListFilter className="w-3.5 h-3.5 text-amber-400 group-hover/rec:rotate-180 transition-transform duration-300" />
                    <span>{app.type === 'LICENSE' ? 'Show All Licenses' : 'Show All HWID Whitelists'}</span>
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px]">
                      {app.totalUsers}
                    </span>
                  </Button>

                  {/* Secondary Icon Actions */}
                  <div className="flex items-center justify-between gap-2 text-xs pt-1">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedAppSecret(app)}
                        title="View Full Credentials & Integration Info"
                      >
                        <Code className="w-3.5 h-3.5 mr-1 text-red-400" /> Credentials
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRegenerateSecret(app)}
                        title="Regenerate Secret Key"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant={app.status === 'ACTIVE' ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleStatus(app)}
                      >
                        {app.status === 'ACTIVE' ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-amber-400" />
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                          </>
                        )}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setAppToDelete(app)}
                        title="Delete Application"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          );
          })}
        </div>
      )}

      {/* View All Licenses & HWIDs Modal */}
      <AppRecordsModal
        isOpen={!!recordsApp}
        onClose={() => setRecordsApp(null)}
        app={recordsApp}
        onRefreshApps={loadApps}
      />

      {/* Create App Modal */}
      <CreateAppModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadApps}
      />

      {/* Quick Generate License Modal */}
      {quickLicenseApp && (
        <CreateLicenseModal
          isOpen={!!quickLicenseApp}
          onClose={() => setQuickLicenseApp(null)}
          onSuccess={loadApps}
          apps={apps}
          defaultAppId={quickLicenseApp.id}
        />
      )}

      {/* Quick Authorize HWID Modal */}
      {quickHwidApp && (
        <AddHwidModal
          isOpen={!!quickHwidApp}
          onClose={() => setQuickHwidApp(null)}
          onSuccess={loadApps}
          apps={apps}
          defaultAppId={quickHwidApp.id}
        />
      )}

      {/* View Full Credentials Modal */}
      <Modal
        isOpen={!!selectedAppSecret}
        onClose={() => setSelectedAppSecret(null)}
        title={`Application Credentials — ${selectedAppSecret?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">
            Use these credentials to connect your desktop client (C#, C++, or Python) to Null-Auth Private Cloud API.
          </p>

          {/* Styled Credentials Panel */}
          <div className="p-4 rounded-[7px] bg-zinc-950 border border-zinc-800 space-y-3 font-mono text-xs">
            {/* App ID */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Application ID</span>
              <div className="flex items-center gap-2">
                <span className="text-red-400 font-bold">{selectedAppSecret?.appId}</span>
                <button
                  onClick={() => copyAppId(selectedAppSecret?.appId || '')}
                  className="p-1 rounded-[5px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                  title="Copy App ID"
                >
                  {copiedAppId === selectedAppSecret?.appId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Secret Key */}
            <div className="flex items-center justify-between gap-2 border-t border-zinc-900 pt-2.5">
              <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Secret API Key</span>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold truncate max-w-[200px]">{selectedAppSecret?.secret}</span>
                <button
                  onClick={() => copySecret(selectedAppSecret?.secret || '')}
                  className="p-1 rounded-[5px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                  title="Copy Secret Key"
                >
                  {copiedSecret === selectedAppSecret?.secret ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Version */}
            <div className="flex items-center justify-between gap-2 border-t border-zinc-900 pt-2.5">
              <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Required Version</span>
              <span className="text-amber-400 font-bold">v{selectedAppSecret?.version || '1.0.0'}</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setSelectedAppSecret(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit App Name Modal */}
      <Modal isOpen={!!appToEdit} onClose={() => setAppToEdit(null)} title="Edit Application Name">
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              New Application Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[7px] px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={() => setAppToEdit(null)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Edit App Version & Download URL Modal */}
      <Modal
        isOpen={!!appToEditVersion}
        onClose={() => setAppToEditVersion(null)}
        title={`Version Control & Auto-Update — ${appToEditVersion?.name}`}
      >
        <form onSubmit={handleUpdateVersion} className="space-y-4">
          <p className="text-xs text-zinc-400">
            Enforce client application versions. Any client attempting to authenticate with a version different from the required version will be blocked from running.
          </p>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Required App Version (e.g. 1.0.0, 1.2.0, 2.0.0) *
            </label>
            <input
              type="text"
              value={editVersion}
              onChange={(e) => setEditVersion(e.target.value)}
              required
              placeholder="e.g. 1.0.0"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[7px] px-3.5 py-2.5 text-sm font-mono text-amber-400 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Optional Update Download URL
            </label>
            <input
              type="text"
              value={editDownloadUrl}
              onChange={(e) => setEditDownloadUrl(e.target.value)}
              placeholder="https://example.com/downloads/v1.2.0.exe"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[7px] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Returned in error response when an outdated client attempts to log in.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={() => setAppToEditVersion(null)}>
              Cancel
            </Button>
            <Button type="submit">Save Required Version</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!appToDelete}
        onClose={() => setAppToDelete(null)}
        onConfirm={handleDeleteApp}
        title="Delete Application"
        message={`Are you sure you want to delete application '${appToDelete?.name}' (${appToDelete?.appId})? This will permanently delete all associated licenses, HWIDs, and authentication data.`}
        confirmText="Delete Application"
      />
    </div>
  );
}
