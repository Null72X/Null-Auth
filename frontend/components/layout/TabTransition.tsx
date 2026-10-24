'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export function TabTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-panel-slide w-full">
      {children}
    </div>
  );
}

export default TabTransition;
