'use client';

import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold text-white tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}
