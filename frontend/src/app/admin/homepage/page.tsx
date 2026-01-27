'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Bars3Icon, CheckCircleIcon, DocumentTextIcon, EyeIcon, XCircleIcon } from '@heroicons/react/24/outline';

import AdminLayout from '@/components/admin/AdminLayout';
import { HomepageService } from '@/services';
import { queryKeys } from '@/lib/react-query';
import type { HomepageContent } from '@/types';
import { useAdminI18n } from '@/lib/admin-i18n';
import { SortableList } from '@/components/admin/homepage/SortableList';

import HeroEditor from '@/components/admin/homepage/editors/HeroEditor';
import CompanyStatsEditor from '@/components/admin/homepage/editors/CompanyStatsEditor';
import FeaturedProductsEditor from '@/components/admin/homepage/editors/FeaturedProductsEditor';
import WorkshopEditor from '@/components/admin/homepage/editors/WorkshopEditor';
import ServicesEditor from '@/components/admin/homepage/editors/ServicesEditor';
import SimpleSectionEditor from '@/components/admin/homepage/editors/SimpleSectionEditor';

type SectionDef = { id: string; key: string; name: string; description: string; predefined?: boolean; sortOrder: number };

const PRIMARY_HOME_SECTION_KEYS = ['hero_section', 'company_stats', 'featured_products', 'workshop_section', 'services_section'] as const;

function getEditorType(key: string):
  | 'hero'
  | 'company_stats'
  | 'featured_products'
  | 'workshop'
  | 'services'
  | 'simple' {
  if (key === 'hero_section') return 'hero';
  if (key === 'company_stats') return 'company_stats';
  if (key === 'featured_products') return 'featured_products';
  if (key === 'workshop_section') return 'workshop';
  if (key === 'services_section') return 'services';
  return 'simple';
}

