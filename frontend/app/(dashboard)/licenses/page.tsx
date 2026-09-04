'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CreateLicenseModal } from '@/components/modals/CreateLicenseModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { Modal } from '@/components/ui/Modal';
import { fetchApi } from '@/lib/api';
import {
  Plus,
  Key,
  Search,
  RefreshCw,
  Trash2,
  Pause,
  Play,
  Ban,
  Calendar,
  RotateCcw,
  Edit2,
  Copy,
  Check,
  CheckSquare,
  Square,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Cpu,
} from 'lucide-react';

interface LicenseItem {
  id: string;
  key: string;
  appId: string;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'BANNED';
  effectiveStatus: string;
  boundHwid: string | null;
  expiresAt: string;
  remainingDays: number;
  notes: string | null;
  firstActivatedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  application?: {
    name: string;
    appId: string;
  };
}

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [appFilter, setAppFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [licenseToDelete, setLicenseToDelete] = useState<LicenseItem | null>(null);
  const [licenseToExtend, setLicenseToExtend] = useState<LicenseItem | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [licenseToResetHwid, setLicenseToResetHwid] = useState<LicenseItem | null>(null);
  const [manualHwid, setManualHwid] = useState('');
  const [licenseToEditNotes, setLicenseToEditNotes] = useState<LicenseItem | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedHwid, setCopiedHwid] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [licRes, appRes] = await Promise.all([
      fetchApi(
        `/admin/licenses?search=${encodeURIComponent(search)}&status=${statusFilter}&appId=${appFilter}`
      ),
      fetchApi('/admin/apps'),
    ]);

    if (licRes.success && licRes.data) {
      setLicenses(licRes.data);
    }
    if (appRes.success && appRes.data) {
      setApps(appRes.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, appFilter]);

  // License Metrics
  const metrics = useMemo(() => {
    const total = licenses.length;
    const active = licenses.filter((l) => l.effectiveStatus === 'ACTIVE').length;
    const paused = licenses.filter((l) => l.effectiveStatus === 'PAUSED').length;
    const expired = licenses.filter((l) => l.effectiveStatus === 'EXPIRED').length;
    const banned = licenses.filter((l) => l.effectiveStatus === 'BANNED').length;
    return { total, active, paused, expired, banned };
  }, [licenses]);

  const handleToggleStatus = async (license: LicenseItem, newStatus: string) => {
    await fetchApi(`/admin/licenses/${license.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    loadData();
  };

  const handleExtendDays = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseToExtend) return;
    await fetchApi(`/admin/licenses/${licenseToExtend.id}/extend`, {
      method: 'POST',
      body: JSON.stringify({ days: Number(extendDays) }),
    });
    setLicenseToExtend(null);
    loadData();
  };

  const handleResetHwid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseToResetHwid) return;
    await fetchApi(`/admin/licenses/${licenseToResetHwid.id}/reset-hwid`, {
      method: 'POST',
      body: JSON.stringify({ boundHwid: manualHwid.trim() || null }),
    });
    setLicenseToResetHwid(null);
    setManualHwid('');
    loadData();
  };

  const handleEditNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseToEditNotes) return;
    await fetchApi(`/admin/licenses/${licenseToEditNotes.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes: editNotes }),
    });
    setLicenseToEditNotes(null);
    loadData();
  };

  const handleDeleteLicense = async () => {
    if (!licenseToDelete) return;
    await fetchApi(`/admin/licenses/${licenseToDelete.id}`, {
      method: 'DELETE',
    });
    setLicenseToDelete(null);
    loadData();
  };

  const handleBulkAction = async (action: 'PAUSE' | 'RESUME' | 'DELETE' | 'ADD_DAYS') => {
    if (selectedIds.length === 0) return;
    let days: number | undefined = undefined;
    if (action === 'ADD_DAYS') {
      const input = prompt('Enter number of days to add to selected licenses:', '30');
      if (!input) return;
      days = parseInt(input, 10);
    }
    await fetchApi('/admin/licenses/bulk-action', {
      method: 'POST',
      body: JSON.stringify({ licenseIds: selectedIds, action, days }),
    });
    setSelectedIds([]);
    loadData();
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === licenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(licenses.map((l) => l.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyHwid = (hwid: string) => {
    navigator.clipboard.writeText(hwid);
    setCopiedHwid(hwid);
    setTimeout(() => setCopiedHwid(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Header
          title="License Keys Manager"
          subtitle="Generate, manage, pause, extend duration, or reset bound machine SIDs for license keys."
        />
        <Button onClick={() => setIsGenerateOpen(true)} className="gap-2 shrink-0 shadow-lg shadow-red-950/40">
          <Plus className="w-4 h-4" /> Generate Licenses
        </Button>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Keys</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{metrics.total}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Active Keys</span>
            <h4 className="text-xl font-extrabold text-emerald-400 mt-0.5">{metrics.active}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-xl bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Paused / Expired</span>
            <h4 className="text-xl font-extrabold text-amber-400 mt-0.5">{metrics.paused + metrics.expired}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-xl bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Banned Keys</span>
            <h4 className="text-xl font-extrabold text-red-400 mt-0.5">{metrics.banned}</h4>
          </div>
        </Card>
      </div>

      {/* Control Bar: Search & Filters */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by license key (NULL-XXXX), notes, or bound Windows SID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-200 focus:outline-none focus:border-red-500"
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
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-200 focus:outline-none focus:border-red-500"
            >
              <option value="">All License Applications</option>
              {apps
                .filter((a) => a.type === 'LICENSE')
                .map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-3 text-xs bg-red-950/30 p-3 rounded-xl border border-red-900/40 animate-slide-up">
            <span className="font-bold text-red-300">
              {selectedIds.length} license(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => handleBulkAction('PAUSE')}>
                Pause
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleBulkAction('RESUME')}>
                Resume
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleBulkAction('ADD_DAYS')}>
                Add Days
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleBulkAction('DELETE')}>
                Delete Selected
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Licenses Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/90 border-b border-zinc-800/80 text-xs font-bold text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="p-4 w-10">
                  <button onClick={toggleSelectAll} className="text-zinc-400 hover:text-zinc-200">
                    {selectedIds.length === licenses.length && licenses.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-red-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-4">License Key & Machine Binding</th>
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
                  <td colSpan={8} className="p-8 text-center text-xs text-zinc-500 animate-pulse">
                    Loading licenses...
                  </td>
                </tr>
              ) : licenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-zinc-500">
                    No licenses found matching criteria.
                  </td>
                </tr>
              ) : (
                licenses.map((lic) => {
                  const isSelected = selectedIds.includes(lic.id);
                  const daysPercent = Math.min(100, Math.max(0, (lic.remainingDays / 365) * 100));

                  return (
                    <tr
                      key={lic.id}
                      className={`hover:bg-zinc-800/40 transition-colors ${
                        isSelected ? 'bg-red-950/20' : ''
                      }`}
                    >
                      <td className="p-4">
                        <button
                          onClick={() => toggleSelectOne(lic.id)}
                          className="text-zinc-400 hover:text-zinc-200"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-red-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      {/* Two-line License Key & Bound Machine HWID/SID */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1.5 min-w-[230px] max-w-[320px]">
                          {/* Line 1: License Key */}
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-red-400 bg-zinc-950/90 px-2.5 py-1 rounded-md border border-zinc-800 text-xs tracking-wider shadow-sm select-all">
                              {lic.key}
                            </span>
                            <button
                              onClick={() => copyKey(lic.key)}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
                              title="Copy License Key"
                            >
                              {copiedKey === lic.key ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Line 2: Bound Machine HWID / SID */}
                          <div className="flex items-center gap-1.5 text-xs">
                            <Cpu className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            {lic.boundHwid ? (
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span
                                  title={lic.boundHwid}
                                  className="font-mono text-[11px] text-zinc-300 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800/70 truncate max-w-[210px]"
                                >
                                  {lic.boundHwid}
                                </span>
                                <button
                                  onClick={() => copyHwid(lic.boundHwid!)}
                                  className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
                                  title="Copy Bound HWID"
                                >
                                  {copiedHwid === lic.boundHwid ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-500/70 italic">
                                Not Bound Yet
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-zinc-200">
                          {lic.application?.name || 'Unknown App'}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge status={lic.effectiveStatus} />
                      </td>
                      <td className="p-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-zinc-200 font-bold block">
                            {lic.remainingDays} days left
                          </span>
                          <span className="text-[11px] text-zinc-500 block">
                            {new Date(lic.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-mono text-zinc-400">
                        {lic.lastLoginAt ? new Date(lic.lastLoginAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="p-4 text-xs text-zinc-400 max-w-[140px] truncate">
                        {lic.notes ? lic.notes : <span className="text-zinc-600 italic">—</span>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setLicenseToExtend(lic)}
                            title="Add / Remove Days"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors active:scale-95"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setLicenseToResetHwid(lic);
                              setManualHwid(lic.boundHwid || '');
                            }}
                            title="Reset / Modify Bound HWID"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setLicenseToEditNotes(lic);
                              setEditNotes(lic.notes || '');
                            }}
                            title="Edit Notes"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors active:scale-95"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              handleToggleStatus(
                                lic,
                                lic.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED'
                              )
                            }
                            title={lic.status === 'PAUSED' ? 'Resume' : 'Pause'}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors active:scale-95"
                          >
                            {lic.status === 'PAUSED' ? (
                              <Play className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Pause className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleToggleStatus(
                                lic,
                                lic.status === 'BANNED' ? 'ACTIVE' : 'BANNED'
                              )
                            }
                            title={lic.status === 'BANNED' ? 'Unban' : 'Ban'}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-red-400 transition-colors active:scale-95"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setLicenseToDelete(lic)}
                            title="Delete License"
                            className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 transition-colors active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Generate Modal */}
      <CreateLicenseModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        onSuccess={loadData}
        apps={apps}
      />

      {/* Extend Days Modal */}
      <Modal
        isOpen={!!licenseToExtend}
        onClose={() => setLicenseToExtend(null)}
        title="Modify License Duration"
      >
        <form onSubmit={handleExtendDays} className="space-y-4">
          <p className="text-xs text-zinc-400">
            License Key:{' '}
            <span className="font-mono text-red-400 font-bold">{licenseToExtend?.key}</span>
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
            <Button type="button" variant="secondary" onClick={() => setLicenseToExtend(null)}>
              Cancel
            </Button>
            <Button type="submit">Update Duration</Button>
          </div>
        </form>
      </Modal>

      {/* Reset HWID Modal */}
      <Modal
        isOpen={!!licenseToResetHwid}
        onClose={() => setLicenseToResetHwid(null)}
        title="Reset / Change Bound HWID"
      >
        <form onSubmit={handleResetHwid} className="space-y-4">
          <p className="text-xs text-zinc-400">
            License Key:{' '}
            <span className="font-mono text-red-400 font-bold">{licenseToResetHwid?.key}</span>
          </p>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Bound HWID / User SID String
            </label>
            <input
              type="text"
              value={manualHwid}
              onChange={(e) => setManualHwid(e.target.value)}
              placeholder="Leave empty to clear binding (allow re-activation)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              If left blank, the license binding will be reset, allowing the user to bind a new machine on next activation.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={() => setLicenseToResetHwid(null)}>
              Cancel
            </Button>
            <Button type="submit">Save Binding</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Notes Modal */}
      <Modal
        isOpen={!!licenseToEditNotes}
        onClose={() => setLicenseToEditNotes(null)}
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
            <Button type="button" variant="secondary" onClick={() => setLicenseToEditNotes(null)}>
              Cancel
            </Button>
            <Button type="submit">Save Notes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!licenseToDelete}
        onClose={() => setLicenseToDelete(null)}
        onConfirm={handleDeleteLicense}
        title="Delete License Key"
        message={`Are you sure you want to delete license key '${licenseToDelete?.key}'? The client application using this key will immediately be denied access.`}
      />
    </div>
  );
}
