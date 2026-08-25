'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AddHwidModal } from '@/components/modals/AddHwidModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { Modal } from '@/components/ui/Modal';
import { fetchApi } from '@/lib/api';
import {
  Plus,
  ShieldCheck,
  Search,
  Trash2,
  Pause,
  Play,
  Ban,
  Calendar,
  Edit2,
  Copy,
  Check,
} from 'lucide-react';

interface HwidItem {
  id: string;
  hwidHash: string;
  appId: string;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'BANNED';
  effectiveStatus: string;
  expiresAt: string;
  remainingDays: number;
  notes: string | null;
  lastAuthAt: string | null;
  createdAt: string;
  application?: {
    name: string;
    appId: string;
  };
}

export default function HwidPage() {
  const [hwids, setHwids] = useState<HwidItem[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [appFilter, setAppFilter] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [hwidToDelete, setHwidToDelete] = useState<HwidItem | null>(null);
  const [hwidToExtend, setHwidToExtend] = useState<HwidItem | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [hwidToEditNotes, setHwidToEditNotes] = useState<HwidItem | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const [copiedHwid, setCopiedHwid] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [hwidRes, appRes] = await Promise.all([
      fetchApi(
        `/admin/hwid?search=${encodeURIComponent(search)}&status=${statusFilter}&appId=${appFilter}`
      ),
      fetchApi('/admin/apps'),
    ]);

    if (hwidRes.success && hwidRes.data) {
      setHwids(hwidRes.data);
    }
    if (appRes.success && appRes.data) {
      setApps(appRes.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, appFilter]);

  const handleToggleStatus = async (item: HwidItem, newStatus: string) => {
    await fetchApi(`/admin/hwid/${item.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    loadData();
  };

  const handleExtendDays = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwidToExtend) return;
    await fetchApi(`/admin/hwid/${hwidToExtend.id}/extend`, {
      method: 'POST',
      body: JSON.stringify({ days: Number(extendDays) }),
    });
    setHwidToExtend(null);
    loadData();
  };

  const handleEditNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwidToEditNotes) return;
    await fetchApi(`/admin/hwid/${hwidToEditNotes.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes: editNotes }),
    });
    setHwidToEditNotes(null);
    loadData();
  };

  const handleDeleteHwid = async () => {
    if (!hwidToDelete) return;
    await fetchApi(`/admin/hwid/${hwidToDelete.id}`, {
      method: 'DELETE',
    });
    setHwidToDelete(null);
    loadData();
  };

  const copyHwid = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHwid(hash);
    setTimeout(() => setCopiedHwid(null), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Header
          title="HWID Access Whitelist"
          subtitle="Authorize direct machine / user identifiers for HWID-based applications."
        />
        <Button onClick={() => setIsAddOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Authorize HWID
        </Button>
      </div>

      {/* Control Bar: Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by HWID hash or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-red-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="EXPIRED">Expired</option>
              <option value="BANNED">Banned</option>
            </select>

            <select
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-red-500"
            >
              <option value="">All Applications</option>
              {apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* HWID Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/80 border-b border-zinc-800/80 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">HWID / Identifier Hash</th>
                <th className="p-4">Application</th>
                <th className="p-4">Status</th>
                <th className="p-4">Expiration</th>
                <th className="p-4">Last Auth</th>
                <th className="p-4">Notes</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-zinc-500">
                    Loading HWID entries...
                  </td>
                </tr>
              ) : hwids.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-zinc-500">
                    No HWID access entries found matching criteria.
                  </td>
                </tr>
              ) : (
                hwids.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 font-mono text-xs text-zinc-300">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200" title={item.hwidHash}>
                          {item.hwidHash}
                        </span>
                        <button
                          onClick={() => copyHwid(item.hwidHash)}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                        >
                          {copiedHwid === item.hwidHash ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-zinc-200">
                      {item.application?.name || 'Unknown App'}
                    </td>
                    <td className="p-4">
                      <Badge status={item.effectiveStatus} />
                    </td>
                    <td className="p-4 text-xs">
                      <span className="text-zinc-200 block font-semibold">
                        {item.remainingDays} days left
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {new Date(item.expiresAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-zinc-400">
                      {item.lastAuthAt ? (
                        new Date(item.lastAuthAt).toLocaleString()
                      ) : (
                        <span className="text-zinc-600 italic">Never</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-zinc-400 max-w-[140px] truncate">
                      {item.notes ? item.notes : <span className="text-zinc-600 italic">—</span>}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setHwidToExtend(item)}
                          title="Modify Expiration"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setHwidToEditNotes(item);
                            setEditNotes(item.notes || '');
                          }}
                          title="Edit Notes"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            handleToggleStatus(
                              item,
                              item.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED'
                            )
                          }
                          title={item.status === 'PAUSED' ? 'Resume' : 'Pause'}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        >
                          {item.status === 'PAUSED' ? (
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Pause className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            handleToggleStatus(
                              item,
                              item.status === 'BANNED' ? 'ACTIVE' : 'BANNED'
                            )
                          }
                          title={item.status === 'BANNED' ? 'Unban' : 'Ban'}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-red-400 transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setHwidToDelete(item)}
                          title="Delete HWID Authorization"
                          className="p-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add HWID Modal */}
      <AddHwidModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={loadData}
        apps={apps}
      />

      {/* Extend Days Modal */}
      <Modal
        isOpen={!!hwidToExtend}
        onClose={() => setHwidToExtend(null)}
        title="Modify HWID Expiration"
      >
        <form onSubmit={handleExtendDays} className="space-y-4">
          <p className="text-xs text-zinc-400">
            HWID: <span className="font-mono text-red-400 font-bold">{hwidToExtend?.hwidHash.slice(0, 16)}...</span>
          </p>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Days to Add (Use negative number to remove days)
            </label>
            <input
              type="number"
              value={extendDays}
              onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 0)}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={() => setHwidToExtend(null)}>
              Cancel
            </Button>
            <Button type="submit">Update Expiration</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Notes Modal */}
      <Modal
        isOpen={!!hwidToEditNotes}
        onClose={() => setHwidToEditNotes(null)}
        title="Edit Admin Notes"
      >
        <form onSubmit={handleEditNotes} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Notes
            </label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={() => setHwidToEditNotes(null)}>
              Cancel
            </Button>
            <Button type="submit">Save Notes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!hwidToDelete}
        onClose={() => setHwidToDelete(null)}
        onConfirm={handleDeleteHwid}
        title="Delete HWID Access Authorization"
        message="Are you sure you want to revoke and delete this HWID authorization? The client machine will immediately be denied access."
      />
    </div>
  );
}
