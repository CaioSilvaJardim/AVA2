import type { Metadata } from 'next';
import './globals.css';
import { CRTOverlay } from '@/components/CRTOverlay';

export const metadata: Metadata = {
  title: 'SYSTEM://AVA',
  description: 'Interface acadêmica alternativa',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⬛</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#08080c] text-zinc-200 font-mono antialiased overflow-x-hidden">
        <CRTOverlay />
        {children}
      </body>
    </html>
  );
}