export default function AdminHomepageContentPage() {
  const { locale, t } = useAdminI18n();
  const queryClient = useQueryClient();

  const [selectedKey, setSelectedKey] = useState<string>('hero_section');
  const [layoutOrder, setLayoutOrder] = useState<SectionDef[]>([]);
  const [layoutDirty, setLayoutDirty] = useState(false);

  // Local UI filters to keep large section lists manageable
  const [sectionSearch, setSectionSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState<'all' | 'primary' | 'custom' | 'active' | 'inactive'>('all');
  const [hideEmptyCustom, setHideEmptyCustom] = useState(true);
  const [layoutPanelOpen, setLayoutPanelOpen] = useState(false);

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ['homepage', 'sections'],
    queryFn: () => HomepageService.getAdminSections(),
    retry: 1,
  });

  const { data: contents = [], isLoading: contentsLoading, error } = useQuery({
    queryKey: queryKeys.homepage.adminContents(),
    queryFn: () => HomepageService.getAdminHomepageContents(),
    retry: 1,
  });

  const mergedSections = useMemo<SectionDef[]>(() => {
    const byKey = Object.fromEntries((contents || []).map((c) => [c.section_key, c]));
    const predefined = sections.map((s, idx) => {
      const c = byKey[s.key] as HomepageContent | undefined;
      const baseSort = (idx + 1) * 100;
      return {
        id: s.key,
        key: s.key,
        name: s.name,
        description: s.description,
        predefined: true,
        sortOrder: Number((c as any)?.sort_order ?? baseSort),
      };
    });
    const predefinedKeys = new Set(predefined.map((s) => s.key));
    const extras = (contents || [])
      .filter((c) => !predefinedKeys.has(c.section_key))
      .map((c, idx) => ({
        id: c.section_key,
        key: c.section_key,
        name: c.section_key,
        description: t('homepage.section.custom', locale === 'zh' ? '自定义区块' : 'Custom section'),
        predefined: false,
        sortOrder: Number((c as any)?.sort_order ?? (9000 + idx)),
      }));
    return [...predefined, ...extras].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sections, contents, locale, t]);

  const filteredSections = useMemo(() => {
    const q = sectionSearch.trim().toLowerCase();
    const byKey = new Map((contents || []).map((c) => [c.section_key, c]));

    const isEmptyContent = (c?: HomepageContent | null) => {
      if (!c) return true;
      const hasText = Boolean(
        String(c.title || '').trim() ||
          String(c.subtitle || '').trim() ||
          String(c.description || '').trim() ||
          String(c.image_url || '').trim() ||
          String(c.button_text || '').trim() ||
          String(c.button_url || '').trim()
      );
      if (hasText) return false;

      const raw = (c as any)?.data;
      if (raw == null) return true;
      if (typeof raw === 'string') {
        const s = raw.trim();
        return s === '' || s === 'null' || s === '{}' || s === '[]';
      }
      if (Array.isArray(raw)) return raw.length === 0;
      if (typeof raw === 'object') return Object.keys(raw).length === 0;
      return false;
    };

    return mergedSections.filter((s) => {
      const c = byKey.get(s.key) || null;
      const isActive = c ? Boolean((c as any)?.is_active ?? false) : PRIMARY_HOME_SECTION_KEYS.includes(s.key as any);
      const isPrimary = PRIMARY_HOME_SECTION_KEYS.includes(s.key as any);
      const isCustom = !isPrimary;

      if (hideEmptyCustom && isCustom && isEmptyContent(c)) return false;

      if (sectionFilter === 'primary' && !isPrimary) return false;
      if (sectionFilter === 'custom' && !isCustom) return false;
      if (sectionFilter === 'active' && !isActive) return false;
      if (sectionFilter === 'inactive' && isActive) return false;

      if (!q) return true;
      return (
        s.key.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
      );
    });
  }, [mergedSections, contents, sectionSearch, sectionFilter, hideEmptyCustom]);

  useEffect(() => {
    // Keep selection valid when list changes
    if (mergedSections.length === 0) return;
    if (!selectedKey) {
      setSelectedKey(mergedSections[0].key);
      return;
    }
    if (!mergedSections.some((s) => s.key === selectedKey)) {
      setSelectedKey(mergedSections[0].key);
    }
  }, [mergedSections, selectedKey]);

  const current: HomepageContent | null = useMemo(
    () => (contents || []).find((c) => c.section_key === selectedKey) || null,
    [contents, selectedKey]
  );

  const layoutCandidates = useMemo<SectionDef[]>(() => {
    const byKey = new Map((contents || []).map((c) => [c.section_key, c]));
    return mergedSections
      .filter((s) => PRIMARY_HOME_SECTION_KEYS.includes(s.key as any) || byKey.has(s.key))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [mergedSections, contents]);

  useEffect(() => {
    // Initialize the layout order from the DB order; keep user's drag order until saved.
    if (layoutDirty) return;
    setLayoutOrder(layoutCandidates);
  }, [layoutCandidates, layoutDirty]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      return HomepageService.upsertAdminBySectionKey(selectedKey, payload);
    },
    onSuccess: async () => {
      toast.success(locale === 'zh' ? '已保存' : 'Saved');
      await queryClient.invalidateQueries({ queryKey: queryKeys.homepage.adminContents() });
    },
    onError: (e: any) => {
      toast.error(e?.message || (locale === 'zh' ? '保存失败' : 'Failed to save'));
    },
  });

  const saveLayoutMutation = useMutation({
    mutationFn: async (nextOrder: SectionDef[]) => {
      // Persist only the block ordering (sort_order). This also "initializes" missing rows for primary blocks.
      // Use gaps so future inserts are easier.
      const updates = nextOrder.map((s, idx) =>
        HomepageService.upsertAdminBySectionKey(s.key, { sort_order: (idx + 1) * 10 })
      );
      await Promise.all(updates);
    },
    onSuccess: async () => {
      setLayoutDirty(false);
      toast.success(locale === 'zh' ? '布局顺序已保存' : 'Layout saved');
      await queryClient.invalidateQueries({ queryKey: queryKeys.homepage.adminContents() });
    },
    onError: (e: any) => {
      toast.error(e?.message || (locale === 'zh' ? '保存布局失败' : 'Failed to save layout'));
    },
  });

  const isLoading = sectionsLoading || contentsLoading;

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <XCircleIcon className="h-12 w-12 mx-auto text-red-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {t('homepage.error.title', locale === 'zh' ? '首页内容加载失败' : 'Error loading homepage content')}
          </h3>
          <p className="mt-2 text-sm text-gray-500">{(error as any)?.message || t('common.unknownError', locale === 'zh' ? '未知错误' : 'Unknown error')}</p>
        </div>
      </AdminLayout>
    );
  }

  const editorType = getEditorType(selectedKey);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('nav.homepage', 'Homepage Content')}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {locale === 'zh'
                ? '可视化编辑首页区块：增删、拖拽排序、图片从图库选择（不需要手写 JSON）'
                : 'Visual editor for homepage sections: add/remove, drag reorder, pick images from Media Library (no JSON editing)'}
            </p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <EyeIcon className="h-5 w-5" />
            {locale === 'zh' ? '预览首页' : 'Preview Home'}
          </a>
        </div>

        {isLoading ? (
          <div className="p-10 text-center bg-white shadow rounded-lg">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-3 text-gray-500 text-sm">{t('common.loading', 'Loading...')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Section list */}
            <div className="lg:col-span-4">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                    <span className="font-medium text-gray-900">{locale === 'zh' ? '区块' : 'Sections'}</span>
                  </div>
                  <span className="text-xs text-gray-500">{filteredSections.length}/{mergedSections.length}</span>
                </div>

                {/* Filters */}
                <div className="px-6 py-4 border-b border-gray-200 space-y-3">
                  <input
                    value={sectionSearch}
                    onChange={(e) => setSectionSearch(e.target.value)}
                    placeholder={locale === 'zh' ? '搜索：名称 / key / 描述' : 'Search: name / key / description'}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />

                  <div className="flex items-center gap-2">
                    <select
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value as any)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">{locale === 'zh' ? '全部区块' : 'All sections'}</option>
                      <option value="primary">{locale === 'zh' ? '核心区块' : 'Primary blocks'}</option>
                      <option value="custom">{locale === 'zh' ? '自定义区块' : 'Custom blocks'}</option>
                      <option value="active">{locale === 'zh' ? '已启用' : 'Active'}</option>
                      <option value="inactive">{locale === 'zh' ? '未启用' : 'Inactive'}</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setLayoutPanelOpen((v) => !v)}
                      className={`px-3 py-2 text-sm rounded-md border ${layoutPanelOpen ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                      title={locale === 'zh' ? '展开/收起布局面板' : 'Toggle layout panel'}
                    >
                      {locale === 'zh' ? '布局' : 'Layout'}
                    </button>
                  </div>

                  <label className="flex items-center justify-between text-xs text-gray-600">
                    <span>{locale === 'zh' ? '隐藏空白自定义区块' : 'Hide empty custom blocks'}</span>
                    <input
                      type="checkbox"
                      checked={hideEmptyCustom}
                      onChange={(e) => setHideEmptyCustom(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </label>

                  {layoutPanelOpen && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-xs font-medium text-gray-700">{locale === 'zh' ? '首页布局顺序' : 'Homepage Layout Order'}</div>
                      <div className="mt-2 text-xs text-gray-500">
                        {locale === 'zh'
                          ? '拖拽下面的区块来调整前台首页的显示顺序，然后保存。'
                          : 'Drag blocks below to change the public homepage order, then save.'}
                      </div>
                      <div className="mt-3">
                        <SortableList
                          items={layoutOrder}
                          onReorder={(next) => {
                            setLayoutOrder(next);
                            setLayoutDirty(true);
                          }}
                        >
                          {(s, drag) => (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-white">
                              <button
                                type="button"
                                ref={drag.setActivatorNodeRef as any}
                                {...drag.attributes}
                                {...drag.listeners}
                                className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                                title={locale === 'zh' ? '拖拽排序' : 'Drag to reorder'}
                              >
                                <Bars3Icon className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                className="flex-1 text-left min-w-0"
                                onClick={() => setSelectedKey(s.key)}
                                title={s.key}
                              >
                                <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                                <div className="text-xs text-gray-500 truncate">{s.key}</div>
                              </button>
                            </div>
                          )}
                        </SortableList>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLayoutOrder(layoutCandidates);
                            setLayoutDirty(false);
                          }}
                          className="px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
                          disabled={!layoutDirty || saveLayoutMutation.isPending}
                        >
                          {locale === 'zh' ? '撤销' : 'Reset'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await saveLayoutMutation.mutateAsync(layoutOrder);
                          }}
                          className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
                          disabled={!layoutDirty || saveLayoutMutation.isPending}
                        >
                          {locale === 'zh' ? '保存顺序' : 'Save Order'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="divide-y divide-gray-200">
                  {filteredSections.map((s) => {
                    const c = (contents || []).find((x) => x.section_key === s.key);
                    const isActive = c ? Boolean((c as any)?.is_active ?? false) : PRIMARY_HOME_SECTION_KEYS.includes(s.key as any);
                    const isSelected = s.key === selectedKey;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setSelectedKey(s.key)}
                        className={`w-full text-left px-6 py-4 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</div>
                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                              <span className="font-mono">{s.key}</span>
                              <span>·</span>
                              <span>sort: {(c as any)?.sort_order ?? '-'}</span>
                              <span>·</span>
                              <span>{getEditorType(s.key)}</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {isActive ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-gray-300" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="lg:col-span-8 space-y-4">

              {editorType === 'hero' ? (
                <HeroEditor
                  content={current}
                  onSave={async (payload) => {
                    await saveMutation.mutateAsync(payload);
                  }}
                />
              ) : editorType === 'company_stats' ? (
                <CompanyStatsEditor
                  content={current}
                  onSave={async (payload) => {
                    await saveMutation.mutateAsync(payload);
                  }}
                />
              ) : editorType === 'featured_products' ? (
                <FeaturedProductsEditor
                  content={current}
                  onSave={async (payload) => {
                    await saveMutation.mutateAsync(payload);
                  }}
                />
              ) : editorType === 'workshop' ? (
                <WorkshopEditor
                  content={current}
                  onSave={async (payload) => {
                    await saveMutation.mutateAsync(payload);
                  }}
                />
              ) : editorType === 'services' ? (
                <ServicesEditor
                  content={current}
                  onSave={async (payload) => {
                    await saveMutation.mutateAsync(payload);
                  }}
                />
              ) : (
                <SimpleSectionEditor
                  content={current}
                  onSave={async (payload) => {
                    await saveMutation.mutateAsync(payload);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
