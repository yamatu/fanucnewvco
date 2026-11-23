import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import CategoriesDirectory from '@/components/categories/CategoriesDirectory';
import { compareCategoriesByPopularity, isInternalCategory } from '@/lib/category-listing';
import type { Category, CategoryNavigationNode } from '@/types';

export const revalidate = 300;
// The backend service is only resolvable at runtime in Docker Compose. Avoid
// baking an empty category list into the static build when the API is not
// available during `docker-compose build`.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { absolute: 'Product Categories – FANUC & Automation Parts | Vcocnc' },
  description: 'Browse FANUC and multi-brand industrial automation parts by manufacturer and product category.',
  alternates: { canonical: '/categories' },
};

function trimSummary(value: string | undefined, maxLength = 160): string | undefined {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return undefined;
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3).trim()}...` : cleaned;
}

function countActiveCategories(nodes: readonly Category[] | undefined): number {
  if (!nodes) return 0;
  let total = 0;
  for (const node of nodes) {
    if (isInternalCategory(node) || Number(node.product_count || 0) <= 0) continue;
    total += 1 + countActiveCategories(node.children);
  }
  return total;
}

function toDirectoryRootNode(category: Category): CategoryNavigationNode {
  const activeChildren = (category.children || []).filter(
    (child) => !isInternalCategory(child) && Number(child.product_count || 0) > 0,
  );
  const node: CategoryNavigationNode = {
    id: category.id,
    name: category.name,
    slug: category.slug,
    path: category.path,
    product_count: category.product_count,
  };
  const summary = trimSummary(category.description);
  if (summary) node.description = summary;
  if (category.image_url) node.image_url = category.image_url;
  if (activeChildren.length > 0) node.child_count = activeChildren.length;
  return node;
}

async function getCategoriesIndex(): Promise<{
  roots: CategoryNavigationNode[];
  totalCategoryCount: number;
  totalProductCount: number;
}> {
  const backend = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
  try {
    const response = await fetch(`${backend}/api/v1/public/categories`, {
      next: { revalidate: 300, tags: ['categories'] },
    });
    if (!response.ok) return { roots: [], totalCategoryCount: 0, totalProductCount: 0 };
    const payload = (await response.json()) as { success?: boolean; data?: Category[] };
    const raw = payload.success && Array.isArray(payload.data) ? payload.data : [];
    const activeRoots = raw
      .filter((category) => !isInternalCategory(category) && Number(category.product_count || 0) > 0)
      .sort(compareCategoriesByPopularity);
    const totalCategoryCount = countActiveCategories(activeRoots);
    const totalProductCount = activeRoots.reduce(
      (sum, category) => sum + Number(category.product_count || 0),
      0,
    );
    return {
      roots: activeRoots.map(toDirectoryRootNode),
      totalCategoryCount,
      totalProductCount,
    };
  } catch {
    return { roots: [], totalCategoryCount: 0, totalProductCount: 0 };
  }
}

export default async function CategoriesPage() {
  const { roots, totalCategoryCount, totalProductCount } = await getCategoriesIndex();
  return (
    <PublicLayout>
      <CategoriesDirectory
        categories={roots}
        totalCategoryCount={totalCategoryCount}
        totalProductCount={totalProductCount}
      />
    </PublicLayout>
  );
}
