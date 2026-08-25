'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CreateAppModal } from '@/components/modals/CreateAppModal';
import { CreateLicenseModal } from '@/components/modals/CreateLicenseModal';
import { AddHwidModal } from '@/components/modals/AddHwidModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { Modal } from '@/components/ui/Modal';
import { fetchApi } from '@/lib/api';
import {
  Plus,
  AppWindow,
  Key,
  ShieldCheck,
  Eye,
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
  Download,
  ShieldAlert,
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
  const [selectedAppSecret, setSelectedAppSecret] = useState<{ name: string; secret: string } | null>(null);
  const [appToDelete, setAppToDelete] = useState<AppItem | null>(null);
  const [appToEdit, setAppToEdit] = useState<AppItem | null>(null);
  const [editName, setEditName] = useState('');
  
  // Version Checker Edit Modal
  const [appToEditVersion, setAppToEditVersion] = useState<AppItem | null>(null);
  const [editVersion, setEditVersion] = useState('1.0.0');
  const [editDownloadUrl, setEditDownloadUrl] = useState('');

  const [quickLicenseApp, setQuickLicenseApp] = useState<AppItem | null>(null);
  const [quickHwidApp, setQuickHwidApp] = useState<AppItem | null>(null);

  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const loadApps = async () => {
    setIsLoading(true);
    const res = await fetchApi('/admin/apps');
    if (res.success && res.data) {
      setApps(res.data);
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

  const handleToggleStatus = async (app: AppItem) => {
    const newStatus = app.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await fetchApi(`/admin/apps/${app.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    loadApps();
  };

  const handleRegenerateSecret = async (app: AppItem) => {
    const res = await fetchApi(`/admin/apps/${app.id}/regenerate-secret`, {
      method: 'POST',
    });
    if (res.success && res.data) {
      setSelectedAppSecret({ name: app.name, secret: res.data.secret });
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
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Header
          title="Applications Manager"
          subtitle="Create, configure, enforce application versions, monitor users, and control application profiles."
        />
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0 shadow-lg shadow-red-950/40">
          <Plus className="w-4 h-4" /> Create Application
        </Button>
      </div>

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-xl bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400">
            <AppWindow className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Applications</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{stats.total}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">License Key Apps</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{stats.licenseCount}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">HWID Whitelist Apps</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{stats.hwidCount}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/80 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('PAUSED')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'PAUSED'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Paused
              </button>
            </div>

            <div className="flex items-center p-1 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  typeFilter === 'ALL'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All Modes
              </button>
              <button
                onClick={() => setTypeFilter('LICENSE')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  typeFilter === 'LICENSE'
                    ? 'bg-blue-950 text-blue-400 border border-blue-800/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                License Key
              </button>
              <button
                onClick={() => setTypeFilter('HWID')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
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

            return (
              <Card
                key={app.id}
                className="flex flex-col justify-between space-y-5 animate-slide-up group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="space-y-4">
                  {/* App Title & ID Header */}
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

                      {/* App ID Pill with Quick Copy */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300">
                        <span className="text-red-400 font-bold">{app.appId}</span>
                        <button
                          onClick={() => copyAppId(app.appId)}
                          className="text-zinc-500 hover:text-zinc-200 transition-colors"
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

                    <div className="flex flex-col items-end gap-1.5">
                      <Badge status={app.status} />
                      {/* Required Version Pill */}
                      <button
                        onClick={() => {
                          setAppToEditVersion(app);
                          setEditVersion(app.version || '1.0.0');
                          setEditDownloadUrl(app.downloadUrl || '');
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono font-bold text-amber-400 border border-zinc-700 transition-colors"
                        title="Click to update required version & download URL"
                      >
                        <Tag className="w-3 h-3" /> v{app.version || '1.0.0'}
                      </button>
                    </div>
                  </div>

                  {/* Auth Mode & Stats Bar */}
                  <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                        Auth Mode
                      </span>
                      <Badge status={app.type} />
                    </div>

                    {/* Active User Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-zinc-400">Active Users</span>
                        <span className="text-emerald-400">
                          {app.activeUsers} <span className="text-zinc-500 font-normal">/ {app.totalUsers} Total</span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${userRatio}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                  {/* Quick Action Button for Generating Keys or Adding HWID */}
                  {app.type === 'LICENSE' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setQuickLicenseApp(app)}
                      className="w-full gap-2 border-red-900/30 hover:border-red-500/40 text-xs font-semibold text-zinc-200"
                    >
                      <Plus className="w-3.5 h-3.5 text-red-400" /> Generate License Keys
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setQuickHwidApp(app)}
                      className="w-full gap-2 border-purple-900/30 hover:border-purple-500/40 text-xs font-semibold text-zinc-200"
                    >
                      <Plus className="w-3.5 h-3.5 text-purple-400" /> Authorize HWID User
                    </Button>
                  )}

                  {/* Icon Actions */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedAppSecret({ name: app.name, secret: app.secret })}
                        title="View App Secret Key"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Secret
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
                            <Pause className="w-3.5 h-3.5 mr-1 text-amber-400" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Resume
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
            );
          })}
        </div>
      )}

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

      {/* View Secret Modal */}
      <Modal
        isOpen={!!selectedAppSecret}
        onClose={() => setSelectedAppSecret(null)}
        title={`Application Secret — ${selectedAppSecret?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">
            Keep this secret key confidential. Embed it in your C#, C++, or Python desktop client for authentication requests.
          </p>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 font-mono text-xs text-red-400">
            <span className="truncate">{selectedAppSecret?.secret}</span>
            <button
              onClick={() => copySecret(selectedAppSecret?.secret || '')}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors shrink-0"
              title="Copy Secret"
            >
              {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm font-mono text-amber-400 focus:outline-none focus:border-red-500"
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
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
