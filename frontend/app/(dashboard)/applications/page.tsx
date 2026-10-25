'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CreateAppModal } from '@/components/modals/CreateAppModal';
import { CreateLicenseModal } from '@/components/modals/CreateLicenseModal';
import { AddHwidModal } from '@/components/modals/AddHwidModal';
import { CreateUserModal } from '@/components/modals/CreateUserModal';
import { AppRecordsModal } from '@/components/modals/AppRecordsModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { EditAppModal } from '@/components/modals/EditAppModal';
import { ConfigureTrialModal } from '@/components/modals/ConfigureTrialModal';
import { SdkSnippetModal } from '@/components/modals/SdkSnippetModal';
import { Modal } from '@/components/ui/Modal';
import { ExpirationCountdown } from '@/components/ui/ExpirationCountdown';
import { fetchApi } from '@/lib/api';
import {
  Plus,
  AppWindow,
  Key,
  ShieldCheck,
  User,
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
  UserCheck,
  Activity,
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
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';

interface AppItem {
  id: string;
  appId: string;
  name: string;
  secret: string;
  type: 'LICENSE' | 'HWID' | 'USER_AUTH';
  status: 'ACTIVE' | 'PAUSED';
  version: string;
  downloadUrl: string | null;
  freeTrialEnabled: boolean;
  freeTrialKey: string | null;
  freeTrialPassword?: string | null;
  freeTrialExpiresAt?: string | null;
  freeTrialRemainingDays?: number;
  discordWebhookUrl?: string | null;
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
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LICENSE' | 'HWID' | 'USER_AUTH'>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAppSecret, setSelectedAppSecret] = useState<AppItem | null>(null);
  const [appToDelete, setAppToDelete] = useState<AppItem | null>(null);
  const [appToEdit, setAppToEdit] = useState<AppItem | null>(null);
  const [editName, setEditName] = useState('');

  // Free Trial Configure Modal State
  const [trialConfigApp, setTrialConfigApp] = useState<AppItem | null>(null);

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
  const [quickUserApp, setQuickUserApp] = useState<AppItem | null>(null);

  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [copiedName, setCopiedName] = useState(false);
  const [copiedVersion, setCopiedVersion] = useState(false);
  const [modalShowSecret, setModalShowSecret] = useState(false);
  const [modalShowSnippet, setModalShowSnippet] = useState(false);

  // View Mode: 'grid' or 'table'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // SDK Snippet Modal State
  const [snippetApp, setSnippetApp] = useState<AppItem | null>(null);

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
      const list = Array.isArray(res.data) ? res.data : res.data.apps || [];
      setApps(applySavedOrder(list));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadApps();
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('null_auth_apps_view_mode');
      if (savedView === 'grid' || savedView === 'table') {
        setViewMode(savedView as 'grid' | 'table');
      }
    }
  }, []);

  const switchViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('null_auth_apps_view_mode', mode);
    }
  };

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
    const userAuthCount = apps.filter((a) => a.type === 'USER_AUTH').length;
    const totalActiveUsers = apps.reduce((acc, a) => acc + (a.activeUsers || 0), 0);
    return { total, licenseCount, hwidCount, userAuthCount, totalActiveUsers };
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

  const handleToggleFreeTrial = (app: AppItem) => {
    setTrialConfigApp(app);
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
          title="Applications"
          subtitle="Configure authentication architecture, protection modes, client versions, and free trials."
        />
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0 shadow-lg shadow-red-950/40">
          <Plus className="w-4 h-4" /> Create Application
        </Button>
      </div>

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card
          onClick={() => setTypeFilter('ALL')}
          className={`flex items-center gap-4 bg-zinc-900/90 border-zinc-800 cursor-pointer transition-all active:scale-[0.98] ${
            typeFilter === 'ALL' ? 'ring-1 ring-zinc-600 bg-zinc-900' : 'hover:border-zinc-700'
          }`}
          title="Filter: All Applications"
        >
          <div className="w-11 h-11 rounded-[7px] bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400">
            <AppWindow className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Applications</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{stats.total}</h4>
          </div>
        </Card>

        <Card
          onClick={() => setTypeFilter(typeFilter === 'LICENSE' ? 'ALL' : 'LICENSE')}
          className={`flex items-center gap-4 bg-zinc-900/90 border-zinc-800 cursor-pointer transition-all active:scale-[0.98] ${
            typeFilter === 'LICENSE' ? 'ring-1 ring-blue-500/60 bg-blue-950/20 border-blue-900/50' : 'hover:border-blue-900/60'
          }`}
          title="Filter: License Key Apps"
        >
          <div className="w-11 h-11 rounded-[7px] bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">License Key Apps</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{stats.licenseCount}</h4>
          </div>
        </Card>

        <Card
          onClick={() => setTypeFilter(typeFilter === 'HWID' ? 'ALL' : 'HWID')}
          className={`flex items-center gap-4 bg-zinc-900/90 border-zinc-800 cursor-pointer transition-all active:scale-[0.98] ${
            typeFilter === 'HWID' ? 'ring-1 ring-purple-500/60 bg-purple-950/20 border-purple-900/50' : 'hover:border-purple-900/60'
          }`}
          title="Filter: HWID Whitelist Apps"
        >
          <div className="w-11 h-11 rounded-[7px] bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">HWID Whitelist Apps</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{stats.hwidCount}</h4>
          </div>
        </Card>

        <Card
          onClick={() => setTypeFilter(typeFilter === 'USER_AUTH' ? 'ALL' : 'USER_AUTH')}
          className={`flex items-center gap-4 bg-zinc-900/90 border-zinc-800 cursor-pointer transition-all active:scale-[0.98] ${
            typeFilter === 'USER_AUTH' ? 'ring-1 ring-cyan-500/60 bg-cyan-950/20 border-cyan-900/50' : 'hover:border-cyan-900/60'
          }`}
          title="Filter: User & Pass Apps"
        >
          <div className="w-11 h-11 rounded-[7px] bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">User & Pass Apps</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{stats.userAuthCount}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-[7px] bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
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
              placeholder="Search applications by name or App ID (e.g. 48392017)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[7px] pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/80 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-white/[0.04] border border-white/10 rounded-[8px] text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-[5px] font-semibold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white/[0.14] text-white shadow-sm border border-white/20'
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

            <div className="flex items-center p-1 bg-white/[0.04] border border-white/10 rounded-[8px] text-xs">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1 rounded-[5px] font-semibold transition-all ${
                  typeFilter === 'ALL'
                    ? 'bg-white/[0.14] text-white shadow-sm border border-white/20'
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
              <button
                onClick={() => setTypeFilter('USER_AUTH')}
                className={`px-3 py-1 rounded-[5px] font-semibold transition-all ${
                  typeFilter === 'USER_AUTH'
                    ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                User & Pass
              </button>
            </div>

            {/* View Mode: Grid vs Table */}
            <div className="flex items-center p-1 bg-white/[0.04] border border-white/10 rounded-[8px] text-xs">
              <button
                type="button"
                onClick={() => switchViewMode('grid')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] font-semibold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white/[0.14] text-white shadow-sm border border-white/20'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => switchViewMode('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] font-semibold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white/[0.14] text-white shadow-sm border border-white/20'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Compact Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
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
      ) : viewMode === 'grid' ? (
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
                  className="flex flex-col justify-between space-y-4 animate-slide-up border-zinc-800/80 hover:border-zinc-700 bg-zinc-950/80 shadow-lg h-full"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="space-y-3.5">
                    {/* App Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-white tracking-wide truncate">
                            {app.name}
                          </h3>
                          <button
                            onClick={() => {
                              setAppToEdit(app);
                              setEditName(app.name);
                            }}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 shrink-0"
                            title="Edit Application Name"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge status={app.type} />
                          <Badge status={app.status} />
                        </div>
                      </div>

                      {/* Clean Version Button */}
                      <button
                        onClick={() => {
                          setAppToEditVersion(app);
                          setEditVersion(app.version || '1.0.0');
                          setEditDownloadUrl(app.downloadUrl || '');
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 text-[11px] font-mono font-bold text-amber-400 transition-colors shrink-0"
                        title="Click to edit required version & download link"
                      >
                        <Tag className="w-3 h-3 text-amber-400" />
                        <span>v{app.version || '1.0.0'}</span>
                      </button>
                    </div>

                    {/* Clean Credentials Box */}
                    <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-xs font-mono">
                      {/* App ID */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-400 font-sans font-medium flex items-center gap-1.5 shrink-0">
                          <Key className="w-3.5 h-3.5 text-red-400" /> App ID
                        </span>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-red-400 font-bold truncate">{app.appId}</span>
                          <button
                            onClick={() => copyAppId(app.appId)}
                            className="btn-action shrink-0"
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

                      {/* Secret Key */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
                        <span className="text-[11px] text-zinc-400 font-sans font-medium flex items-center gap-1.5 shrink-0">
                          <Shield className="w-3.5 h-3.5 text-amber-400" /> Secret Key
                        </span>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-amber-300 font-bold truncate max-w-[150px]">
                            {isSecretRevealed ? app.secret : '••••••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealSecret(app.id)}
                            className="btn-action shrink-0"
                            title={isSecretRevealed ? 'Hide Secret' : 'Reveal Secret'}
                          >
                            {isSecretRevealed ? (
                              <EyeOff className="w-3 h-3 text-amber-400" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => copySecret(app.secret)}
                            className="btn-action shrink-0"
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

                    {/* Free Trial Section (NO TOGGLE - Clean Button Controls) */}
                    {!app.freeTrialEnabled ? (
                      <div className="p-3 rounded-lg bg-zinc-900/40 border border-dashed border-zinc-800 flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-zinc-500" /> Free Trial
                          </div>
                          <p className="text-[11px] text-zinc-500">Disabled for this app</p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setTrialConfigApp(app)}
                          className="text-xs font-bold gap-1.5 text-amber-400 hover:text-amber-300 border-zinc-800 hover:border-amber-500/50 h-8"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Enable Free Trial
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-xs font-bold text-emerald-300">Free Trial Active</span>
                            <ExpirationCountdown
                              expiresAt={app.freeTrialExpiresAt}
                              remainingDays={app.freeTrialRemainingDays}
                              badge
                              compact
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setTrialConfigApp(app)}
                            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-bold transition-colors flex items-center gap-1"
                            title="Edit Free Trial Settings"
                          >
                            <Settings2 className="w-3 h-3 text-amber-400" />
                            <span>Configure</span>
                          </button>
                        </div>

                        {/* Credentials or Key Preview */}
                        <div className="flex items-center justify-between gap-2 p-2 rounded bg-zinc-950/80 border border-zinc-800/80 text-xs font-mono">
                          <span className="text-emerald-300 font-bold truncate">
                            {app.type === 'LICENSE'
                              ? (app.freeTrialKey || 'TRIAL-ACTIVE')
                              : app.type === 'USER_AUTH'
                              ? `${app.freeTrialKey || 'trial_user'}:${app.freeTrialPassword || 'trial123'}`
                              : 'Universal HWID Whitelist Bypass (All Devices)'}
                          </span>
                          {app.type !== 'HWID' && app.freeTrialKey && (
                            <button
                              type="button"
                              onClick={() => {
                                const val = app.type === 'LICENSE'
                                  ? app.freeTrialKey!
                                  : `${app.freeTrialKey}:${app.freeTrialPassword || 'trial123'}`;
                                copySecret(val);
                              }}
                              className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 shrink-0 transition-colors"
                              title="Copy Trial Credentials"
                            >
                              {copiedSecret === (app.type === 'LICENSE' ? app.freeTrialKey : `${app.freeTrialKey}:${app.freeTrialPassword || 'trial123'}`) ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Active User Progress */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-zinc-400 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-zinc-500" /> Users & Records
                        </span>
                        <span className="text-emerald-400 font-mono">
                          {app.activeUsers} <span className="text-zinc-500 font-normal">/ {app.totalUsers} Total</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${userRatio}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Primary Action Button */}
                      {app.type === 'LICENSE' ? (
                        <Button
                          size="sm"
                          onClick={() => setQuickLicenseApp(app)}
                          className="h-8 gap-1.5 text-xs font-bold justify-center"
                          title="Generate License Key"
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Create License</span>
                        </Button>
                      ) : app.type === 'USER_AUTH' ? (
                        <Button
                          size="sm"
                          onClick={() => setQuickUserApp(app)}
                          className="h-8 gap-1.5 text-xs font-bold justify-center"
                          title="Create User Account"
                        >
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Create User</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setQuickHwidApp(app)}
                          className="h-8 gap-1.5 text-xs font-bold justify-center"
                          title="Authorize HWID"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Add HWID</span>
                        </Button>
                      )}

                      {/* View Records Button */}
                      <button
                        onClick={() => setRecordsApp(app)}
                        className="btn-action btn-action-amber h-8 px-3 text-xs font-bold justify-center"
                        title="View All Records"
                      >
                        <ListFilter className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Records ({app.totalUsers})</span>
                      </button>
                    </div>

                    {/* Secondary Action Row */}
                    <div className="flex items-center justify-between gap-1 pt-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSnippetApp(app)}
                          className="btn-action text-xs"
                          title="Developer SDK Integration Snippets"
                        >
                          <Code className="w-3 h-3 text-red-400" />
                          <span>SDK</span>
                        </button>
                        <button
                          onClick={() => setSelectedAppSecret(app)}
                          className="btn-action text-xs"
                          title="View Full Credentials & Keys"
                        >
                          <Key className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setAppToEdit(app)}
                          className="btn-action text-xs"
                          title="Application Settings"
                        >
                          <Settings2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(app)}
                          className={app.status === 'ACTIVE' ? 'btn-action text-xs' : 'btn-action btn-action-amber text-xs'}
                          title={app.status === 'ACTIVE' ? 'Pause Application' : 'Activate Application'}
                        >
                          {app.status === 'ACTIVE' ? (
                            <Pause className="w-3 h-3 text-amber-400" />
                          ) : (
                            <Play className="w-3 h-3 text-emerald-400" />
                          )}
                        </button>
                        <button
                          onClick={() => setAppToDelete(app)}
                          className="btn-action btn-action-danger text-xs"
                          title="Delete Application"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
            </div>
          );
          })}
        </div>
      ) : (
        /* Compact Table View */
        <Card className="p-0 overflow-hidden border-zinc-800/80 bg-zinc-950 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-900/90 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="py-3.5 px-4">Application</th>
                  <th className="py-3.5 px-4">Mode</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Version</th>
                  <th className="py-3.5 px-4">Active Users</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredApps.map((app) => {
                  const userRatio =
                    app.totalUsers > 0 ? Math.round((app.activeUsers / app.totalUsers) * 100) : 0;
                  return (
                    <tr key={app.id} className="hover:bg-zinc-900/40 transition-colors">
                      {/* Application Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[6px] bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                            <AppWindow className="w-4 h-4 text-red-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                              <span>{app.name}</span>
                              <button
                                onClick={() => {
                                  setAppToEdit(app);
                                  setEditName(app.name);
                                }}
                                className="text-zinc-500 hover:text-zinc-300 p-0.5"
                                title="Edit App Name"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 mt-0.5">
                              <span>{app.appId}</span>
                              <button
                                onClick={() => copyAppId(app.appId)}
                                className="hover:text-zinc-300 transition-colors"
                                title="Copy App ID"
                              >
                                {copiedAppId === app.appId ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            {app.freeTrialEnabled ? (
                              <button
                                type="button"
                                onClick={() => setTrialConfigApp(app)}
                                className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/40 text-[10px] font-mono text-emerald-300 transition-colors cursor-pointer"
                                title="Click to view or edit Free Trial configuration"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>
                                  Trial Active (
                                  <ExpirationCountdown
                                    expiresAt={app.freeTrialExpiresAt}
                                    remainingDays={app.freeTrialRemainingDays}
                                    compact
                                    inline
                                  />
                                  )
                                </span>
                                <Settings2 className="w-2.5 h-2.5 text-emerald-400/70" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setTrialConfigApp(app)}
                                className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
                                title="Click to enable Free Trial"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                                <span>+ Free Trial</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Mode Badge */}
                      <td className="py-3.5 px-4">
                        <Badge status={app.type} />
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Badge status={app.status} />
                          <button
                            onClick={() => handleToggleStatus(app)}
                            className="p-1 rounded-[5px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            title={app.status === 'ACTIVE' ? 'Pause Application' : 'Activate Application'}
                          >
                            {app.status === 'ACTIVE' ? (
                              <Pause className="w-3 h-3 text-amber-400" />
                            ) : (
                              <Play className="w-3 h-3 text-emerald-400" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Version */}
                      <td className="py-3.5 px-4 font-mono">
                        <button
                          onClick={() => {
                            setAppToEditVersion(app);
                            setEditVersion(app.version || '1.0.0');
                            setEditDownloadUrl(app.downloadUrl || '');
                          }}
                          className="px-2 py-0.5 rounded-[5px] bg-amber-950/40 border border-amber-800/40 hover:border-amber-500/60 text-[11px] text-amber-400 hover:text-amber-300 font-bold transition-all"
                          title="Click to edit required version"
                        >
                          v{app.version || '1.0.0'}
                        </button>
                      </td>

                      {/* Active Users */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-emerald-400 font-bold">{app.activeUsers}</span>
                            <span className="text-zinc-500">/ {app.totalUsers} Total</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${userRatio}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* SDK Code Snippet */}
                          <button
                            onClick={() => setSnippetApp(app)}
                            className="btn-action text-xs"
                            title="Developer SDK Integration Snippets"
                          >
                            <Code className="w-3 h-3 text-red-400" />
                            <span>SDK</span>
                          </button>

                          {/* Records */}
                          <button
                            onClick={() => setRecordsApp(app)}
                            className="btn-action btn-action-amber text-xs font-mono font-bold"
                            title={app.type === 'LICENSE' ? 'Show All Licenses' : 'Show All HWID Whitelists'}
                          >
                            <ListFilter className="w-3 h-3" />
                            <span>{app.totalUsers}</span>
                          </button>

                          {/* Edit Modal */}
                          <button
                            onClick={() => setAppToEdit(app)}
                            className="btn-action text-xs"
                            title="Edit Application Settings"
                          >
                            <Settings2 className="w-3 h-3" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setAppToDelete(app)}
                            className="btn-action btn-action-danger text-xs"
                            title="Delete Application"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Developer SDK Snippets Modal */}
      <SdkSnippetModal
        isOpen={!!snippetApp}
        onClose={() => setSnippetApp(null)}
        app={snippetApp}
      />

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

      {/* Quick Create User Account Modal */}
      {quickUserApp && (
        <CreateUserModal
          isOpen={!!quickUserApp}
          onClose={() => setQuickUserApp(null)}
          onSuccess={loadApps}
          apps={apps}
          defaultAppId={quickUserApp.id}
        />
      )}

      {/* View Full Credentials Modal */}
      <Modal
        isOpen={!!selectedAppSecret}
        onClose={() => setSelectedAppSecret(null)}
        title="Application Credentials"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800/80">
            <p className="text-xs text-zinc-400">
              Simply replace the placeholder code in the example with these
            </p>

            {/* Display Code Snippet Toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-300 select-none shrink-0">
              <button
                type="button"
                role="switch"
                aria-checked={modalShowSnippet}
                onClick={() => setModalShowSnippet(!modalShowSnippet)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  modalShowSnippet ? 'bg-red-500' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    modalShowSnippet ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="font-semibold text-zinc-300">Display Code Snippet</span>
            </label>
          </div>

          {!modalShowSnippet ? (
            <div className="space-y-3">
              {/* Box 1: APPLICATION NAME */}
              <div className="p-3.5 rounded-[9px] bg-zinc-950 border border-zinc-800/90 relative group hover:border-zinc-700 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Application Name
                  </span>
                  <button
                    onClick={() => {
                      if (!selectedAppSecret) return;
                      navigator.clipboard.writeText(selectedAppSecret.name);
                      setCopiedName(true);
                      setTimeout(() => setCopiedName(false), 2000);
                    }}
                    className="p-1 rounded text-zinc-500 hover:text-white transition-colors"
                    title="Copy Application Name"
                  >
                    {copiedName ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="mt-1 text-sm font-bold text-white tracking-wide">
                  {selectedAppSecret?.name}
                </div>
              </div>

              {/* Box 2: APPLICATION ID */}
              <div className="p-3.5 rounded-[9px] bg-zinc-950 border border-zinc-800/90 relative group hover:border-zinc-700 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Application ID
                  </span>
                  <button
                    onClick={() => copyAppId(selectedAppSecret?.appId || '')}
                    className="p-1 rounded text-zinc-500 hover:text-white transition-colors"
                    title="Copy Application ID"
                  >
                    {copiedAppId === selectedAppSecret?.appId ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="mt-1 text-sm font-mono font-bold text-red-400">
                  {selectedAppSecret?.appId}
                </div>
              </div>

              {/* Box 3: APPLICATION SECRET (SHOWS FULL SECRET ON TAP) */}
              <div className="p-3.5 rounded-[9px] bg-zinc-950 border border-zinc-800/90 relative group hover:border-zinc-700 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Application Secret
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setModalShowSecret(!modalShowSecret)}
                      className="p-1 rounded text-zinc-500 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-semibold"
                      title={modalShowSecret ? 'Hide Secret Key' : 'Show Full Secret Key'}
                    >
                      {modalShowSecret ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-amber-400 text-[10px]">Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-zinc-400 text-[10px]">Show Key</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => copySecret(selectedAppSecret?.secret || '')}
                      className="p-1 rounded text-zinc-500 hover:text-white transition-colors"
                      title="Copy Secret Key"
                    >
                      {copiedSecret === selectedAppSecret?.secret ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Secret container: shows complete key with break-all select-all when tapped */}
                <div className="mt-2 p-2.5 rounded-[6px] bg-zinc-900/90 border border-zinc-800/80">
                  <span
                    className={`font-mono text-xs block select-all transition-all ${
                      modalShowSecret
                        ? 'text-amber-300 font-bold break-all leading-relaxed'
                        : 'text-zinc-600 tracking-widest blur-[3px] select-none hover:blur-none'
                    }`}
                  >
                    {modalShowSecret
                      ? selectedAppSecret?.secret
                      : '••••••••••••••••••••••••••••••••••••••••••••••••'}
                  </span>
                </div>
              </div>

              {/* Box 4: APPLICATION VERSION */}
              <div className="p-3.5 rounded-[9px] bg-zinc-950 border border-zinc-800/90 relative group hover:border-zinc-700 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Application Version
                  </span>
                  <button
                    onClick={() => {
                      if (!selectedAppSecret) return;
                      navigator.clipboard.writeText(selectedAppSecret.version || '1.0');
                      setCopiedVersion(true);
                      setTimeout(() => setCopiedVersion(false), 2000);
                    }}
                    className="p-1 rounded text-zinc-500 hover:text-white transition-colors"
                    title="Copy Version"
                  >
                    {copiedVersion ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="mt-1 text-sm font-mono font-bold text-zinc-200">
                  {selectedAppSecret?.version || '1.0'}
                </div>
              </div>
            </div>
          ) : (
            /* Inline Snippet Preview When Switch is ON */
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 bg-zinc-900/90 border border-zinc-800 rounded-[7px] text-xs">
                <span className="text-zinc-400 font-medium">Pre-filled SDK Code:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!selectedAppSecret) return;
                    setSnippetApp(selectedAppSecret);
                    setSelectedAppSecret(null);
                  }}
                  className="h-6 px-2 text-[11px] gap-1"
                >
                  <Code className="w-3 h-3 text-red-400" />
                  <span>Open Full Multi-Language SDK</span>
                </Button>
              </div>
              <pre className="p-4 rounded-[8px] bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed max-h-[280px]">
                <code>{`// Null-Auth Quick Authentication
var auth = new NullAuth(
    appId: "${selectedAppSecret?.appId}",
    secret: "${selectedAppSecret?.secret}",
    version: "${selectedAppSecret?.version || '1.0'}"
);

var result = await auth.LicenseAsync("PASTE-LICENSE-KEY");
if (result) {
    Console.WriteLine($"Access Granted to {auth.UserData.ClientName}!");
}`}</code>
              </pre>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-zinc-800/80">
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedAppSecret(null);
                setModalShowSnippet(false);
                setModalShowSecret(false);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Full Edit Application Modal */}
      <EditAppModal
        isOpen={!!appToEdit}
        onClose={() => setAppToEdit(null)}
        onSuccess={loadApps}
        app={appToEdit}
      />

      {/* Configure Free Trial Modal */}
      <ConfigureTrialModal
        isOpen={!!trialConfigApp}
        onClose={() => setTrialConfigApp(null)}
        app={trialConfigApp}
        onSuccess={loadApps}
      />

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
