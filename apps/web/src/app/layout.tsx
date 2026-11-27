import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CINEORA — AI Video Production Studio',
  description: 'Cinema-grade AI video production platform with automated QC and quality-preserving FFmpeg rendering.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
