import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  let variantClasses =
    'btn-red-gradient text-white border border-red-500/40 font-bold';

  if (variant === 'secondary') {
    variantClasses =
      'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 shadow-sm backdrop-blur-md';
  } else if (variant === 'outline') {
    variantClasses =
      'bg-transparent hover:bg-zinc-800/60 text-zinc-300 border border-zinc-700 hover:border-zinc-600';
  } else if (variant === 'danger') {
    variantClasses =
      'bg-red-950/80 hover:bg-red-900/90 text-red-200 border border-red-800/60 shadow-sm shadow-red-950/40';
  }

  let sizeClasses = 'px-4 py-2.5 text-xs';
  if (size === 'sm') sizeClasses = 'px-3 py-1.5 text-xs';
  if (size === 'lg') sizeClasses = 'px-6 py-3 text-sm';

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-bold tracking-wide rounded-[10px] transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-red-500/50 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
