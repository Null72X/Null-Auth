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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-red-500/30 selection:text-red-200 min-h-screen relative font-sans">
        <ParticlesBackground />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
