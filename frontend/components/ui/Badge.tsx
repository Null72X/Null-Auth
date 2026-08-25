import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export function Badge({ status, className = '' }: BadgeProps) {
  const s = status.toUpperCase();

  let colorClasses = 'bg-zinc-800 text-zinc-300 border-zinc-700';

  if (s === 'ACTIVE') {
    colorClasses = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50';
  } else if (s === 'PAUSED') {
    colorClasses = 'bg-amber-950/80 text-amber-400 border-amber-800/50';
  } else if (s === 'EXPIRED') {
    colorClasses = 'bg-zinc-800 text-zinc-400 border-zinc-700';
  } else if (s === 'BANNED') {
    colorClasses = 'bg-red-950/80 text-red-400 border-red-800/50';
  } else if (s === 'LICENSE') {
    colorClasses = 'bg-blue-950/80 text-blue-400 border-blue-800/50';
  } else if (s === 'HWID') {
    colorClasses = 'bg-purple-950/80 text-purple-400 border-purple-800/50';
  } else if (s === 'SUCCESS') {
    colorClasses = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50';
  } else if (s === 'FAILURE') {
    colorClasses = 'bg-red-950/80 text-red-400 border-red-800/50';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          s === 'ACTIVE' || s === 'SUCCESS'
            ? 'bg-emerald-400'
            : s === 'PAUSED'
            ? 'bg-amber-400'
            : s === 'BANNED' || s === 'FAILURE'
            ? 'bg-red-400'
            : 'bg-zinc-400'
        }`}
      />
      {status}
    </span>
  );
}
