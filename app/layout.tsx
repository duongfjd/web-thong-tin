import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Community Platform',
  description: 'Connect, share, and grow together in our modern social community platform',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
