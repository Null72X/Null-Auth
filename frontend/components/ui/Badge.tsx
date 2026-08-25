import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export function Badge({ status, className = '' }: BadgeProps) {
  const s = status.toUpperCase();

  let colorClasses = 'bg-zinc-800/80 text-zinc-300 border-zinc-700/80';

  if (s === 'ACTIVE') {
    colorClasses = 'bg-emerald-950/90 text-emerald-300 border-emerald-800/60 shadow-sm shadow-emerald-950/40';
  } else if (s === 'PAUSED') {
    colorClasses = 'bg-amber-950/90 text-amber-300 border-amber-800/60 shadow-sm shadow-amber-950/40';
  } else if (s === 'EXPIRED') {
    colorClasses = 'bg-zinc-900 text-zinc-400 border-zinc-800';
  } else if (s === 'BANNED') {
    colorClasses = 'bg-red-950/90 text-red-300 border-red-800/60 shadow-sm shadow-red-950/40';
  } else if (s === 'LICENSE') {
    colorClasses = 'bg-blue-950/90 text-blue-300 border-blue-800/60 shadow-sm shadow-blue-950/40';
  } else if (s === 'HWID') {
    colorClasses = 'bg-purple-950/90 text-purple-300 border-purple-800/60 shadow-sm shadow-purple-950/40';
  } else if (s === 'SUCCESS') {
    colorClasses = 'bg-emerald-950/90 text-emerald-300 border-emerald-800/60 shadow-sm shadow-emerald-950/40';
  } else if (s === 'FAILURE') {
    colorClasses = 'bg-red-950/90 text-red-300 border-red-800/60 shadow-sm shadow-red-950/40';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-sm transition-all ${colorClasses} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          s === 'ACTIVE' || s === 'SUCCESS'
            ? 'bg-emerald-400 animate-pulse'
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
