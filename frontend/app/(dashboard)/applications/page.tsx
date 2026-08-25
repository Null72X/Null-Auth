'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CreateAppModal } from '@/components/modals/CreateAppModal';
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
} from 'lucide-react';

interface AppItem {
  id: string;
  appId: string;
  name: string;
  secret: string;
  type: 'LICENSE' | 'HWID';
  status: 'ACTIVE' | 'PAUSED';
  createdAt: string;
  activeUsers: number;
  expiredUsers: number;
  totalUsers: number;
  lastActivity: string | null;
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAppSecret, setSelectedAppSecret] = useState<{ name: string; secret: string } | null>(null);
  const [appToDelete, setAppToDelete] = useState<AppItem | null>(null);
  const [appToEdit, setAppToEdit] = useState<AppItem | null>(null);
  const [editName, setEditName] = useState('');
  const [isCopied, setIsCopied] = useState(false);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Header
          title="Applications"
          subtitle="Manage your private applications, API keys, and authorization modes."
        />
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Create Application
        </Button>
      </div>

      {/* Applications Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-zinc-500">Loading applications...</div>
      ) : apps.length === 0 ? (
        <Card className="py-12 text-center space-y-3">
          <AppWindow className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-200">No Applications Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            You haven't created any applications yet. Click 'Create Application' to get started.
          </p>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 mt-2">
            <Plus className="w-4 h-4" /> Create Application
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <Card key={app.id} className="flex flex-col justify-between space-y-5">
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {app.name}
                      <button
                        onClick={() => {
                          setAppToEdit(app);
                          setEditName(app.name);
                        }}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </h3>
                    <p className="text-xs font-mono text-zinc-400 mt-0.5">App ID: {app.appId}</p>
                  </div>
                  <Badge status={app.status} />
                </div>

                {/* Info Pills */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Auth Mode</span>
                    <span className="font-semibold text-zinc-200 mt-0.5 inline-block">
                      {app.type === 'LICENSE' ? 'License Key' : 'HWID Whitelist'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Active Users</span>
                    <span className="font-semibold text-emerald-400 mt-0.5 inline-block">
                      {app.activeUsers} Active ({app.totalUsers} Total)
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedAppSecret({ name: app.name, secret: app.secret })}
                    title="View App Secret"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Secret
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRegenerateSecret(app)}
                    title="Regenerate Secret"
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
                        <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 mr-1" /> Resume
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
            </Card>
          ))}
        </div>
      )}

      {/* Create App Modal */}
      <CreateAppModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadApps}
      />

      {/* View Secret Modal */}
      <Modal
        isOpen={!!selectedAppSecret}
        onClose={() => setSelectedAppSecret(null)}
        title={`Application Secret — ${selectedAppSecret?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">
            Keep this secret key secure. Never expose it in client-side code or public repositories.
          </p>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 font-mono text-xs text-red-400">
            <span className="truncate">{selectedAppSecret?.secret}</span>
            <button
              onClick={() => copyToClipboard(selectedAppSecret?.secret || '')}
              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors shrink-0"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
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

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!appToDelete}
        onClose={() => setAppToDelete(null)}
        onConfirm={handleDeleteApp}
        title="Delete Application"
        message={`Are you sure you want to delete application '${appToDelete?.name}' (${appToDelete?.appId})? This will permanently delete all associated licenses, HWIDs, and activity history.`}
        confirmText="Delete Application"
      />
    </div>
  );
}
