import './globals.css';
import type { Metadata } from 'next';
import { ParticlesBackground } from '@/components/ui/ParticlesBackground';

export const metadata: Metadata = {
  title: 'Null-Auth — Private Licensing Platform',
  description: 'Private Admin Licensing & Authentication Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased selection:bg-red-500/30 selection:text-red-200 min-h-screen relative">
        <ParticlesBackground />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
