'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  size,
  className = '',
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const effectiveSize = size || maxWidth;
  let widthClass = 'max-w-md';
  if (effectiveSize === 'sm') widthClass = 'max-w-sm';
  if (effectiveSize === 'lg') widthClass = 'max-w-lg';
  if (effectiveSize === 'xl') widthClass = 'max-w-xl';
  if (effectiveSize === '2xl') widthClass = 'max-w-2xl';
  if (effectiveSize === '3xl') widthClass = 'max-w-3xl';
  if (effectiveSize === '4xl') widthClass = 'max-w-4xl';
  if (effectiveSize === '5xl') widthClass = 'max-w-5xl';
  if (effectiveSize === '6xl') widthClass = 'max-w-6xl';
  if (effectiveSize === 'full') widthClass = 'max-w-[95vw]';

  const modalElement = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${widthClass} bg-[#0c0c12] border border-white/15 rounded-[16px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[90vh] animate-scale-in relative ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle accent line on top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#12121a] shrink-0">
          <h3 className="text-base font-bold text-zinc-100 font-sans tracking-wide">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-zinc-400 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/15 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
}
