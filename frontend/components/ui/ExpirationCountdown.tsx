'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getExpirationInfo, ExpirationInfo } from '@/lib/time';

export interface ExpirationCountdownProps {
  expiresAt?: string | Date | null;
  remainingDays?: number | null;
  /**
   * If true, displays compact format (e.g. '14h 32m left' or '15d left')
   */
  compact?: boolean;
  /**
   * If true, renders as a badge with themed background and border
   */
  badge?: boolean;
  /**
   * Whether to show the clock icon when <= 24 hours left (defaults to true)
   */
  showIcon?: boolean;
  /**
   * If true, renders a 2-line layout with the expiration/timer on top
   * and the formatted date or 'No Expiry' on the bottom (for table cells)
   */
  showDateSubtext?: boolean;
  /**
   * If true, renders as an inline span without extra wrappers
   */
  inline?: boolean;
  /**
   * Optional custom styling class for outer element
   */
  className?: string;
  /**
   * Optional custom styling class for date subtext
   */
  subtextClassName?: string;
}

// Shared singleton ticker subscriber to eliminate multiple timers
type TickListener = () => void;
const tickerListeners = new Set<TickListener>();
let globalTicker: ReturnType<typeof setInterval> | null = null;

function subscribeToTicker(listener: TickListener): () => void {
  tickerListeners.add(listener);
  if (!globalTicker && typeof window !== 'undefined') {
    globalTicker = setInterval(() => {
      tickerListeners.forEach((fn) => fn());
    }, 1000);
  }
  return () => {
    tickerListeners.delete(listener);
    if (tickerListeners.size === 0 && globalTicker) {
      clearInterval(globalTicker);
      globalTicker = null;
    }
  };
}

export function ExpirationCountdown({
  expiresAt,
  remainingDays,
  compact = false,
  badge = false,
  showIcon = true,
  showDateSubtext = false,
  inline = false,
  className = '',
  subtextClassName = '',
}: ExpirationCountdownProps) {
  const [info, setInfo] = useState<ExpirationInfo>(() =>
    getExpirationInfo(expiresAt, remainingDays)
  );

  useEffect(() => {
    const initial = getExpirationInfo(expiresAt, remainingDays);
    setInfo(initial);

    if (initial.isLifetime || initial.isExpired) return;

    // Subscribe to the shared 1-second global heartbeat
    const unsubscribe = subscribeToTicker(() => {
      setInfo(getExpirationInfo(expiresAt, remainingDays));
    });

    return unsubscribe;
  }, [expiresAt, remainingDays]);

  const displayText = compact ? info.compactText : info.formattedText;

  // Variant A: Two-line layout for table rows (Top: Timer/Status, Bottom: Date/No Expiry)
  if (showDateSubtext) {
    return (
      <div className={className || 'space-y-1'}>
        <div className="font-bold flex items-center gap-1.5">
          {info.isUrgent && showIcon && (
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
          )}
          <span
            className={
              info.isUrgent
                ? 'text-amber-400 font-mono'
                : info.isExpired
                ? 'text-rose-400'
                : 'text-zinc-200'
            }
          >
            {displayText}
          </span>
        </div>
        <span className={subtextClassName || 'text-[11px] text-zinc-500 block'}>
          {info.isLifetime
            ? 'No Expiry'
            : info.isUrgent && expiresAt
            ? `${new Date(expiresAt).toLocaleDateString()} (Expiring soon)`
            : expiresAt
            ? new Date(expiresAt).toLocaleDateString()
            : 'No Expiry'}
        </span>
      </div>
    );
  }

  // Variant B: Styled pill badge (used for free trial badge in cards)
  if (badge) {
    let badgeColor = 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40';
    if (info.isUrgent) {
      badgeColor = 'bg-amber-950/60 text-amber-300 border-amber-600/50';
    } else if (info.isExpired) {
      badgeColor = 'bg-rose-950/60 text-rose-300 border-rose-800/40';
    }

    return (
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border inline-flex items-center gap-1 ${badgeColor} ${className}`}
      >
        {info.isUrgent && showIcon && (
          <Clock className="w-2.5 h-2.5 text-amber-400 animate-pulse shrink-0" />
        )}
        <span>{displayText}</span>
      </span>
    );
  }

  // Variant C: Inline format (e.g. inside a button or sentence)
  if (inline) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${
          info.isUrgent
            ? 'text-amber-300 font-mono font-bold'
            : info.isExpired
            ? 'text-rose-400 font-bold'
            : ''
        } ${className}`}
      >
        {info.isUrgent && showIcon && (
          <Clock className="w-2.5 h-2.5 text-amber-400 animate-pulse shrink-0" />
        )}
        <span>{displayText}</span>
      </span>
    );
  }

  // Variant D: Default standalone text with font-mono styling
  return (
    <span
      className={`font-mono font-bold inline-flex items-center gap-1.5 ${
        info.isUrgent
          ? 'text-amber-400'
          : info.isExpired
          ? 'text-rose-400'
          : 'text-emerald-400'
      } ${className}`}
    >
      {info.isUrgent && showIcon && (
        <Clock className="w-3 h-3 text-amber-400 animate-pulse shrink-0" />
      )}
      <span>{displayText}</span>
    </span>
  );
}
