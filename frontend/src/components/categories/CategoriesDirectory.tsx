'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MagnifyingGlassIcon, ArrowRightIcon, ChevronDownIcon, CubeIcon } from '@heroicons/react/24/outline';

import type { CategoryNavigationNode } from '@/types';
import { CategoryService } from '@/services/category.service';
import { compareCategoriesByPopularity, isInternalCategory } from '@/lib/category-listing';

type Category = CategoryNavigationNode;

const FEATURED_BRAND_CARD_LIMIT = 36;

function filterPublicTree(nodes: Category[]): Category[] {
  return nodes
    .filter((node) => !isInternalCategory(node) && Number(node.product_count || 0) > 0)
    .map((node) => ({
      ...node,
      children: node.children ? filterPublicTree(node.children) : undefined,
    }))
    .sort(compareCategoriesByPopularity);
}

function flatten(nodes: Category[], parentPath = ''): Category[] {
  return nodes.flatMap((node) => {
    const path = node.path || (parentPath ? `${parentPath}/${node.slug}` : node.slug);
    return [{ ...node, path }, ...flatten(node.children || [], path)];
  });
}

// Backend AttachCategoryProductCounts already includes descendants in product_count.
function totalCount(category: Category): number {
  return Number(category.product_count || 0);
}

interface CategoriesDirectoryProps {
  categories: Category[];
  totalCategoryCount?: number;
  totalProductCount?: number;
}

export default function CategoriesDirectory({
  categories,
  totalCategoryCount,
  totalProductCount,
}: CategoriesDirectoryProps) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [fullTree, setFullTree] = useState<Category[] | null>(null);
  const [loadingFullTree, setLoadingFullTree] = useState(false);
  const fetchPromiseRef = useRef<Promise<Category[] | null> | null>(null);

  const rootCategories = useMemo(
    () =>
      categories
        .filter((node) => !isInternalCategory(node) && totalCount(node) > 0)
        .sort(compareCategoriesByPopularity),
    [categories],
  );

  const ensureFullTree = useCallback(async (): Promise<Category[] | null> => {
    if (fullTree) return fullTree;
    if (fetchPromiseRef.current) return fetchPromiseRef.current;

    setLoadingFullTree(true);
    const promise = CategoryService.getCategories()
      .then((raw) => {
        const filtered = filterPublicTree(raw);
        setFullTree(filtered);
        return filtered;
      })
      .catch(() => null)
      .finally(() => {
        setLoadingFullTree(false);
        fetchPromiseRef.current = null;
      });
    fetchPromiseRef.current = promise;
    return promise;
  }, [fullTree]);

  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());

  // Lazily load full subcategory tree only when the visitor searches or requests all subcategories.
  useEffect(() => {
    if ((deferredQuery.length > 0 || showAll) && !fullTree) {
      void ensureFullTree();
    }
  }, [deferredQuery, showAll, fullTree, ensureFullTree]);

  const flatAll = useMemo(() => {
    if (fullTree) return flatten(fullTree);
    return flatten(rootCategories);
  }, [fullTree, rootCategories]);

  const featuredRoots = useMemo(
    () => rootCategories.slice(0, FEATURED_BRAND_CARD_LIMIT),
    [rootCategories],
  );
  const moreRoots = useMemo(
    () => rootCategories.slice(FEATURED_BRAND_CARD_LIMIT),
    [rootCategories],
  );

  const visibleCards = useMemo(() => {
    if (deferredQuery) {
      return flatAll.filter((category) =>
        `${category.name} ${category.path || ''} ${category.description || ''}`
          .toLocaleLowerCase()
          .includes(deferredQuery),
      );
    }
    if (showAll) return flatAll;
    return featuredRoots;
  }, [deferredQuery, flatAll, showAll, featuredRoots]);

  const badgeCategoryCount =
    fullTree ? flatAll.length : (totalCategoryCount ?? flatAll.length);
  const badgeProductCount =
    totalProductCount ?? rootCategories.reduce((sum, category) => sum + totalCount(category), 0);
  const hasSubcategories = badgeCategoryCount > rootCategories.length;

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-[#081b33] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
        <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-yellow-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-yellow-300">
            FANUC &amp; automation parts
          </p>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Browse product categories
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
            Find servo drives, motors, control boards, I/O modules and other industrial automation parts by brand and category.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold">
            <span className="rounded-full bg-yellow-400 px-4 py-2 text-slate-950">
              {badgeCategoryCount.toLocaleString()} categories
            </span>
            <span className="rounded-full border border-white/20 px-4 py-2 text-white">
              {badgeProductCount.toLocaleString()} active products
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Shop by brand &amp; category</h2>
            <p className="mt-1 text-sm text-slate-600">Select a manufacturer or search across all subcategories.</p>
          </div>
          <div className="relative w-full sm:w-80">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search brands or categories..."
              aria-label="Search categories"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none ring-yellow-300 transition focus:border-yellow-500 focus:ring-2"
            />
          </div>
        </div>

        {loadingFullTree && (deferredQuery || showAll) && (
          <div className="mt-4 text-sm text-slate-500">Loading full category directory...</div>
        )}

        {visibleCards.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            No matching categories found.
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCards.map((category) => {
              const path = category.path || category.slug;
              const count = totalCount(category);
              return (
                <Link
                  key={`${category.id}-${path}`}
                  href={`/categories/${path}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-yellow-400 hover:shadow-xl"
                >
                  <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-yellow-50 via-white to-slate-100">
                    {category.image_url ? (
                      <Image
                        src={category.image_url}
                        alt={category.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <CubeIcon className="h-16 w-16 text-yellow-500 transition group-hover:scale-110" />
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-slate-950">
                      {count.toLocaleString()} products
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-slate-950 group-hover:text-yellow-700">
                      {category.name}
                    </h3>
                    <p className="mt-2 min-h-12 line-clamp-2 text-sm leading-6 text-slate-600">
                      {category.description || `Browse tested ${category.name} industrial automation parts.`}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-yellow-700">
                      View products <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Keep all remaining active brand roots directly crawlable in SSR HTML with minimal DOM overhead */}
        {!deferredQuery && !showAll && moreRoots.length > 0 && (
          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              More Brands &amp; Manufacturers ({moreRoots.length})
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {moreRoots.map((category) => {
                const path = category.path || category.slug;
                const count = totalCount(category);
                return (
                  <Link
                    key={category.id}
                    href={`/categories/${path}`}
                    className="rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-800"
                  >
                    {category.name}
                    <span className="ml-1.5 text-xs text-slate-400">{count.toLocaleString()}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {!deferredQuery && hasSubcategories && (
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            disabled={loadingFullTree}
            className="mx-auto mt-8 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-yellow-500 hover:text-yellow-700 disabled:opacity-60"
          >
            {loadingFullTree
              ? 'Loading subcategories...'
              : showAll
                ? 'Show top brands'
                : `Show all ${badgeCategoryCount.toLocaleString()} categories & subcategories`}
            <ChevronDownIcon className={`h-4 w-4 transition ${showAll ? 'rotate-180' : ''}`} />
          </button>
        )}
      </section>
    </main>
  );
}
