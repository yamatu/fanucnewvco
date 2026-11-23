'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export interface SubcategoryBarItem {
  id: number;
  name: string;
  href: string;
  count: number;
}

interface CategorySubcategoriesBarProps {
  displayName: string;
  subcategories: SubcategoryBarItem[];
  initialLimit?: number;
}

export default function CategorySubcategoriesBar({
  displayName,
  subcategories,
  initialLimit = 8,
}: CategorySubcategoriesBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');

  const total = subcategories.length;
  const hasOverflow = total > initialLimit;
  const normalizedQuery = query.trim().toLowerCase();

  const visibleItems = useMemo(() => {
    if (!expanded) {
      return subcategories.slice(0, initialLimit);
    }
    if (!normalizedQuery) {
      return subcategories;
    }
    return subcategories.filter((item) =>
      item.name.toLowerCase().includes(normalizedQuery),
    );
  }, [expanded, initialLimit, normalizedQuery, subcategories]);

  if (total === 0) return null;

  const remainingCount = Math.max(0, total - initialLimit);

  return (
    <div className="bg-white rounded-lg shadow p-3.5 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 truncate">
            {hasOverflow && !expanded
              ? `Popular ${displayName} Subcategories`
              : `${displayName} Subcategories`}
          </h2>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {total}
          </span>
        </div>

        {hasOverflow && (
          <button
            type="button"
            onClick={() => {
              setExpanded((prev) => {
                if (prev) setQuery('');
                return !prev;
              });
            }}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-800 transition-colors"
          >
            {expanded ? (
              <>
                <span>Show less</span>
                <ChevronUpIcon className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>Show all {total}</span>
                <ChevronDownIcon className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}
      </div>

      {expanded && hasOverflow && (
        <div className="relative mb-2.5">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter ${total} subcategories (e.g. PLC, servo, cable)...`}
            aria-label={`Filter ${displayName} subcategories`}
            className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-8 text-xs text-gray-900 placeholder:text-gray-400 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear subcategory filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {visibleItems.length > 0 ? (
        <div
          className={
            expanded
              ? 'max-h-60 overflow-y-auto overscroll-contain pr-1 flex flex-wrap gap-1.5'
              : 'flex flex-wrap gap-1.5'
          }
        >
          {visibleItems.map((child) => (
            <Link
              key={child.id}
              href={child.href}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-800 hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-900 transition-colors"
            >
              <span>{child.name}</span>
              <span className="text-[11px] text-gray-500">({child.count})</span>
            </Link>
          ))}

          {!expanded && remainingCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-yellow-400 bg-yellow-50/70 px-2.5 py-1 text-xs font-semibold text-yellow-800 hover:bg-yellow-100 transition-colors"
            >
              +{remainingCount} more
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <span>No subcategories match &ldquo;{query}&rdquo;.</span>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="font-semibold text-yellow-700 hover:text-yellow-800"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
