'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { fetchApi } from '@/lib/api';

interface AppOption {
  id: string;
  appId: string;
  name: string;
  type: string;
}

interface AddHwidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apps: AppOption[];
  defaultAppId?: string;
}

export function AddHwidModal({
  isOpen,
  onClose,
  onSuccess,
  apps,
  defaultAppId,
}: AddHwidModalProps) {
  const hwidApps = apps.filter((a) => a.type === 'HWID');
  const [appId, setAppId] = useState(defaultAppId || hwidApps[0]?.id || '');
  const [hwid, setHwid] = useState('');
  const [days, setDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetchApi('/admin/hwid', {
        method: 'POST',
        body: JSON.stringify({
          appId,
          hwid,
          days: Number(days),
          notes,
        }),
      });

      if (res.success) {
        setHwid('');
        setNotes('');
        setDays(30);
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to add HWID access.');
      }
    } catch (err: any) {
      setError('An error occurred while adding HWID access.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Authorize HWID / Machine Identifier">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Target Application *
          </label>
          <select
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            required
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
          >
            {hwidApps.length === 0 && <option value="">No HWID-access apps found</option>}
            {hwidApps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name} ({app.appId})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Machine / User SID / HWID String *
          </label>
          <input
            type="text"
            value={hwid}
            onChange={(e) => setHwid(e.target.value)}
            required
            placeholder="e.g. S-1-5-21-38294-..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 font-mono text-xs placeholder-zinc-500 focus:outline-none focus:border-red-500"
          />
          <p className="text-[11px] text-zinc-400 mt-1">
            Raw SID or machine hash. Automatically hashed for secure storage.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Duration (Days) *
          </label>
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10) || 1)}
            required
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Admin Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Authorized tester"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={!appId || !hwid}>
            Authorize HWID
          </Button>
        </div>
      </form>
    </Modal>
  );
}
