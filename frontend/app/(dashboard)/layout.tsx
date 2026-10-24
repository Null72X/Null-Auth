import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TabTransition } from '@/components/layout/TabTransition';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen text-zinc-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-8 overflow-y-auto">
          <TabTransition>{children}</TabTransition>
        </main>
      </div>
    </div>
  );
}
