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
      className={`bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-[7px] p-5 shadow-lg transition-all duration-300 ${
        onClick
          ? 'cursor-pointer hover:border-red-500/40 hover:shadow-red-950/20 hover:-translate-y-0.5 active:translate-y-0'
          : 'hover:border-zinc-700/80'
      } ${className}`}
    >
      {children}
    </div>
  );
}
