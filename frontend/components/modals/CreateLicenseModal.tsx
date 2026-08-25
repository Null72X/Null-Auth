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

interface CreateLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apps: AppOption[];
  defaultAppId?: string;
}

export function CreateLicenseModal({
  isOpen,
  onClose,
  onSuccess,
  apps,
  defaultAppId,
}: CreateLicenseModalProps) {
  const licenseApps = apps.filter((a) => a.type === 'LICENSE');
  const [appId, setAppId] = useState(defaultAppId || licenseApps[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [days, setDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetchApi('/admin/licenses/generate', {
        method: 'POST',
        body: JSON.stringify({
          appId,
          quantity: Number(quantity),
          days: Number(days),
          notes,
        }),
      });

      if (res.success) {
        setNotes('');
        setQuantity(1);
        setDays(30);
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to generate licenses.');
      }
    } catch (err: any) {
      setError('An error occurred while generating licenses.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate License Key(s)">
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
            {licenseApps.length === 0 && <option value="">No License-based apps found</option>}
            {licenseApps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name} ({app.appId})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Quantity *
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
            />
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
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Admin Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. VIP User John Doe"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={!appId}>
            Generate License(s)
          </Button>
        </div>
      </form>
    </Modal>
  );
}
