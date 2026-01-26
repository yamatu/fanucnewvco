'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  SparklesIcon,
  StarIcon,
  TrashIcon,
  XMarkIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

import AdminLayout from '@/components/admin/AdminLayout';
import { MediaService } from '@/services';
import { queryKeys } from '@/lib/react-query';
import type { MediaAsset, MediaUploadResponse } from '@/services/media.service';
import { useAdminI18n } from '@/lib/admin-i18n';

function formatBytes(bytes: number) {
  if (!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export default function AdminMediaPage() {
  const { t } = useAdminI18n();
  const queryClient = useQueryClient();

  const [q, setQ] = useState('');
  const [folder, setFolder] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Watermark
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [watermarkAssetId, setWatermarkAssetId] = useState<number | null>(null);
  const [watermarkTextSource, setWatermarkTextSource] = useState<'sku' | 'custom'>('sku');
  const [watermarkSku, setWatermarkSku] = useState('');
  const [watermarkText, setWatermarkText] = useState('');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadFolder, setUploadFolder] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [batchFolder, setBatchFolder] = useState('');
  const [batchTags, setBatchTags] = useState('');

  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAlt, setEditAlt] = useState('');
  const [editFolder, setEditFolder] = useState('');
  const [editTags, setEditTags] = useState('');

  const filters = useMemo(() => ({ q, folder, page, pageSize }), [q, folder, page, pageSize]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.media.list(filters),
    queryFn: () =>
      MediaService.list({
        q: q.trim() || undefined,
        folder: folder.trim() || undefined,
        page,
        page_size: pageSize,
      }),
    retry: 1,
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const singleSelectedId = selectedIds.length === 1 ? selectedIds[0] : null;

  const { data: watermarkSettings } = useQuery({
    queryKey: queryKeys.media.watermarkSettings(),
    queryFn: () => MediaService.getWatermarkSettings(),
    retry: 1,
  });

  useEffect(() => {
    // If filters changed and current page is out of range, reset.
    if (page > totalPages) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, folder, pageSize, totalPages]);

  const uploadMutation = useMutation({
    mutationFn: () => MediaService.upload(uploadFiles, { folder: uploadFolder.trim() || undefined, tags: uploadTags.trim() || undefined }),
    onSuccess: (res: MediaUploadResponse) => {
      const dupCount = res.results.filter(r => r.duplicate).length;
      const okCount = res.success_count;
      const errCount = res.error_count;
      if (errCount > 0) {
        toast.error(`Uploaded ${okCount}, duplicates ${dupCount}, errors ${errCount}`);
      } else {
        toast.success(`Uploaded ${okCount} (duplicates ${dupCount})`);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.media.lists() });
      setUploadFiles([]);
      setUploadFolder('');
      setUploadTags('');
      setShowUploadModal(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to upload'),
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => MediaService.batchDelete(ids),
    onSuccess: () => {
      toast.success('Deleted successfully');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: queryKeys.media.lists() });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete'),
  });

  const batchUpdateMutation = useMutation({
    mutationFn: (payload: { ids: number[]; folder?: string; tags?: string }) =>
      MediaService.batchUpdate(payload.ids, {
        folder: payload.folder,
        tags: payload.tags,
      }),
    onSuccess: () => {
      toast.success('Updated successfully');
      setSelectedIds([]);
      setShowBatchEditModal(false);
      setBatchFolder('');
      setBatchTags('');
      queryClient.invalidateQueries({ queryKey: queryKeys.media.lists() });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to update'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; updates: any }) => MediaService.update(payload.id, payload.updates),
    onSuccess: () => {
      toast.success('Saved');
      setEditingAsset(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.media.lists() });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save'),
  });

  const watermarkSettingsMutation = useMutation({
    mutationFn: (payload: { enabled?: boolean; base_media_asset_id?: number | null }) => MediaService.updateWatermarkSettings(payload),
    onSuccess: () => {
      toast.success('Watermark settings updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.media.watermarkSettings() });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to update watermark settings'),
  });

  const watermarkMutation = useMutation({
    mutationFn: (payload: { asset_id: number; text_source: 'sku' | 'custom'; sku?: string; text?: string }) =>
      MediaService.watermarkAsset(payload),
    onSuccess: (asset) => {
      toast.success('Watermarked image created');
      setShowWatermarkModal(false);
      setWatermarkAssetId(null);
      setWatermarkSku('');
      setWatermarkText('');
      queryClient.invalidateQueries({ queryKey: queryKeys.media.lists() });
      // Optional: auto-select the new asset
      setSelectedIds([asset.id]);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to watermark image'),
  });

  const toggleSelected = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const selectAllOnPage = () => {
    const ids = items.map(i => i.id);
    setSelectedIds(prev => {
      const set = new Set(prev);
      for (const id of ids) set.add(id);
      return Array.from(set);
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const addFiles = (files: FileList | File[]) => {
    const list = Array.isArray(files) ? files : Array.from(files);
    const onlyImages = list.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp|tiff?|heic|heif)$/i.test(f.name));
    if (onlyImages.length === 0) {
      toast.error('Please select image files');
      return;
    }
    setUploadFiles(prev => [...prev, ...onlyImages]);
  };

  const openEdit = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setEditTitle(asset.title || '');
    setEditAlt(asset.alt_text || '');
    setEditFolder(asset.folder || '');
    setEditTags(asset.tags || '');
  };

  const canBatch = selectedIds.length > 0;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <div className="text-red-600 mb-4">
            Error loading media: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('nav.media', 'Media Library')}</h1>
            <p className="mt-1 text-sm text-gray-500">Upload and manage images (deduplicated by SHA-256)</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
            Upload Images
          </button>
        </div>

        {/* Watermark Settings */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Default Product Image (Watermark)</h2>
              <p className="mt-1 text-sm text-gray-500">
                Used when a product has no images. The system generates a watermarked fallback image using the product SKU.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(watermarkSettings?.enabled)}
                onChange={(e) => watermarkSettingsMutation.mutate({ enabled: e.target.checked })}
                className="h-4 w-4"
              />
              Enable
            </label>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-md border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                {watermarkSettings?.base_media_asset?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={watermarkSettings.base_media_asset.url} alt="Base" className="h-full w-full object-cover" />
                ) : (
                  <PhotoIcon className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Base image</div>
                <div className="text-xs text-gray-500">
                  {watermarkSettings?.base_media_asset?.original_name || 'Not set'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!singleSelectedId || watermarkSettingsMutation.isPending}
                onClick={() => watermarkSettingsMutation.mutate({ base_media_asset_id: singleSelectedId })}
                className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                title={singleSelectedId ? 'Use the selected media item as base image' : 'Select exactly 1 media item to set as base'}
              >
                <StarIcon className="h-4 w-4 mr-2" />
                Set Selected As Base
              </button>
              <button
                type="button"
                disabled={!watermarkSettings?.base_media_asset_id || watermarkSettingsMutation.isPending}
                onClick={() => watermarkSettingsMutation.mutate({ base_media_asset_id: 0 })}
                className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Clear Base
              </button>
              <div className="text-xs text-gray-500">Tip: select an image in the grid, then click “Set Selected As Base”.</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="filename / hash / title..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
              <input
                type="text"
                value={folder}
                onChange={(e) => { setFolder(e.target.value); setPage(1); }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. homepage"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {[12, 24, 48, 96].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Batch actions */}
        {canBatch && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="text-sm text-blue-800">
              Selected: <span className="font-semibold">{selectedIds.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { selectAllOnPage(); toast.success('Selected all items on this page'); }}
                className="px-3 py-2 text-sm rounded-md border border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                Select Page
              </button>
              <button
                onClick={() => setShowBatchEditModal(true)}
                className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-white border border-gray-200 hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Batch Edit
              </button>
				{selectedIds.length === 1 && (
					<button
						onClick={() => {
							setWatermarkAssetId(selectedIds[0]);
							setWatermarkTextSource('sku');
							setWatermarkSku('');
							setWatermarkText('');
							setShowWatermarkModal(true);
						}}
						className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-white border border-gray-200 hover:bg-gray-50"
						title="Create a watermarked copy"
					>
						<SparklesIcon className="h-4 w-4 mr-1" />
						Watermark
					</button>
				)}
              <button
                onClick={() => {
                  if (!window.confirm(`Delete ${selectedIds.length} item(s)? This cannot be undone.`)) return;
                  batchDeleteMutation.mutate(selectedIds);
                }}
                className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="bg-white shadow rounded-lg p-6">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <PhotoIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No media found</h3>
              <p className="mt-1 text-sm text-gray-500">Upload images to build your media library.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  Upload Images
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {items.map((asset) => {
                  const selected = selectedIds.includes(asset.id);
                  return (
                    <div
                      key={asset.id}
                      className={`group relative border rounded-lg overflow-hidden bg-white ${selected ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSelected(asset.id)}
                        className="absolute top-2 left-2 z-10 h-5 w-5 rounded bg-white/90 border border-gray-300 flex items-center justify-center"
                        aria-label="Select"
                      >
                        {selected ? <span className="h-3 w-3 bg-blue-600 rounded-sm" /> : null}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEdit(asset)}
                        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded bg-white/90 border border-gray-200 flex items-center justify-center hover:bg-white"
                        aria-label="Edit"
                      >
                        <PencilIcon className="h-4 w-4 text-gray-700" />
                      </button>

                      <div className="aspect-square bg-gray-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.url}
                          alt={asset.alt_text || asset.original_name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-2">
                        <div className="text-xs font-medium text-gray-900 truncate" title={asset.original_name}>
                          {asset.original_name}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate" title={asset.folder || ''}>
                          {asset.folder ? `/${asset.folder}` : '—'}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center justify-between">
                          <span title={asset.sha256}>{asset.sha256.slice(0, 8)}…</span>
                          <span>{formatBytes(asset.size_bytes)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Total: <span className="font-medium">{total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-3 py-2 text-sm rounded-md border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                  >
                    Prev
                  </button>
                  <div className="text-sm text-gray-700">
                    Page <span className="font-medium">{page}</span> / {totalPages}
                  </div>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-2 text-sm rounded-md border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Watermark Modal */}
      {showWatermarkModal && watermarkAssetId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => !watermarkMutation.isPending && setShowWatermarkModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create Watermarked Copy</h3>
                <button
                  onClick={() => setShowWatermarkModal(false)}
                  disabled={watermarkMutation.isPending}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Selected asset ID: <span className="font-mono">{watermarkAssetId}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Text source</label>
                  <select
                    value={watermarkTextSource}
                    onChange={(e) => setWatermarkTextSource(e.target.value as any)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="sku">From SKU</option>
                    <option value="custom">Custom text</option>
                  </select>
                </div>

                {watermarkTextSource === 'sku' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                    <input
                      value={watermarkSku}
                      onChange={(e) => setWatermarkSku(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g. A02B-0120-C041"
                    />
                    <p className="mt-1 text-xs text-gray-500">We will use this SKU as watermark text.</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
                    <input
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g. Vcocnc"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowWatermarkModal(false)}
                    disabled={watermarkMutation.isPending}
                    className="px-4 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!watermarkAssetId) return;
                      watermarkMutation.mutate({
                        asset_id: watermarkAssetId,
                        text_source: watermarkTextSource,
                        sku: watermarkSku,
                        text: watermarkText,
                      });
                    }}
                    disabled={
                      watermarkMutation.isPending ||
                      (watermarkTextSource === 'sku' ? !watermarkSku.trim() : !watermarkText.trim())
                    }
                    className="inline-flex items-center px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    {watermarkMutation.isPending ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => !uploadMutation.isPending && setShowUploadModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Upload Images</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploadMutation.isPending}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Folder (optional)</label>
                  <input
                    type="text"
                    value={uploadFolder}
                    onChange={(e) => setUploadFolder(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. homepage"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (optional)</label>
                  <input
                    type="text"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="comma-separated"
                  />
                </div>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'
                }`}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    addFiles(e.dataTransfer.files);
                  }
                }}
              >
                <PhotoIcon className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm text-gray-700">Drag & drop images here</p>
                <p className="mt-1 text-xs text-gray-500">or</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 inline-flex items-center px-4 py-2 text-sm rounded-md bg-white border border-gray-200 hover:bg-gray-50"
                >
                  Choose Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                    // allow re-select same file
                    e.currentTarget.value = '';
                  }}
                />
              </div>

              {uploadFiles.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-900">Selected Files ({uploadFiles.length})</div>
                    <button
                      type="button"
                      onClick={() => setUploadFiles([])}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="max-h-44 overflow-auto border border-gray-200 rounded-md">
                    {uploadFiles.map((f, idx) => (
                      <div key={`${f.name}-${idx}`} className="flex items-center justify-between px-3 py-2 text-sm border-b last:border-b-0">
                        <div className="min-w-0">
                          <div className="truncate text-gray-900">{f.name}</div>
                          <div className="text-xs text-gray-500">{formatBytes(f.size)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="ml-3 text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploadMutation.isPending}
                  className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (uploadFiles.length === 0) {
                      toast.error('Please select at least one image');
                      return;
                    }
                    uploadMutation.mutate();
                  }}
                  disabled={uploadMutation.isPending}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Edit Modal */}
      {showBatchEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => !batchUpdateMutation.isPending && setShowBatchEditModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Batch Edit ({selectedIds.length})</h3>
                <button
                  onClick={() => setShowBatchEditModal(false)}
                  disabled={batchUpdateMutation.isPending}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
                  <input
                    type="text"
                    value={batchFolder}
                    onChange={(e) => setBatchFolder(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="leave empty to keep unchanged"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <input
                    type="text"
                    value={batchTags}
                    onChange={(e) => setBatchTags(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="leave empty to keep unchanged"
                  />
                </div>
                <p className="text-xs text-gray-500">Only non-empty fields will be applied to all selected items.</p>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowBatchEditModal(false)}
                  disabled={batchUpdateMutation.isPending}
                  className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const payload: any = { ids: selectedIds };
                    if (batchFolder.trim()) payload.folder = batchFolder.trim();
                    if (batchTags.trim()) payload.tags = batchTags.trim();
                    if (!payload.folder && !payload.tags) {
                      toast.error('Please set at least one field');
                      return;
                    }
                    batchUpdateMutation.mutate(payload);
                  }}
                  disabled={batchUpdateMutation.isPending}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  {batchUpdateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Edit Modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => !updateMutation.isPending && setEditingAsset(null)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Media</h3>
                <button
                  onClick={() => setEditingAsset(null)}
                  disabled={updateMutation.isPending}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={editingAsset.url} alt={editingAsset.alt_text || editingAsset.original_name} className="w-full h-auto" />
                </div>
                <div className="space-y-4">
                  <div className="text-sm">
                    <div className="text-gray-900 font-medium truncate" title={editingAsset.original_name}>{editingAsset.original_name}</div>
                    <div className="text-xs text-gray-500 mt-1">SHA256: <span className="font-mono">{editingAsset.sha256}</span></div>
                    <div className="text-xs text-gray-500">Size: {formatBytes(editingAsset.size_bytes)}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alt Text</label>
                    <input
                      type="text"
                      value={editAlt}
                      onChange={(e) => setEditAlt(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
                    <input
                      type="text"
                      value={editFolder}
                      onChange={(e) => setEditFolder(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => {
                    if (!window.confirm('Delete this media item?')) return;
                    batchDeleteMutation.mutate([editingAsset.id]);
                    setEditingAsset(null);
                  }}
                  disabled={updateMutation.isPending || batchDeleteMutation.isPending}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingAsset(null)}
                    disabled={updateMutation.isPending}
                    className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      updateMutation.mutate({
                        id: editingAsset.id,
                        updates: {
                          title: editTitle,
                          alt_text: editAlt,
                          folder: editFolder,
                          tags: editTags,
                        },
                      });
                    }}
                    disabled={updateMutation.isPending}
                    className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
