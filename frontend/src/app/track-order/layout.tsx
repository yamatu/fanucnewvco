import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Order',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
