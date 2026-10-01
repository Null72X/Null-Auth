'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CreateUserModal } from '@/components/modals/CreateUserModal';
import { EditUserModal } from '@/components/modals/EditUserModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { fetchApi } from '@/lib/api';
import { formatRelativeTime } from '@/lib/time';
import {
  Users,
  User,
  Plus,
  RefreshCw,
  Trash2,
  Pause,
  Play,
  Calendar,
  RotateCcw,
  Edit2,
  Copy,
  Check,
  Search,
  CheckSquare,
  Square,
  Ban,
  ShieldCheck,
  Clock,
  Cpu,
} from 'lucide-react';

interface UserItem {
  id: string;
  username: string;
  appId: string;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'BANNED';
  effectiveStatus: string;
  boundHwid: string | null;
  expiresAt: string;
  remainingDays: number;
  clientName: string | null;
  firstActivatedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  application?: {
    name: string;
    appId: string;
  };
}

export default function UserAccountsPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [appFilter, setAppFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [copiedUsername, setCopiedUsername] = useState<string | null>(null);
  const [copiedHwid, setCopiedHwid] = useState<string | null>(null);

  const loadApps = async () => {
    const res = await fetchApi('/admin/apps');
    if (res.success && res.data) {
      setApps(Array.isArray(res.data) ? res.data : []);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    let url = `/admin/users?page=${page}&limit=50`;
    if (appFilter) url += `&appId=${appFilter}`;
    if (statusFilter) url += `&status=${statusFilter}`;
    if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

    const res = await fetchApi(url);
    if (res.success && res.data) {
      setUsers(Array.isArray(res.data) ? res.data : []);
      if (res.meta?.totalPages) setTotalPages(res.meta.totalPages);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadApps();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [appFilter, statusFilter, search, page]);

  // User Accounts Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.effectiveStatus === 'ACTIVE' || u.status === 'ACTIVE').length;
    const paused = users.filter((u) => u.effectiveStatus === 'PAUSED' || u.status === 'PAUSED').length;
    const expired = users.filter((u) => u.effectiveStatus === 'EXPIRED' || u.status === 'EXPIRED').length;
    const banned = users.filter((u) => u.effectiveStatus === 'BANNED' || u.status === 'BANNED').length;
    return { total, active, paused, expired, banned };
  }, [users]);

  const handleToggleStatus = async (user: UserItem, newStatus: string) => {
    await fetchApi(`/admin/users/${user.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    loadUsers();
  };

  const handleResetHwid = async (userId: string) => {
    const res = await fetchApi(`/admin/users/${userId}/reset-hwid`, {
      method: 'POST',
      body: JSON.stringify({ boundHwid: null }),
    });
    if (res.success) {
      loadUsers();
    }
  };

  const handleExtend = async (userId: string, days: number) => {
    const res = await fetchApi(`/admin/users/${userId}/extend`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
    if (res.success) {
      loadUsers();
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    const res = await fetchApi(`/admin/users/${deleteTargetId}`, {
      method: 'DELETE',
    });
    if (res.success) {
      setDeleteTargetId(null);
      loadUsers();
    }
    setIsDeleting(false);
  };

  const handleBulkAction = async (action: 'PAUSE' | 'RESUME' | 'DELETE' | 'ADD_DAYS') => {
    if (selectedIds.length === 0) return;
    let days: number | undefined = undefined;
    if (action === 'ADD_DAYS') {
      const input = prompt('Enter number of days to add to selected user accounts:', '30');
      if (!input) return;
      days = parseInt(input, 10);
    }

    await fetchApi('/admin/users/bulk-action', {
      method: 'POST',
      body: JSON.stringify({
        userIds: selectedIds,
        action,
        days,
      }),
    });
    setSelectedIds([]);
    loadUsers();
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const copyUsername = (username: string) => {
    navigator.clipboard.writeText(username);
    setCopiedUsername(username);
    setTimeout(() => setCopiedUsername(null), 2000);
  };

  const copyHwid = (hwid: string) => {
    navigator.clipboard.writeText(hwid);
    setCopiedHwid(hwid);
    setTimeout(() => setCopiedHwid(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Header
          title="User Accounts Manager"
          subtitle="Manage user authentication credentials, machine HWID locks, expiration dates, and access states."
        />
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0 shadow-lg shadow-red-950/40">
          <Plus className="w-4 h-4" /> Create User Account
        </Button>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total User Accounts</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{metrics.total}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-zinc-900/90 border-zinc-800">
          <div className="w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Active Accounts</span>
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Banned Accounts</span>
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
              placeholder="Search by username, client notes, or bound machine SID..."
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
              <option value="">All User-Auth Applications</option>
              {apps
                .filter((a) => a.type === 'USER_AUTH')
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
              {selectedIds.length} user account(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => handleBulkAction('RESUME')}>
                Resume
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleBulkAction('PAUSE')}>
                Pause
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

      {/* User Accounts Table */}
      <Card className="p-0 overflow-hidden border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/90 border-b border-zinc-800/80 text-xs font-bold text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="p-4 w-10">
                  <button onClick={toggleSelectAll} className="text-zinc-400 hover:text-zinc-200">
                    {selectedIds.length === users.length && users.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-red-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-4">Username & Machine Binding</th>
                <th className="p-4">Application</th>
                <th className="p-4">Status</th>
                <th className="p-4">Expiration</th>
                <th className="p-4">Last Login</th>
                <th className="p-4">Client Name</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-zinc-500 animate-pulse">
                    Loading user accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-zinc-500">
                    No user accounts found matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelected = selectedIds.includes(user.id);

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-zinc-900/40 transition-colors ${
                        isSelected ? 'bg-red-950/20' : ''
                      }`}
                    >
                      <td className="p-4">
                        <button
                          onClick={() => toggleSelectOne(user.id)}
                          className="text-zinc-500 hover:text-zinc-300"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-red-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      {/* Two-line Username & Bound Machine SID/HWID */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1.5 min-w-[220px] max-w-[300px]">
                          {/* Line 1: Username */}
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span className="font-mono font-bold text-white bg-zinc-950/90 px-2.5 py-1 rounded-md border border-zinc-800 text-xs tracking-wider shadow-sm select-all">
                              {user.username}
                            </span>
                            <button
                              onClick={() => copyUsername(user.username)}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
                              title="Copy Username"
                            >
                              {copiedUsername === user.username ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {(user.clientName?.toLowerCase().includes('free trial') || user.username.startsWith('trial_')) && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-emerald-950/90 text-emerald-400 border border-emerald-800/60 shrink-0">
                                FREE TRIAL
                              </span>
                            )}
                          </div>

                          {/* Line 2: Bound Machine HWID / SID */}
                          <div className="flex items-center gap-1.5 text-xs">
                            <Cpu className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            {user.boundHwid ? (
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span
                                  title={user.boundHwid}
                                  className="font-mono text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 truncate max-w-[200px]"
                                >
                                  {user.boundHwid}
                                </span>
                                <button
                                  onClick={() => copyHwid(user.boundHwid!)}
                                  className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
                                  title="Copy Bound Machine SID"
                                >
                                  {copiedHwid === user.boundHwid ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-500 italic">
                                Unbound (First machine will lock)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-zinc-200">
                          {user.application?.name || user.appId}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge status={user.effectiveStatus || user.status} />
                      </td>
                      <td className="p-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-zinc-200 font-bold block">
                            {user.remainingDays} days left
                          </span>
                          <span className="text-[11px] text-zinc-500 block">
                            {new Date(user.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-zinc-200 block">
                            {formatRelativeTime(user.lastLoginAt)}
                          </span>
                          {user.lastLoginAt ? (
                            <span className="text-[10px] text-zinc-500 font-mono block">
                              {new Date(user.lastLoginAt).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-600 italic block">Never logged in</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-zinc-300 font-medium max-w-[140px] truncate">
                        {user.clientName ? user.clientName : <span className="text-zinc-600 italic">—</span>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingUser(user)}
                            title="Edit User Account"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors active:scale-95 flex items-center gap-1 font-semibold text-xs"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="hidden sm:inline text-[11px]">Edit</span>
                          </button>
                          <button
                            onClick={() => handleExtend(user.id, 30)}
                            title="+30 Days Duration"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors active:scale-95"
                          >
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                          {user.boundHwid && (
                            <button
                              onClick={() => handleResetHwid(user.id)}
                              title="Reset HWID Lock"
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors active:scale-95"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() =>
                              handleToggleStatus(
                                user,
                                user.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED'
                              )
                            }
                            title={user.status === 'PAUSED' ? 'Resume' : 'Pause'}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors active:scale-95"
                          >
                            {user.status === 'PAUSED' ? (
                              <Play className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Pause className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleToggleStatus(
                                user,
                                user.status === 'BANNED' ? 'ACTIVE' : 'BANNED'
                              )
                            }
                            title={user.status === 'BANNED' ? 'Unban' : 'Ban'}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-red-400 transition-colors active:scale-95"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(user.id)}
                            title="Delete User"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadUsers}
        apps={apps}
      />

      <EditUserModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={loadUsers}
        user={editingUser}
      />

      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirmed}
        title="Delete User Account"
        message="Are you sure you want to permanently delete this user account? Access will be revoked immediately."
        confirmText="Delete Account"
        isLoading={isDeleting}
      />
    </div>
  );
}
