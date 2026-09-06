import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import CategoriesDirectory from '@/components/categories/CategoriesDirectory';
import type { Category, CategoryNavigationNode } from '@/types';

export const revalidate = 300;
// The backend service is only resolvable at runtime in Docker Compose. Avoid
// baking an empty category list into the static build when the API is not
// available during `docker-compose build`.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { absolute: 'FANUC Product Categories | Vcocnc' },
  description: 'Browse FANUC and industrial automation parts by product category.',
  alternates: { canonical: '/categories' },
};
function toNavigationCategory(category: Category): CategoryNavigationNode {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    path: category.path,
    description: category.description,
    image_url: category.image_url,
    sort_order: category.sort_order,
    product_count: category.product_count,
    children: category.children?.map(toNavigationCategory),
  };
}

async function getCategories(): Promise<CategoryNavigationNode[]> {
  const backend = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
  try {
    const response = await fetch(`${backend}/api/v1/public/categories`, { next: { revalidate: 300, tags: ['categories'] } });
    if (!response.ok) return [];
    const payload = await response.json() as { success?: boolean; data?: Category[] };
    return payload.success && Array.isArray(payload.data) ? payload.data.map(toNavigationCategory) : [];
  } catch { return []; }
}

export default async function CategoriesPage() {
  return <PublicLayout><CategoriesDirectory categories={await getCategories()} /></PublicLayout>;
}
