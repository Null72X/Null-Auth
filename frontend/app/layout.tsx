import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Null-Auth — Private Licensing Platform',
  description: 'Private Admin Licensing & Authentication Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased selection:bg-red-500/30 selection:text-red-200">
        {children}
      </body>
    </html>
  );
}
