'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { fetchApi } from '@/lib/api';
import { formatRelativeTime } from '@/lib/time';
import { ExpirationCountdown } from '@/components/ui/ExpirationCountdown';
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
  type: 'LICENSE' | 'HWID' | 'USER_AUTH';
  status: 'ACTIVE' | 'PAUSED';
  version: string;
  downloadUrl: string | null;
  freeTrialEnabled: boolean;
  freeTrialKey: string | null;
}

interface AppRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: any;
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
      : app.type === 'USER_AUTH'
      ? `/admin/users?appId=${app.id}&limit=200`
      : `/admin/hwid?appId=${app.id}&limit=200`;

    const res = await fetchApi(endpoint);
    if (res.success && res.data) {
      const list = Array.isArray(res.data)
        ? res.data
        : res.data.licenses || res.data.entries || [];
      setRecords(list);
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
    const baseEndpoint = app.type === 'LICENSE' ? '/admin/licenses' : app.type === 'USER_AUTH' ? '/admin/users' : '/admin/hwid';

    await fetchApi(`${baseEndpoint}/${recordId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    loadRecords();
    onRefreshApps();
  };

  // Ban record
  const handleBanRecord = async (recordId: string, currentStatus: string) => {
    if (!app) return;
    const newStatus = currentStatus === 'BANNED' ? 'ACTIVE' : 'BANNED';
    const baseEndpoint = app.type === 'LICENSE' ? '/admin/licenses' : app.type === 'USER_AUTH' ? '/admin/users' : '/admin/hwid';

    await fetchApi(`${baseEndpoint}/${recordId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    loadRecords();
    onRefreshApps();
  };

  // Delete record
  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to permanently delete this authorization record?')) return;
    const baseEndpoint = app.type === 'LICENSE' ? '/admin/licenses' : app.type === 'USER_AUTH' ? '/admin/users' : '/admin/hwid';

    await fetchApi(`${baseEndpoint}/${recordId}`, {
      method: 'DELETE',
    });
    loadRecords();
    onRefreshApps();
  };

  // Reset HWID binding
  const handleResetHwid = async (recordId: string) => {
    if (!app) return;
    const baseEndpoint = app.type === 'LICENSE' ? '/admin/licenses' : '/admin/users';

    await fetchApi(`${baseEndpoint}/${recordId}/reset-hwid`, {
      method: 'POST',
    });
    loadRecords();
  };

  // Extend duration
  const handleExtendDays = async (recordId: string) => {
    if (!app) return;
    const baseEndpoint = app.type === 'LICENSE' ? '/admin/licenses' : app.type === 'USER_AUTH' ? '/admin/users' : '/admin/hwid';

    await fetchApi(`${baseEndpoint}/${recordId}/extend`, {
      method: 'POST',
      body: JSON.stringify({ days: extendDays }),
    });
    setExtendingId(null);
    loadRecords();
    onRefreshApps();
  };

  // Filtered list
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        search === '' ||
        (r.key && r.key.toLowerCase().includes(search.toLowerCase())) ||
        (r.username && r.username.toLowerCase().includes(search.toLowerCase())) ||
        (r.hwid && r.hwid.toLowerCase().includes(search.toLowerCase())) ||
        (r.hwidHash && r.hwidHash.toLowerCase().includes(search.toLowerCase())) ||
        (r.clientName && r.clientName.toLowerCase().includes(search.toLowerCase())) ||
        (r.boundHwid && r.boundHwid.toLowerCase().includes(search.toLowerCase()));

      let matchStatus = true;
      if (statusFilter !== 'ALL') {
        const isExp = r.remainingDays != null && r.remainingDays <= 0;
        if (statusFilter === 'EXPIRED') {
          matchStatus = isExp || r.status === 'EXPIRED';
        } else {
          matchStatus = r.status === statusFilter && !isExp;
        }
      }

      return matchSearch && matchStatus;
    });
  }, [records, search, statusFilter]);

  if (!app) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${app.name} — Authorization Records`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Top Control Bar: Search & Status Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${app.type === 'LICENSE' ? 'license keys' : app.type === 'USER_AUTH' ? 'usernames' : 'HWIDs'} or client tags...`}
              className="w-full modal-input rounded-lg pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/10 p-1 rounded-lg text-xs overflow-x-auto shrink-0">
            {(['ALL', 'ACTIVE', 'PAUSED', 'EXPIRED', 'BANNED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 rounded-[6px] text-[11px] font-bold transition-all ${
                  statusFilter === filter
                    ? 'bg-red-950/70 text-red-300 border border-red-500/50 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Records Listing */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
            <span>Loading application records...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400 rounded-lg bg-white/[0.02] border border-white/10">
            No records matched your search or filter.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
            {filteredRecords.map((r) => {
              const displayVal = r.key || r.username || r.hwid || r.hwidHash || 'Unknown';
              const isExtending = extendingId === r.id;
              const isExpired = r.remainingDays != null && r.remainingDays <= 0;
              const effStatus = isExpired ? 'EXPIRED' : r.status;

              return (
                <div
                  key={r.id}
                  className="p-3.5 rounded-[10px] bg-white/[0.04] border border-white/10 hover:border-red-500/40 transition-all space-y-3 text-xs shadow-md"
                >
                  {/* Top Bar: Key & Actions */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 truncate">
                      {app.type === 'LICENSE' ? (
                        <Key className="w-4 h-4 text-red-400 shrink-0" />
                      ) : app.type === 'USER_AUTH' ? (
                        <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                      )}
                      <span className="font-mono font-extrabold text-white text-sm tracking-wide truncate">
                        {displayVal}
                      </span>
                      <button
                        onClick={() => copyToClipboard(displayVal, r.id)}
                        className="btn-action shrink-0"
                        title="Copy Key / Username / HWID"
                      >
                        {copiedId === r.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === r.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge status={effStatus} />

                      {/* Extend Duration Button */}
                      <button
                        onClick={() => setExtendingId(isExtending ? null : r.id)}
                        title="Extend License Duration (+Days)"
                        className="btn-action text-[11px]"
                      >
                        <Clock className="w-3 h-3 text-amber-400" /> +Days
                      </button>

                      {/* Pause / Resume Button */}
                      <button
                        onClick={() => handleToggleStatus(r.id, r.status)}
                        className="btn-action"
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
                        className="btn-action btn-action-danger"
                        title={r.status === 'BANNED' ? 'Unban Record' : 'Ban Record'}
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteRecord(r.id)}
                        className="btn-action btn-action-danger"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bound HWID Sub-Row (License & User Auth apps) */}
                  {(app.type === 'LICENSE' || app.type === 'USER_AUTH') && (
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-white/[0.03] p-2 rounded-[6px] border border-white/10 font-mono">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-zinc-500 font-bold uppercase text-[9px]">Bound HWID:</span>
                        <span className={r.boundHwid ? 'text-zinc-200 font-bold truncate' : 'text-zinc-500 italic'}>
                          {r.boundHwid || 'Not yet bound to machine'}
                        </span>
                      </div>
                      {r.boundHwid && (
                        <button
                          onClick={() => handleResetHwid(r.id)}
                          className="btn-action btn-action-amber text-[10px] ml-2 shrink-0"
                          title="Reset Bound HWID"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset HWID
                        </button>
                      )}
                    </div>
                  )}

                  {/* Extend Days Drawer */}
                  {isExtending && (
                    <div className="p-3 rounded-[8px] bg-zinc-900 border border-amber-500/40 flex items-center justify-between gap-3 animate-slide-up">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-amber-400 font-bold">Add Days to Duration:</span>
                        <input
                          type="number"
                          value={extendDays}
                          onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 0)}
                          className="w-20 modal-input rounded px-2 py-1 text-white font-mono text-xs"
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-zinc-400 border-t border-white/10 pt-2">
                    <div className="flex items-center gap-3">
                      <span>
                        Expires: <strong className="text-zinc-200">{r.remainingDays != null && r.remainingDays >= 9999 ? 'No Expiry' : new Date(r.expiresAt).toLocaleDateString()}</strong>
                      </span>
                      <span>&bull;</span>
                      <span>
                        Last Auth: <strong className="text-zinc-200" title={r.lastLoginAt || r.lastAuthAt ? new Date(r.lastLoginAt || r.lastAuthAt).toLocaleString() : 'Never'}>{formatRelativeTime(r.lastLoginAt || r.lastAuthAt)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {(r.clientName || r.notes) && (
                        <span className="text-zinc-300 font-medium truncate max-w-[180px] bg-white/[0.06] px-2 py-0.5 rounded border border-white/10 text-[11px]">
                          Client: {r.clientName || r.notes}
                        </span>
                      )}
                      <ExpirationCountdown
                        expiresAt={r.expiresAt}
                        remainingDays={r.remainingDays}
                        className="text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-white/10">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
