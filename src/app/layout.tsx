import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Gevyro Finanças — Seu dinheiro, com clareza',
  description:
    'Seu centro de controle financeiro pessoal. Organize contas, acompanhe compromissos e planeje seu futuro.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Gevyro Finanças' },
  icons: { icon: '/icon-32.png', apple: '/icon-192.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#059669' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
