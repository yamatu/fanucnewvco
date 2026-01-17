'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { XMarkIcon, MagnifyingGlassIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { MediaService } from '@/services';
import { queryKeys } from '@/lib/react-query';
import type { MediaAsset } from '@/services/media.service';
import { useAdminI18n } from '@/lib/admin-i18n';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (assets: MediaAsset[]) => void;
  multiple?: boolean;
  title?: string;
};

export default function MediaPickerModal({ open, onClose, onSelect, multiple = false, title = 'Select from Media Library' }: Props) {
  const { t } = useAdminI18n();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 24;
  const [selected, setSelected] = useState<MediaAsset[]>([]);

  const filters = useMemo(() => ({ q, page, pageSize }), [q, page]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.media.list(filters),
    queryFn: () => MediaService.list({ q: q.trim() || undefined, page, page_size: pageSize }),
    enabled: open,
    retry: 1,
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const isSelected = (id: number) => selected.some((s) => s.id === id);

  const toggle = (asset: MediaAsset) => {
    if (!multiple) {
      setSelected([asset]);
      return;
    }
    setSelected((prev) => (prev.some((x) => x.id === asset.id) ? prev.filter((x) => x.id !== asset.id) : [...prev, asset]));
  };

  const confirm = () => {
    if (selected.length === 0) return;
    onSelect(selected);
    setSelected([]);
    setQ('');
    setPage(1);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('media.picker.search', 'Search...')}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {t('media.picker.selected', 'Selected: {count}', { count: selected.length })}{' '}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-10 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-3 text-gray-500 text-sm">{t('media.picker.loading', 'Loading...')}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center">
                <PhotoIcon className="h-10 w-10 text-gray-300 mx-auto" />
                <p className="mt-3 text-gray-500 text-sm">{t('media.picker.empty', 'No images found')}</p>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {items.map((asset) => {
                  const sel = isSelected(asset.id);
                  return (
                    <button
                      type="button"
                      key={asset.id}
                      onClick={() => toggle(asset)}
                      className={`text-left border rounded-lg overflow-hidden bg-white hover:border-gray-300 ${
                        sel ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200'
                      }`}
                      title={asset.original_name}
                    >
                      <div className="aspect-square bg-gray-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={asset.url} alt={asset.alt_text || asset.original_name} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                      <div className="p-2">
                        <div className="text-xs font-medium text-gray-900 truncate">{asset.original_name}</div>
                        <div className="text-[11px] text-gray-500 truncate">{asset.folder ? `/${asset.folder}` : '—'}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {t('media.picker.total', 'Total: {total}', { total })}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-2 text-sm rounded-md border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
              >
                {t('media.picker.prev', 'Prev')}
              </button>
              <div className="text-sm text-gray-700">
                {t('common.page', 'Page {page} / {pages}', { page, pages: totalPages })}
              </div>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-2 text-sm rounded-md border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
              >
                {t('media.picker.next', 'Next')}
              </button>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50">
              {t('media.picker.cancel', 'Cancel')}
            </button>
            <button
              onClick={confirm}
              disabled={selected.length === 0}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {t('media.picker.useSelected', 'Use Selected')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
