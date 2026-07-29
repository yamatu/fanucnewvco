'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { Category } from '@/types';
import { useAdminI18n } from '@/lib/admin-i18n';

type CategoryLike = Pick<Category, 'id' | 'name' | 'slug' | 'path' | 'description'>;

function categoryLabel(c: CategoryLike): string {
	return (c.path && String(c.path).trim()) || c.name;
}

function normalizeSearchText(value: unknown): string {
	return String(value || '')
		.normalize('NFKC')
		.toLocaleLowerCase()
		.replace(/[>›»/\\|_.:：()[\]{}-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function categorySearchScore(category: CategoryLike, rawQuery: string): number {
	const query = normalizeSearchText(rawQuery);
	if (!query) return 1;

	const label = normalizeSearchText(categoryLabel(category));
	const name = normalizeSearchText(category.name);
	const slug = normalizeSearchText(category.slug);
	const path = normalizeSearchText(category.path);
	const description = normalizeSearchText(category.description);
	const searchable = [name, slug, path, label, description].filter(Boolean).join(' ');
	const compactQuery = query.replace(/\s/g, '');
	const compactSearchable = searchable.replace(/\s/g, '');

	if (name === query || slug === query || path === query) return 1000;
	if (name.startsWith(query) || label.startsWith(query)) return 800;
	if (searchable.includes(query)) return 600;
	if (compactQuery && compactSearchable.includes(compactQuery)) return 500;

	const tokens = query.split(' ').filter(Boolean);
	const tokenMatches = tokens.every((token) => {
		if (searchable.includes(token)) return true;
		// Typing model fragments such as "servo motor" or "a06b6089" can skip
		// punctuation and a few intervening characters while preserving order.
		const fuzzyPattern = token.split('').map(escapeRegExp).join('[^\\s]{0,4}');
		return new RegExp(fuzzyPattern, 'i').test(compactSearchable);
	});
	return tokenMatches ? 300 : 0;
}

export default function CategoryCombobox(props: {
	categories: CategoryLike[];
	value?: number | string | null;
	onChange: (categoryId: number) => void;
	placeholder?: string;
	className?: string;
}) {
	const { categories, value, onChange, placeholder, className } = props;
	const { locale, t } = useAdminI18n();

	const rootRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [activeIndex, setActiveIndex] = useState(0);

	const selectedId = value == null || value === '' ? 0 : Number(value);
	const selected = useMemo(() => {
		if (!Array.isArray(categories) || !selectedId) return undefined;
		return categories.find((c) => Number(c.id) === selectedId);
	}, [categories, selectedId]);

	useEffect(() => {
		// Keep input text in sync when selection changes (without interrupting typing).
		if (!open) {
			setQuery(selected ? categoryLabel(selected) : '');
		}
	}, [open, selected]);

	const normalizedQuery = normalizeSearchText(query);
	const results = useMemo(() => {
		if (!Array.isArray(categories)) return [];
		if (!normalizedQuery) return categories;
		return categories
			.map((category, index) => ({ category, index, score: categorySearchScore(category, normalizedQuery) }))
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score || a.index - b.index)
			.map((item) => item.category);
	}, [categories, normalizedQuery]);

	const visibleResults = useMemo(() => {
		// Keep the currently selected option visible even if it doesn't match the query.
		if (!selected || !selectedId) return results;
		const hasSelected = results.some((c) => Number(c.id) === selectedId);
		return hasSelected ? results : [selected, ...results];
	}, [results, selected, selectedId]);

	useEffect(() => {
		if (!open) return;
		setActiveIndex(0);
	}, [normalizedQuery, open]);

	useEffect(() => {
		const onDocPointerDown = (e: MouseEvent) => {
			const root = rootRef.current;
			if (!root) return;
			if (root.contains(e.target as Node)) return;
			setOpen(false);
		};
		document.addEventListener('mousedown', onDocPointerDown);
		return () => document.removeEventListener('mousedown', onDocPointerDown);
	}, []);

	const selectCategory = (cat: CategoryLike) => {
		onChange(Number(cat.id));
		setQuery(categoryLabel(cat));
		setOpen(false);
	};

	return (
		<div ref={rootRef} className={className}>
			<div className="relative">
				<input
					ref={inputRef}
					type="text"
					value={query}
					onFocus={() => setOpen(true)}
					onBlur={() => {
						// Close on keyboard tab-away; clicking options uses onMouseDown to prevent blur.
						setTimeout(() => setOpen(false), 80);
					}}
					onChange={(e) => {
						setQuery(e.target.value);
						setOpen(true);
					}}
					onKeyDown={(e) => {
						if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
							setOpen(true);
							return;
						}
						if (e.key === 'Escape') {
							setOpen(false);
							return;
						}
						if (!open) return;
						if (e.key === 'ArrowDown') {
							e.preventDefault();
							setActiveIndex((i) => Math.min(i + 1, Math.max(0, visibleResults.length - 1)));
							return;
						}
						if (e.key === 'ArrowUp') {
							e.preventDefault();
							setActiveIndex((i) => Math.max(0, i - 1));
							return;
						}
						if (e.key === 'Enter') {
							e.preventDefault();
							const hit = visibleResults[activeIndex];
							if (hit) selectCategory(hit);
						}
					}}
					className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					placeholder={
						placeholder ||
						t('categories.combobox.placeholder', locale === 'zh' ? '输入关键词搜索分类' : 'Type to search categories')
					}
					autoComplete="off"
				/>

				{open ? (
					<div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
						<div className="max-h-64 overflow-auto py-1">
							{visibleResults.length === 0 ? (
								<div className="px-3 py-2 text-sm text-gray-500">
									{t(
										'categories.combobox.noMatch',
										locale === 'zh' ? '没有匹配的分类："{query}"' : 'No categories match "{query}"',
										{ query }
									)}
								</div>
							) : (
								visibleResults.slice(0, 200).map((c, idx) => {
									const isActive = idx === activeIndex;
									const isSelected = Boolean(selectedId && Number(c.id) === selectedId);
									return (
										<div
											key={c.id}
											role="option"
											aria-selected={isSelected}
											onMouseEnter={() => setActiveIndex(idx)}
											onMouseDown={(e) => {
												// Prevent input blur before selection.
												e.preventDefault();
												selectCategory(c);
											}}
											className={
												'cursor-pointer px-3 py-2 text-sm ' +
												(isActive ? 'bg-blue-50 text-gray-900' : 'text-gray-700')
											}
										>
											<span className={isSelected ? 'font-semibold' : 'font-normal'}>{categoryLabel(c)}</span>
										</div>
									);
								})
							)}
						</div>
					</div>
				) : null}
			</div>
			{selected ? (
				<p className="mt-1 text-xs text-gray-500">
					{t('common.selected', locale === 'zh' ? '已选择' : 'Selected')}: {categoryLabel(selected)}
				</p>
			) : null}
		</div>
	);
}
