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
import {
  Users,
  Plus,
  RefreshCw,
  Trash2,
  Pause,
  Play,
  Calendar,
  Edit2,
  Search,
  CheckSquare,
  Square,
  ShieldCheck,
  User,
  Clock,
  RotateCcw,
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
  const [selectedAppId, setSelectedAppId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadApps = async () => {
    const res = await fetchApi('/admin/apps');
    if (res.success && res.data) {
      setApps(Array.isArray(res.data) ? res.data : []);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    let url = `/admin/users?page=${page}&limit=20`;
    if (selectedAppId !== 'ALL') url += `&appId=${selectedAppId}`;
    if (selectedStatus !== 'ALL') url += `&status=${selectedStatus}`;
    if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

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
  }, [selectedAppId, selectedStatus, searchQuery, page]);

  const handleToggleStatus = async (user: UserItem) => {
    const newStatus = user.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const res = await fetchApi(`/admin/users/${user.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.success) {
      loadUsers();
    }
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

  const handleBulkAction = async (action: 'PAUSE' | 'RESUME' | 'DELETE' | 'ADD_DAYS', days?: number) => {
    if (selectedUserIds.length === 0) return;

    const res = await fetchApi('/admin/users/bulk-action', {
      method: 'POST',
      body: JSON.stringify({
        userIds: selectedUserIds,
        action,
        days,
      }),
    });

    if (res.success) {
      setSelectedUserIds([]);
      loadUsers();
    }
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <Header
        title="User Accounts Management"
        subtitle="Manage user authentication credentials, machine HWID locks, expiration dates, and access states."
      />

      {/* Action Header Card */}
      <Card className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Client User Accounts</h2>
            <p className="text-xs text-zinc-400">
              Username & Password authorization with automatic single-device HWID binding.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 text-xs font-bold">
            <Plus className="w-4 h-4" /> Create User Account
          </Button>
        </div>
      </Card>

      {/* Filters & Bulk Controls Bar */}
      <Card className="space-y-4 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search username or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors"
              />
            </div>

            {/* Application Filter */}
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-red-500/80 transition-colors"
            >
              <option value="ALL">All Applications ({apps.filter(a => a.type === 'USER_AUTH').length})</option>
              {apps
                .filter((a) => a.type === 'USER_AUTH')
                .map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name} ({app.appId})
                  </option>
                ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-red-500/80 transition-colors"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="BANNED">BANNED</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedUserIds.length > 0 && (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-xs text-zinc-400 font-semibold mr-1">
                {selectedUserIds.length} Selected
              </span>
              <Button size="sm" variant="secondary" onClick={() => handleBulkAction('RESUME')} className="gap-1 text-xs">
                <Play className="w-3.5 h-3.5 text-emerald-400" /> Activate
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleBulkAction('PAUSE')} className="gap-1 text-xs">
                <Pause className="w-3.5 h-3.5 text-amber-400" /> Pause
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleBulkAction('ADD_DAYS', 30)} className="gap-1 text-xs">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> +30 Days
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleBulkAction('DELETE')} className="gap-1 text-xs">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* User Accounts Table */}
      <Card className="overflow-hidden p-0 border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="p-4 w-10">
                  <button type="button" onClick={toggleSelectAll} className="text-zinc-400 hover:text-white">
                    {selectedUserIds.length > 0 && selectedUserIds.length === users.length ? (
                      <CheckSquare className="w-4 h-4 text-red-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-4">Username & Client</th>
                <th className="p-4">Application</th>
                <th className="p-4">Status</th>
                <th className="p-4">Bound HWID</th>
                <th className="p-4">Expiration</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 animate-pulse">
                    Loading user accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    No user accounts found. Create one to get started.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-zinc-900/50 transition-colors ${
                        isSelected ? 'bg-red-950/10' : ''
                      }`}
                    >
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => toggleSelectUser(user.id)}
                          className="text-zinc-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-red-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-red-400 shrink-0" />
                          <div>
                            <p className="font-bold text-white text-xs">{user.username}</p>
                            {user.clientName && (
                              <p className="text-[11px] text-zinc-400">{user.clientName}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-mono text-zinc-300">
                          {user.application?.name || user.appId}
                        </span>
                      </td>

                      <td className="p-4">
                        <Badge status={user.effectiveStatus || user.status} />
                      </td>

                      <td className="p-4">
                        {user.boundHwid ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded w-fit">
                            <ShieldCheck className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[140px]">{user.boundHwid}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 font-mono text-[11px]">Unbound</span>
                        )}
                      </td>

                      <td className="p-4 font-mono text-[11px] text-zinc-300">
                        <div>
                          <span>{new Date(user.expiresAt).toLocaleDateString()}</span>
                          <p className="text-[10px] text-zinc-500">
                            {user.remainingDays} days remaining
                          </p>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {user.boundHwid && (
                            <button
                              type="button"
                              onClick={() => handleResetHwid(user.id)}
                              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors"
                              title="Reset HWID Lock"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleExtend(user.id, 30)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 transition-colors"
                            title="+30 Days Duration"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            title={user.status === 'ACTIVE' ? 'Pause User' : 'Activate User'}
                          >
                            {user.status === 'ACTIVE' ? (
                              <Pause className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Play className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUser(user)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            title="Edit User Account"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(user.id)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                            title="Delete User"
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
