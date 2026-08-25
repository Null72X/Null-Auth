import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:border-zinc-700' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
