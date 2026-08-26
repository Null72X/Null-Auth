'use client';

import React, { useEffect, useState } from 'react';
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
  PlusCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  UserCheck,
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

interface LicenseRecord {
  id: string;
  key: string;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'BANNED';
  boundHwid: string | null;
  expiresAt: string;
  notes: string | null;
  remainingDays: number;
}

interface HwidRecord {
  id: string;
  hwidHash: string;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'BANNED';
  expiresAt: string;
  notes: string | null;
  remainingDays: number;
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extend days state
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(30);

  const loadRecords = async () => {
    if (!app) return;
    setIsLoading(true);

    const endpoint = app.type === 'LICENSE'
      ? `/admin/licenses?appId=${app.id}&limit=100`
      : `/admin/hwid?appId=${app.id}&limit=100`;

    const res = await fetchApi(endpoint);
    if (res.success && res.data) {
      setRecords(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen && app) {
      loadRecords();
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

  // Extend record days
  const handleExtendDays = async (recordId: string) => {
    if (!app) return;
    const baseEndpoint = app.type === 'LICENSE' ? '/admin/licenses' : '/admin/hwid';

    await fetchApi(`${baseEndpoint}/${recordId}/extend`, {
      method: 'PATCH',
      body: JSON.stringify({ days: extendDays }),
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

  // Filtered records
  const filteredRecords = records.filter((r) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    if (app?.type === 'LICENSE') {
      return (
        r.key.toLowerCase().includes(query) ||
        (r.notes && r.notes.toLowerCase().includes(query)) ||
        (r.boundHwid && r.boundHwid.toLowerCase().includes(query))
      );
    } else {
      return (
        r.hwidHash.toLowerCase().includes(query) ||
        (r.notes && r.notes.toLowerCase().includes(query))
      );
    }
  });

  if (!app) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Application Records — ${app.name}`}
    >
      <div className="space-y-4">
        {/* Header Summary Pill */}
        <div className="p-3.5 rounded-[7px] bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Badge status={app.type} />
            <span className="font-mono text-zinc-400 font-bold">{app.appId}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-bold uppercase text-[10px]">Total Records</span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-white font-bold font-mono">
              {records.length}
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={
              app.type === 'LICENSE'
                ? 'Search licenses by key, bound HWID, or notes...'
                : 'Search authorized machine SIDs or notes...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-[7px] pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Records List Container */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-zinc-500 animate-pulse">
            Loading application records...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
            <p className="font-semibold text-zinc-400">No records found for this application.</p>
            <p className="text-[11px] text-zinc-600">
              {search ? 'Try adjusting your search filter.' : 'Generate license keys or authorize HWID users to populate records.'}
            </p>
          </div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredRecords.map((r) => {
              const displayVal = app.type === 'LICENSE' ? r.key : r.hwidHash;
              const isExtending = extendingId === r.id;

              return (
                <div
                  key={r.id}
                  className="p-3 rounded-[7px] bg-zinc-950 border border-zinc-800/90 hover:border-zinc-700 transition-all space-y-2 text-xs"
                >
                  {/* Record Key & Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      {app.type === 'LICENSE' ? (
                        <Key className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      )}
                      <span className="font-mono font-bold text-white truncate text-[12px]">
                        {displayVal}
                      </span>
                      <button
                        onClick={() => copyToClipboard(displayVal, r.id)}
                        className="p-1 text-zinc-500 hover:text-white transition-colors shrink-0"
                        title="Copy"
                      >
                        {copiedId === r.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge status={r.effectiveStatus || r.status} />

                      {/* Extend Button */}
                      <button
                        onClick={() => setExtendingId(isExtending ? null : r.id)}
                        className="p-1 rounded-[5px] bg-zinc-900 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 transition-colors"
                        title="Extend License Duration (+Days)"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>

                      {/* Pause / Resume Button */}
                      <button
                        onClick={() => handleToggleStatus(r.id, r.status)}
                        className="p-1 rounded-[5px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        title={r.status === 'ACTIVE' ? 'Pause Record' : 'Resume Record'}
                      >
                        {r.status === 'ACTIVE' ? (
                          <Pause className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteRecord(r.id)}
                        className="p-1 rounded-[5px] bg-zinc-900 hover:bg-red-950/60 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* License Bound HWID Sub-row */}
                  {app.type === 'LICENSE' && (
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-900 pt-1.5 font-mono">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-zinc-500 font-bold uppercase text-[9px]">Bound SID:</span>
                        <span className={r.boundHwid ? 'text-zinc-200 truncate' : 'text-zinc-600 italic'}>
                          {r.boundHwid || 'Not yet bound'}
                        </span>
                      </div>
                      {r.boundHwid && (
                        <button
                          onClick={() => handleResetHwid(r.id)}
                          className="text-amber-400/90 hover:text-amber-300 transition-colors flex items-center gap-1 text-[10px] font-bold shrink-0 ml-2"
                          title="Reset Bound Machine SID"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset SID
                        </button>
                      )}
                    </div>
                  )}

                  {/* Extend Days Drawer */}
                  {isExtending && (
                    <div className="p-2.5 rounded-[5px] bg-zinc-900 border border-amber-900/40 flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-amber-400 font-bold">Add Days:</span>
                        <input
                          type="number"
                          value={extendDays}
                          onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 0)}
                          className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
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

                  {/* Expiration Info Footer */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
                    <span>
                      Expires: {new Date(r.expiresAt).toLocaleDateString()}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {r.remainingDays} Days Left
                    </span>
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
