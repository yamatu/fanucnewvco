'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Category, CategoryNavigationNode } from '@/types';
import { CategoryService } from '@/services/category.service';
import { buildFullPublicNavigationTree, findCategoryTrailIds } from '@/lib/category-listing';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

type TreeItem = CategoryNavigationNode | Category;

type Props = {
  tree: TreeItem[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
  storageKey?: string;
  allLabel?: string;
  totalRootCount?: number;
};

export default function CategoryFilterTree({
  tree,
  selectedCategoryId,
  onSelectCategory,
  storageKey = 'products-category-open-ids',
  allLabel = 'All Products',
  totalRootCount,
}: Props) {
  const [fullTree, setFullTree] = useState<CategoryNavigationNode[] | null>(null);
  const [loadingFullTree, setLoadingFullTree] = useState(false);
  const [showAllRoots, setShowAllRoots] = useState(false);
  const fetchPromiseRef = useRef<Promise<CategoryNavigationNode[] | null> | null>(null);

  const displayTree: TreeItem[] = useMemo(() => {
    if (fullTree) {
      return showAllRoots ? fullTree : fullTree.slice(0, Math.max(tree.length, 25));
    }
    return tree;
  }, [fullTree, showAllRoots, tree]);

  const trail = useMemo(
    () => findCategoryTrailIds(displayTree, selectedCategoryId),
    [displayTree, selectedCategoryId],
  );

  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  const ensureFullTree = useCallback(async (): Promise<CategoryNavigationNode[] | null> => {
    if (fullTree) return fullTree;
    if (fetchPromiseRef.current) return fetchPromiseRef.current;

    setLoadingFullTree(true);
    const promise = CategoryService.getCategories()
      .then((raw) => {
        const normalized = buildFullPublicNavigationTree(raw, selectedCategoryId);
        setFullTree(normalized);
        return normalized;
      })
      .catch(() => null)
      .finally(() => {
        setLoadingFullTree(false);
        fetchPromiseRef.current = null;
      });
    fetchPromiseRef.current = promise;
    return promise;
  }, [fullTree, selectedCategoryId]);

  // Load persisted state
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      const restored = new Set<number>();
      for (const id of trail) restored.add(id);
      if (Array.isArray(parsed)) {
        for (const v of parsed) {
          const n = Number(v);
          if (Number.isFinite(n) && n > 0) restored.add(n);
        }
      }
      setOpenIds(restored);
    } catch {
      setOpenIds(new Set(trail));
    } finally {
      setHydrated(true);
    }
  }, [storageKey, trail]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(openIds)));
    } catch {
      // ignore
    }
  }, [hydrated, openIds, storageKey]);

  const handleToggle = async (node: TreeItem) => {
    const hasLoadedChildren = Array.isArray(node.children) && node.children.length > 0;
    const childCount = 'child_count' in node ? Number(node.child_count || 0) : 0;
    if (!hasLoadedChildren && childCount > 0) {
      await ensureFullTree();
      setOpenIds((prev) => {
        const next = new Set(prev);
        next.add(node.id);
        return next;
      });
      return;
    }

    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  };

  const renderNode = (node: TreeItem, depth: number) => {
    const hasLoadedChildren = Array.isArray(node.children) && node.children.length > 0;
    const childCount = 'child_count' in node ? Number(node.child_count || 0) : 0;
    const hasExpandableChildren = hasLoadedChildren || childCount > 0;
    const isOpen = hasLoadedChildren && (openIds.has(node.id) || (!hydrated && trail.includes(node.id)));
    const isSelected = selectedCategoryId === node.id;

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5',
            isSelected ? 'bg-yellow-100 text-yellow-900' : 'text-gray-800 hover:bg-gray-100',
          )}
        >
          <div style={{ width: depth * 12 }} />
          {hasExpandableChildren ? (
            <button
              type="button"
              onClick={() => void handleToggle(node)}
              className="p-0.5 rounded hover:bg-gray-200"
              aria-label={isOpen ? 'Collapse' : 'Expand'}
              aria-expanded={isOpen}
            >
              {isOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-5" />
          )}

          <button
            type="button"
            onClick={() => onSelectCategory(node.id)}
            className="min-w-0 flex-1 truncate text-left text-sm font-medium"
          >
            {node.name}
          </button>
        </div>

        {hasLoadedChildren && isOpen ? (
          <div className="mt-1 space-y-1">{node.children!.map((c) => renderNode(c, depth + 1))}</div>
        ) : null}
      </div>
    );
  };

  const hasSelection = useMemo(() => selectedCategoryId != null, [selectedCategoryId]);
  const effectiveTotalRoots = fullTree?.length ?? totalRootCount ?? displayTree.length;
  const hasMoreRoots = !showAllRoots && effectiveTotalRoots > displayTree.length;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={cn(
          'w-full rounded-md px-2 py-2 text-left text-sm font-medium',
          !hasSelection ? 'bg-yellow-100 text-yellow-900' : 'text-gray-800 hover:bg-gray-100',
        )}
      >
        {allLabel}
      </button>
      <div className="max-h-[60vh] space-y-1 overflow-y-auto overscroll-contain">
        {displayTree.map((n) => renderNode(n, 0))}
      </div>
      {hasMoreRoots && (
        <button
          type="button"
          onClick={async () => {
            await ensureFullTree();
            setShowAllRoots(true);
          }}
          disabled={loadingFullTree}
          className="mt-2 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-center text-xs font-semibold text-gray-700 hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-800 disabled:opacity-60"
        >
          {loadingFullTree ? 'Loading brands...' : `Show all ${effectiveTotalRoots} brands`}
        </button>
      )}
    </div>
  );
}
