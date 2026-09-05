import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import CategoriesDirectory from '@/components/categories/CategoriesDirectory';

export const revalidate = 300;
// The backend service is only resolvable at runtime in Docker Compose. Avoid
// baking an empty category list into the static build when the API is not
// available during `docker-compose build`.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Product Categories | FANUC Automation Parts', description: 'Browse FANUC and industrial automation parts by product category.', alternates: { canonical: '/categories' } };
type Category = { id: number; name: string; slug: string; path?: string; description?: string; image_url?: string; product_count?: number; children?: Category[] };

async function getCategories(): Promise<Category[]> {
  const backend = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
  try {
    const response = await fetch(`${backend}/api/v1/public/categories`, { next: { revalidate: 300, tags: ['categories'] } });
    if (!response.ok) return [];
    const payload = await response.json() as { success?: boolean; data?: Category[] };
    return payload.success && Array.isArray(payload.data) ? payload.data : [];
  } catch { return []; }
}

export default async function CategoriesPage() {
  return <PublicLayout><CategoriesDirectory categories={await getCategories()} /></PublicLayout>;
}
