'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { fetchApi } from '@/lib/api';
import { Key, Copy, Check, Download, Sparkles, Plus, Clock, Tag } from 'lucide-react';

interface AppOption {
  id: string;
  appId: string;
  name: string;
  type: string;
}

interface GeneratedLicense {
  id: string;
  key: string;
  expiresAt: string;
  notes?: string;
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
  const [appId, setAppId] = useState(defaultAppId || '');
  const [quantity, setQuantity] = useState(1);
  const [days, setDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generated Batch View State
  const [generatedBatch, setGeneratedBatch] = useState<GeneratedLicense[] | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGeneratedBatch(null);
      setError(null);
      setCopiedAll(false);
      if (defaultAppId && licenseApps.some((a) => a.id === defaultAppId)) {
        setAppId(defaultAppId);
      } else if (licenseApps.length > 0 && !appId) {
        setAppId(licenseApps[0].id);
      }
    }
  }, [isOpen, apps, defaultAppId]);

  const selectedAppId = appId || (licenseApps.length > 0 ? licenseApps[0].id : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const targetAppId = selectedAppId;

    if (!targetAppId) {
      setError('Please create a License-based application first.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetchApi('/admin/licenses/generate', {
        method: 'POST',
        body: JSON.stringify({
          appId: targetAppId,
          quantity: Number(quantity),
          days: Number(days),
          notes,
        }),
      });

      if (res.success && res.data) {
        setGeneratedBatch(res.data);
        onSuccess();
      } else {
        setError(res.message || 'Failed to generate licenses.');
      }
    } catch (err: any) {
      setError('An error occurred while generating licenses.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyIndividualKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyAllKeys = () => {
    if (!generatedBatch) return;
    const allText = generatedBatch.map((l) => l.key).join('\n');
    navigator.clipboard.writeText(allText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const downloadTxtFile = () => {
    if (!generatedBatch) return;
    const allText = generatedBatch.map((l) => l.key).join('\n');
    const element = document.createElement('a');
    const file = new Blob([allText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `NullAuth_Licenses_Batch_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={generatedBatch ? 'Batch Licenses Generated' : 'Advanced License Generator'}
      maxWidth={generatedBatch ? 'lg' : 'md'}
    >
      {!generatedBatch ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-[10px] bg-red-950/60 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
              <Key className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Application Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Target Application *
            </label>
            <select
              value={selectedAppId}
              onChange={(e) => setAppId(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold text-zinc-100 focus:outline-none focus:border-red-500"
            >
              {licenseApps.length === 0 && <option value="">No License-based apps found</option>}
              {licenseApps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name} ({app.appId})
                </option>
              ))}
            </select>
            {licenseApps.length === 0 && (
              <p className="text-xs text-red-400 mt-1.5">
                Please go to Applications and create a 'License Key' type app first.
              </p>
            )}
          </div>

          {/* Quantity & Duration Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Quantity (Keys to Generate) *
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm font-mono font-bold text-red-400 focus:outline-none focus:border-red-500"
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Duration Presets */}
          <div>
            <span className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Quick Duration Presets
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: '1 Day', value: 1 },
                { label: '7 Days', value: 7 },
                { label: '30 Days', value: 30 },
                { label: '90 Days', value: 90 },
                { label: '365 Days', value: 365 },
                { label: 'Lifetime', value: 9999 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setDays(preset.value)}
                  className={`px-3 py-1 rounded-[8px] text-xs font-mono font-bold border transition-all ${
                    days === preset.value
                      ? 'bg-red-950 text-red-400 border-red-700 shadow-sm'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Admin Notes / Customer Tag */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Customer / Reseller Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Reseller Order #482 / Customer John Doe"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} disabled={!selectedAppId} className="gap-2">
              <Sparkles className="w-4 h-4" /> Generate {quantity} Key(s)
            </Button>
          </div>
        </form>
      ) : (
        /* Batch Output View */
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-bold">
                Successfully Generated {generatedBatch.length} License Key(s)!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={copyAllKeys} className="gap-1.5 text-xs font-bold">
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy All Keys
              </Button>
              <Button size="sm" onClick={downloadTxtFile} className="gap-1.5 text-xs font-bold">
                <Download className="w-3.5 h-3.5" /> Download TXT
              </Button>
            </div>
          </div>

          {/* Keys Batch List Box */}
          <div className="p-4 rounded-[12px] bg-zinc-950 border border-zinc-800 space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar">
            {generatedBatch.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between p-2.5 rounded-[8px] bg-zinc-900 border border-zinc-800/80 font-mono text-xs hover:border-red-500/40 transition-all"
              >
                <span className="text-red-400 font-bold text-sm tracking-wide">{l.key}</span>
                <button
                  onClick={() => copyIndividualKey(l.key)}
                  className="p-1.5 rounded-[6px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
                  title="Copy Key"
                >
                  {copiedKey === l.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2 border-t border-zinc-800">
            <Button
              variant="secondary"
              onClick={() => {
                setGeneratedBatch(null);
                onClose();
              }}
            >
              Done & Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
