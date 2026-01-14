import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';

export const metadata: Metadata = {
  title: 'Returns | Vcocnc',
  description: 'Returns policy and process for Vcocnc products.',
};

export default function ReturnsPage() {
  return (
    <PublicLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-6">Returns</h1>
        <p className="text-gray-600">Returns policy is coming soon.</p>
      </main>
    </PublicLayout>
  );
}

