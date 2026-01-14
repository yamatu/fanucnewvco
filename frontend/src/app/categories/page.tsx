import PublicLayout from '@/components/layout/PublicLayout';
import CategoriesClient from '@/components/categories/CategoriesClient';
import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/url';

export const metadata: Metadata = {
  title: 'Product Categories | Vcocnc FANUC Parts',
  description: 'Browse all FANUC part categories: servo motors, PCB boards, I/O modules, control units, and more. Fresh, server-rendered category listing to help discovery.',
  alternates: {
    canonical: `${getSiteUrl()}/categories`,
  },
  openGraph: {
    title: 'Product Categories | Vcocnc',
    description: 'Browse all FANUC part categories and discover related products.',
    url: `${getSiteUrl()}/categories`,
    type: 'website',
  },
};

export default function CategoriesPage() {
  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900">Product Categories</h1>
          <p className="mt-3 text-base text-gray-500">
            Browse all our categories. Newly added active categories in Admin will appear here automatically.
          </p>
        </div>
        <CategoriesClient />
      </div>
    </PublicLayout>
  );
}
