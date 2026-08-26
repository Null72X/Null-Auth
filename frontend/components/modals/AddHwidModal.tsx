'use client';

import React, { useState, useEffect } from 'react';
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
  onSuccess: (targetAppId?: string) => void;
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
  const [appId, setAppId] = useState(defaultAppId || '');
  const [hwid, setHwid] = useState('');
  const [days, setDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultAppId && hwidApps.some(a => a.id === defaultAppId)) {
        setAppId(defaultAppId);
      } else if (hwidApps.length > 0) {
        setAppId(hwidApps[0].id);
      }
    }
  }, [isOpen, apps, defaultAppId]);

  const selectedAppId = appId || (hwidApps.length > 0 ? hwidApps[0].id : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const targetAppId = selectedAppId;

    if (!targetAppId) {
      setError('Please create an HWID-access application first.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetchApi('/admin/hwid', {
        method: 'POST',
        body: JSON.stringify({
          appId: targetAppId,
          hwid,
          days: Number(days),
          notes,
        }),
      });

      if (res.success) {
        setHwid('');
        setNotes('');
        setDays(30);
        onSuccess(targetAppId);
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
            value={selectedAppId}
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
          {hwidApps.length === 0 && (
            <p className="text-xs text-red-400 mt-1">
              Please go to Applications and create an 'HWID Whitelist' type app first.
            </p>
          )}
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
            Raw SID or machine hash. Automatically stored for secure authorization.
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
          <Button type="submit" isLoading={isLoading} disabled={!selectedAppId || !hwid}>
            Authorize HWID
          </Button>
        </div>
      </form>
    </Modal>
  );
}
