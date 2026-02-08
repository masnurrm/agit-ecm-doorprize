import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AGIT ECM 2026 Doorprize',
  description: 'Professional prize draw system with attendance verification',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">{children}</body>
    </html>
  );
}
