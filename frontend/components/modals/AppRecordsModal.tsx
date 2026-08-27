'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { fetchApi } from '@/lib/api';
import {
  Key,
  ShieldCheck,
  Search,
  Copy,
  Check,
  Pause,
  Play,
  Trash2,
  Calendar,
  RotateCcw,
  Clock,
  Sparkles,
  Ban,
  Users,
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
  freeTrialEnabled: boolean;
  freeTrialKey: string | null;
}

interface AppRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: AppItem | null;
  onRefreshApps: () => void;
}

export function AppRecordsModal({ isOpen, onClose, app, onRefreshApps }: AppRecordsModalProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'BANNED'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extend days drawer state
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(30);

  const loadRecords = async () => {
    if (!app) return;
    setIsLoading(true);

    const endpoint = app.type === 'LICENSE'
      ? `/admin/licenses?appId=${app.id}&limit=200`
      : `/admin/hwid?appId=${app.id}&limit=200`;

    const res = await fetchApi(endpoint);
    if (res.success && res.data) {
      setRecords(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen && app) {
      loadRecords();
      setSearch('');
      setStatusFilter('ALL');
      setExtendingId(null);
    }
  }, [isOpen, app]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle record status (ACTIVE, PAUSED, BANNED)
  const handleToggleStatus = async (recordId: string, currentStatus: string) => {
    if (!app) return;
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const baseEndpoint = app.type === 'LICENSE' ? '/admin/licenses' : '/admin/hwid';

    await fetchApi(`${baseEndpoint}/${recordId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });

    loadRecords();
    onRefreshApps();
  };

  // Ban / Unban record
  const handleBanRecord = async (recordId: string, currentStatus: string) => {
    if (!app) return;
    const newStatus = currentStatus === 'BANNED' ? 'ACTIVE' : 'BANNED';
    const baseEndpoint = app.type === 'LICENSE' ? '/admin/licenses' : '/admin/hwid';

    await fetchApi(`${baseEndpoint}/${recordId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });

    loadRecords();
    onRefreshApps();
  };

  // Extend record days
  const handleExtendDays = async (recordId: string) => {
    if (!app) return;
    const baseEndpoint = app.type === 'LICENSE' ? '/admin/licenses' : '/admin/hwid';

    await fetchApi(`${baseEndpoint}/${recordId}/extend`, {
      method: 'PATCH',
      body: JSON.stringify({ days: Number(extendDays) }),
    });

    setExtendingId(null);
    loadRecords();
    onRefreshApps();
  };

  // Reset bound HWID (License apps only)
  const handleResetHwid = async (licenseId: string) => {
    await fetchApi(`/admin/licenses/${licenseId}/reset-hwid`, {
      method: 'PATCH',
      body: JSON.stringify({ boundHwid: null }),
    });
    loadRecords();
  };

  // Delete record
  const handleDeleteRecord = async (recordId: string) => {
    if (!app) return;
    const baseEndpoint = app.type === 'LICENSE' ? '/admin/licenses' : '/admin/hwid';

    await fetchApi(`${baseEndpoint}/${recordId}`, {
      method: 'DELETE',
    });

    loadRecords();
    onRefreshApps();
  };

  // Record metrics
  const metrics = useMemo(() => {
    const total = records.length;
    const active = records.filter((r) => (r.effectiveStatus || r.status) === 'ACTIVE').length;
    const paused = records.filter((r) => (r.effectiveStatus || r.status) === 'PAUSED').length;
    const expired = records.filter((r) => (r.effectiveStatus || r.status) === 'EXPIRED').length;
    const banned = records.filter((r) => (r.effectiveStatus || r.status) === 'BANNED').length;
    return { total, active, paused, expired, banned };
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const query = search.toLowerCase().trim();
      const effStatus = r.effectiveStatus || r.status;
      const matchesStatus = statusFilter === 'ALL' || effStatus === statusFilter;
      if (!matchesStatus) return false;

      if (!query) return true;

      if (app?.type === 'LICENSE') {
        return (
          r.key?.toLowerCase().includes(query) ||
          r.notes?.toLowerCase().includes(query) ||
          r.boundHwid?.toLowerCase().includes(query)
        );
      } else {
        return (
          r.hwidHash?.toLowerCase().includes(query) ||
          r.notes?.toLowerCase().includes(query)
        );
      }
    });
  }, [records, search, statusFilter, app]);

  if (!app) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${app.type === 'LICENSE' ? 'License Keys' : 'HWID Whitelists'} — ${app.name}`}
      maxWidth="6xl"
    >
      <div className="space-y-5">
        {/* Metric Summary Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-[10px] bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-400 font-bold uppercase text-[10px]">Total Records</span>
            <span className="font-mono font-bold text-white text-sm">{metrics.total}</span>
          </div>

          <div className="p-3 rounded-[10px] bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-between">
            <span className="text-emerald-400 font-bold uppercase text-[10px]">Active</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{metrics.active}</span>
          </div>

          <div className="p-3 rounded-[10px] bg-amber-950/40 border border-amber-800/50 flex items-center justify-between">
            <span className="text-amber-400 font-bold uppercase text-[10px]">Expired / Paused</span>
            <span className="font-mono font-bold text-amber-400 text-sm">{metrics.expired + metrics.paused}</span>
          </div>

          <div className="p-3 rounded-[10px] bg-red-950/40 border border-red-800/50 flex items-center justify-between">
            <span className="text-red-400 font-bold uppercase text-[10px]">Banned</span>
            <span className="font-mono font-bold text-red-400 text-sm">{metrics.banned}</span>
          </div>
        </div>

        {/* Search & Status Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950 p-3.5 rounded-[12px] border border-zinc-800">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={
                app.type === 'LICENSE'
                  ? 'Search by license key, bound Machine SID, or notes...'
                  : 'Search by authorized Machine SID or notes...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-[8px] pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-[8px] text-[11px] font-bold shrink-0">
            {(['ALL', 'ACTIVE', 'PAUSED', 'EXPIRED', 'BANNED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-[6px] transition-all ${
                  statusFilter === st
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Records List Cards Container */}
        {isLoading ? (
          <div className="py-14 text-center text-xs text-zinc-500 animate-pulse">
            Loading records for {app.name}...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-14 text-center text-xs text-zinc-500 space-y-2">
            <p className="font-bold text-zinc-300">No records found matching criteria.</p>
            <p className="text-[11px] text-zinc-600">
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'Generate license keys or authorize HWID users to populate records.'}
            </p>
          </div>
        ) : (
          <div className="max-h-[460px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {filteredRecords.map((r) => {
              const displayVal = app.type === 'LICENSE' ? r.key : r.hwidHash;
              const isExtending = extendingId === r.id;
              const effStatus = r.effectiveStatus || r.status;
              const daysRatio = Math.min(100, Math.max(0, (r.remainingDays / 365) * 100));

              return (
                <div
                  key={r.id}
                  className="p-3.5 rounded-[10px] bg-zinc-950 border border-zinc-800/90 hover:border-red-500/40 transition-all space-y-3 text-xs shadow-md"
                >
                  {/* Top Bar: Key & Actions */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 truncate">
                      {app.type === 'LICENSE' ? (
                        <Key className="w-4 h-4 text-red-400 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                      )}
                      <span className="font-mono font-extrabold text-white text-sm tracking-wide truncate">
                        {displayVal}
                      </span>
                      <button
                        onClick={() => copyToClipboard(displayVal, r.id)}
                        className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0 border border-zinc-800"
                        title="Copy Key / SID"
                      >
                        {copiedId === r.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge status={effStatus} />

                      {/* Extend Duration Button */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setExtendingId(isExtending ? null : r.id)}
                        title="Extend License Duration (+Days)"
                        className="py-1 h-auto text-[11px] font-bold gap-1"
                      >
                        <Clock className="w-3 h-3 text-amber-400" /> +Days
                      </Button>

                      {/* Pause / Resume Button */}
                      <button
                        onClick={() => handleToggleStatus(r.id, r.status)}
                        className="p-1.5 rounded-[6px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
                        title={r.status === 'ACTIVE' ? 'Pause Record' : 'Resume Record'}
                      >
                        {r.status === 'ACTIVE' ? (
                          <Pause className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>

                      {/* Ban / Unban Button */}
                      <button
                        onClick={() => handleBanRecord(r.id, r.status)}
                        className="p-1.5 rounded-[6px] bg-zinc-900 hover:bg-zinc-800 text-red-400 hover:text-red-300 transition-colors border border-zinc-800"
                        title={r.status === 'BANNED' ? 'Unban Record' : 'Ban Record'}
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteRecord(r.id)}
                        className="p-1.5 rounded-[6px] bg-zinc-900 hover:bg-red-950/60 text-zinc-500 hover:text-red-400 transition-colors border border-zinc-800"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bound HWID Sub-Row (License apps) */}
                  {app.type === 'LICENSE' && (
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-900/80 p-2 rounded-[6px] border border-zinc-800/80 font-mono">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-zinc-500 font-bold uppercase text-[9px]">Bound SID:</span>
                        <span className={r.boundHwid ? 'text-zinc-200 font-bold truncate' : 'text-zinc-600 italic'}>
                          {r.boundHwid || 'Not yet bound to machine'}
                        </span>
                      </div>
                      {r.boundHwid && (
                        <button
                          onClick={() => handleResetHwid(r.id)}
                          className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 text-[10px] font-bold shrink-0 ml-2 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800"
                          title="Reset Bound Machine SID"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset SID
                        </button>
                      )}
                    </div>
                  )}

                  {/* Extend Days Drawer */}
                  {isExtending && (
                    <div className="p-3 rounded-[8px] bg-zinc-900 border border-amber-900/50 flex items-center justify-between gap-3 animate-slide-up">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-amber-400 font-bold">Add Days to Duration:</span>
                        <input
                          type="number"
                          value={extendDays}
                          onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 0)}
                          className="w-20 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleExtendDays(r.id)}
                          className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] py-1 h-auto"
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setExtendingId(null)}
                          className="text-[11px] py-1 h-auto"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Footer Meta Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-zinc-400 border-t border-zinc-900 pt-2">
                    <div className="flex items-center gap-3">
                      <span>
                        Expires: <strong className="text-zinc-200">{new Date(r.expiresAt).toLocaleDateString()}</strong>
                      </span>
                      <span>&bull;</span>
                      <span>
                        Last Auth: <strong className="text-zinc-200">{r.lastLoginAt || r.lastAuthAt ? new Date(r.lastLoginAt || r.lastAuthAt).toLocaleString() : 'Never'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {r.notes && (
                        <span className="text-zinc-400 italic truncate max-w-[150px]">
                          "{r.notes}"
                        </span>
                      )}
                      <span className="text-emerald-400 font-mono font-bold">
                        {r.remainingDays} Days Left
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
