'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let widthClass = 'max-w-md';
  if (maxWidth === 'sm') widthClass = 'max-w-sm';
  if (maxWidth === 'lg') widthClass = 'max-w-lg';
  if (maxWidth === 'xl') widthClass = 'max-w-xl';
  if (maxWidth === '2xl') widthClass = 'max-w-2xl';
  if (maxWidth === '3xl') widthClass = 'max-w-3xl';
  if (maxWidth === '4xl') widthClass = 'max-w-4xl';
  if (maxWidth === '5xl') widthClass = 'max-w-5xl';
  if (maxWidth === '6xl') widthClass = 'max-w-6xl';
  if (maxWidth === 'full') widthClass = 'max-w-[95vw]';

  return (
    <div
      onWheel={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in"
    >
      <div
        className={`w-full ${widthClass} bg-zinc-950/95 border border-zinc-800/90 rounded-[14px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in border-red-500/20`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
          <h3 className="text-base font-bold text-zinc-100 font-sans tracking-wide">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors border border-transparent hover:border-zinc-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
}
