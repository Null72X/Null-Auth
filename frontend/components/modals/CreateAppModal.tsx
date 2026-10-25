'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { fetchApi } from '@/lib/api';

interface CreateAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAppModal({ isOpen, onClose, onSuccess }: CreateAppModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'LICENSE' | 'HWID' | 'USER_AUTH'>('LICENSE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetchApi('/admin/apps', {
        method: 'POST',
        body: JSON.stringify({ name, type }),
      });

      if (res.success) {
        setName('');
        setType('LICENSE');
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to create application.');
      }
    } catch (err: any) {
      setError('An error occurred while creating the application.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Application">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Application Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. My Custom Tool"
            className="w-full modal-input rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Application Type *
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full modal-input rounded-lg px-3.5 py-2.5 text-sm text-zinc-100"
          >
            <option value="LICENSE" className="bg-zinc-900 text-zinc-100">License Key Authentication (Key + Bound HWID)</option>
            <option value="HWID" className="bg-zinc-900 text-zinc-100">HWID / Identifier Access (Direct Whitelist)</option>
            <option value="USER_AUTH" className="bg-zinc-900 text-zinc-100">Username & Password Mode (Credentials + Bound HWID)</option>
          </select>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            {type === 'LICENSE'
              ? 'Users authenticate using generated license keys bound to their machine Hardware ID (HWID) on first activation.'
              : type === 'USER_AUTH'
              ? 'Users authenticate using their account Username and Password, automatically bound to their machine Hardware ID (HWID) on first login.'
              : 'Users authenticate directly based on whether their machine Hardware ID (HWID) is manually authorized.'}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Application
          </Button>
        </div>
      </form>
    </Modal>
  );
}
