import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', onClick, style }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`bg-zinc-900/85 backdrop-blur-2xl border border-zinc-800/80 rounded-[7px] p-5 shadow-xl transition-all duration-300 relative overflow-hidden group ${
        onClick
          ? 'cursor-pointer hover:border-red-500/50 hover:shadow-[0_0_25px_rgba(239,68,68,0.15)] hover:-translate-y-1 active:translate-y-0'
          : 'hover:border-zinc-700/80 hover:shadow-[0_0_20px_rgba(0,0,0,0.4)]'
      } ${className}`}
    >
      {/* Subtle Top Glow Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      {children}
    </div>
  );
}
