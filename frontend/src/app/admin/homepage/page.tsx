'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  ArrowPathIcon,
  Bars3Icon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

import AdminLayout from '@/components/admin/AdminLayout';
import { HomepageService } from '@/services';
import type { HomepageContentRequest } from '@/services';
import { queryKeys } from '@/lib/react-query';
import type { HomepageContent } from '@/types';
import { useAdminI18n } from '@/lib/admin-i18n';
import { SortableList } from '@/components/admin/homepage/SortableList';
import { useAuth } from '@/hooks/useAuth';

import HeroEditor from '@/components/admin/homepage/editors/HeroEditor';
import CompanyStatsEditor from '@/components/admin/homepage/editors/CompanyStatsEditor';
import FeaturedProductsEditor from '@/components/admin/homepage/editors/FeaturedProductsEditor';
import WorkshopEditor from '@/components/admin/homepage/editors/WorkshopEditor';
import ServicesEditor from '@/components/admin/homepage/editors/ServicesEditor';
import SimpleSectionEditor from '@/components/admin/homepage/editors/SimpleSectionEditor';

type SectionDef = { id: string; key: string; name: string; description: string; predefined?: boolean; sortOrder: number };
type SectionFilter = 'all' | 'primary' | 'custom' | 'active' | 'inactive';
type CreateSectionForm = { key: string; title: string; description: string };

const PRIMARY_HOME_SECTION_KEYS = ['hero_section', 'company_stats', 'featured_products', 'brands_section', 'repair_capabilities', 'services_section', 'home_blog', 'workshop_section'] as const;
const SECTION_KEY_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;
const EMPTY_CREATE_FORM: CreateSectionForm = { key: '', title: '', description: '' };

function isPrimarySectionKey(key: string): boolean {
  return (PRIMARY_HOME_SECTION_KEYS as readonly string[]).includes(key);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

function hasSectionContent(content?: HomepageContent | null): boolean {
  if (!content) return false;
  const hasText = [
    content.title,
    content.subtitle,
    content.description,
    content.image_url,
    content.button_text,
    content.button_url,
  ].some((value) => String(value || '').trim() !== '');
  if (hasText) return true;

  const data: unknown = content.data;
  if (data == null) return false;
  if (typeof data === 'string') {
    const normalized = data.trim();
    return normalized !== '' && normalized !== 'null' && normalized !== '{}' && normalized !== '[]';
  }
  if (Array.isArray(data)) return data.length > 0;
  return typeof data === 'object' && Object.keys(data).length > 0;
}

function isValidLink(value: string): boolean {
  if (!value) return true;
  return /^(?:\/|#|https?:\/\/|mailto:|tel:)/i.test(value.trim());
}

function getSectionIssueCount(content: HomepageContent): number {
  if (!content.is_active) return 0;
  let count = 0;
  if (!hasSectionContent(content)) count += 1;
  if (Boolean(content.button_text?.trim()) !== Boolean(content.button_url?.trim())) count += 1;
  if (!isValidLink(content.button_url || '')) count += 1;
  return count;
}

function getLatestUpdate(contents: HomepageContent[]): Date | null {
  const timestamps = contents
    .map((content) => Date.parse(content.updated_at))
    .filter(Number.isFinite);
  return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
}

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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  const [selectedKey, setSelectedKey] = useState<string>('hero_section');
  const [layoutOrder, setLayoutOrder] = useState<SectionDef[]>([]);
  const [layoutDirty, setLayoutDirty] = useState(false);

  // Local UI filters to keep large section lists manageable
  const [sectionSearch, setSectionSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all');
  const [hideEmptyCustom, setHideEmptyCustom] = useState(true);
  const [layoutPanelOpen, setLayoutPanelOpen] = useState(false);
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateSectionForm>(EMPTY_CREATE_FORM);

  const {
    data: sections = [],
    isLoading: sectionsLoading,
    isFetching: sectionsFetching,
    isSuccess: sectionsReady,
    error: sectionsError,
    refetch: refetchSections,
  } = useQuery({
    queryKey: ['homepage', 'sections'],
    queryFn: () => HomepageService.getAdminSections(),
    retry: 1,
  });

  const { data: contents = [], isLoading: contentsLoading, isFetching: contentsFetching, error: contentsError, refetch: refetchContents } = useQuery({
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
        sortOrder: Number(c?.sort_order ?? baseSort),
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
        sortOrder: Number(c.sort_order ?? (9000 + idx)),
      }));
    return [...predefined, ...extras].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sections, contents, locale, t]);

  const filteredSections = useMemo(() => {
    const q = sectionSearch.trim().toLowerCase();
    const byKey = new Map((contents || []).map((c) => [c.section_key, c]));

    return mergedSections.filter((s) => {
      const c = byKey.get(s.key) || null;
      const isActive = c ? Boolean(c.is_active) : isPrimarySectionKey(s.key);
      const isPrimary = isPrimarySectionKey(s.key);
      const isCustom = !s.predefined;

      if (hideEmptyCustom && isCustom && !hasSectionContent(c)) return false;

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

  const selectedSection = useMemo(
    () => mergedSections.find((section) => section.key === selectedKey) || null,
    [mergedSections, selectedKey]
  );

  const overview = useMemo(() => {
    const byKey = new Map(contents.map((content) => [content.section_key, content]));
    const active = mergedSections.filter((section) => {
      const content = byKey.get(section.key);
      return content ? content.is_active : isPrimarySectionKey(section.key);
    }).length;
    return {
      configured: contents.length,
      active,
      issues: contents.reduce((total, content) => total + getSectionIssueCount(content), 0),
      latestUpdate: getLatestUpdate(contents),
    };
  }, [contents, mergedSections]);

  const layoutCandidates = useMemo<SectionDef[]>(() => {
    const byKey = new Map((contents || []).map((c) => [c.section_key, c]));
    return mergedSections
      .filter((s) => isPrimarySectionKey(s.key) || byKey.has(s.key))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [mergedSections, contents]);

  useEffect(() => {
    // Initialize the layout order from the DB order; keep user's drag order until saved.
    if (layoutDirty) return;
    setLayoutOrder(layoutCandidates);
  }, [layoutCandidates, layoutDirty]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<HomepageContentRequest>) => {
      return HomepageService.upsertAdminBySectionKey(selectedKey, payload);
    },
    onSuccess: async () => {
      toast.success(locale === 'zh' ? '已保存' : 'Saved');
      await queryClient.invalidateQueries({ queryKey: queryKeys.homepage.adminContents() });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, locale === 'zh' ? '保存失败' : 'Failed to save'));
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
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, locale === 'zh' ? '保存布局失败' : 'Failed to save layout'));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: CreateSectionForm) => {
      const sortOrder = Math.max(0, ...contents.map((content) => Number(content.sort_order) || 0)) + 10;
      return HomepageService.createHomepageContent({
        section_key: form.key.trim(),
        title: form.title.trim(),
        subtitle: '',
        description: form.description.trim(),
        image_url: '',
        button_text: '',
        button_url: '',
        data: {},
        sort_order: sortOrder,
        is_active: false,
      });
    },
    onSuccess: async (created) => {
      queryClient.setQueryData<HomepageContent[]>(queryKeys.homepage.adminContents(), (cached = []) => [
        ...cached.filter((content) => content.section_key !== created.section_key),
        created,
      ]);
      setSelectedKey(created.section_key);
      setCreateForm(EMPTY_CREATE_FORM);
      setCreatePanelOpen(false);
      setHideEmptyCustom(false);
      toast.success(locale === 'zh' ? '自定义区块已创建，完善内容后再启用' : 'Custom section created. Complete it before enabling.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.homepage.adminContents() });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, locale === 'zh' ? '创建区块失败' : 'Failed to create section'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ key, active }: { key: string; active: boolean }) =>
      HomepageService.upsertAdminBySectionKey(key, { is_active: active }),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.active
          ? (locale === 'zh' ? '区块已启用' : 'Section enabled')
          : (locale === 'zh' ? '区块已停用' : 'Section disabled')
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.homepage.adminContents() });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, locale === 'zh' ? '更新状态失败' : 'Failed to update status'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => HomepageService.deleteHomepageContent(id),
    onSuccess: async () => {
      setSelectedKey('hero_section');
      toast.success(locale === 'zh' ? '自定义区块已删除' : 'Custom section deleted');
      await queryClient.invalidateQueries({ queryKey: queryKeys.homepage.adminContents() });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, locale === 'zh' ? '删除区块失败' : 'Failed to delete section'));
    },
  });

  const refreshAll = async () => {
    await Promise.all([refetchSections(), refetchContents()]);
  };

  const isLoading = sectionsLoading || contentsLoading;
  const isRefreshing = sectionsFetching || contentsFetching;

  if (contentsError) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <XCircleIcon className="h-12 w-12 mx-auto text-red-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {t('homepage.error.title', locale === 'zh' ? '首页内容加载失败' : 'Error loading homepage content')}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {getErrorMessage(contentsError, t('common.unknownError', locale === 'zh' ? '未知错误' : 'Unknown error'))}
          </p>
        </div>
      </AdminLayout>
    );
  }

  const editorType = getEditorType(selectedKey);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('nav.homepage', 'Homepage Content')}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {locale === 'zh'
                ? '可视化编辑首页区块：增删、拖拽排序、图片从图库选择（不需要手写 JSON）'
                : 'Visual editor for homepage sections: add/remove, drag reorder, pick images from Media Library (no JSON editing)'}
              </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshAll}
              disabled={isRefreshing}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              title={locale === 'zh' ? '刷新配置' : 'Refresh configuration'}
              aria-label={locale === 'zh' ? '刷新配置' : 'Refresh configuration'}
            >
              <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setCreatePanelOpen((open) => !open)}
              disabled={!sectionsReady}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              title={!sectionsReady ? (locale === 'zh' ? '预定义区块加载完成后才能新建' : 'Wait for predefined sections to load') : undefined}
            >
              <PlusIcon className="h-5 w-5" />
              {locale === 'zh' ? '新建区块' : 'New Section'}
            </button>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <EyeIcon className="h-5 w-5" />
              {locale === 'zh' ? '预览首页' : 'Preview Home'}
            </a>
          </div>
        </div>

        {createPanelOpen && sectionsReady && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!sectionsReady) {
                toast.error(locale === 'zh' ? '预定义区块尚未加载，无法安全新建' : 'Predefined sections are not loaded yet.');
                return;
              }
              const key = createForm.key.trim();
              if (!SECTION_KEY_PATTERN.test(key)) {
                toast.error(locale === 'zh' ? '区块 Key 需为 3-64 位小写字母、数字或下划线，并以字母开头' : 'Section key must be 3-64 lowercase letters, numbers, or underscores and start with a letter.');
                return;
              }
              if (mergedSections.some((section) => section.key === key)) {
                toast.error(locale === 'zh' ? '该区块 Key 已存在' : 'That section key already exists.');
                return;
              }
              createMutation.mutate({ ...createForm, key });
            }}
            className="border-y border-gray-200 bg-white px-4 py-5 sm:px-6"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-gray-900">{locale === 'zh' ? '新建自定义区块' : 'New Custom Section'}</h2>
              <button
                type="button"
                onClick={() => {
                  setCreatePanelOpen(false);
                  setCreateForm(EMPTY_CREATE_FORM);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                aria-label={locale === 'zh' ? '关闭' : 'Close'}
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Section Key</span>
                <input
                  value={createForm.key}
                  onChange={(event) => setCreateForm((form) => ({ ...form, key: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                  required
                  minLength={3}
                  maxLength={64}
                  placeholder="custom_section"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">{locale === 'zh' ? '标题' : 'Title'}</span>
                <input
                  value={createForm.title}
                  onChange={(event) => setCreateForm((form) => ({ ...form, title: event.target.value }))}
                  maxLength={255}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">{locale === 'zh' ? '描述' : 'Description'}</span>
                <input
                  value={createForm.description}
                  onChange={(event) => setCreateForm((form) => ({ ...form, description: event.target.value }))}
                  maxLength={500}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4" />
                {createMutation.isPending ? (locale === 'zh' ? '创建中...' : 'Creating...') : (locale === 'zh' ? '创建区块' : 'Create Section')}
              </button>
            </div>
          </form>
        )}

        {sectionsError && (
          <div className="flex items-start gap-3 border-y border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:px-6">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <div className="font-medium">
                {locale === 'zh' ? '预定义区块列表加载失败，删除功能已暂时禁用' : 'Predefined sections could not be loaded. Delete is temporarily disabled.'}
              </div>
              <div className="mt-0.5 text-amber-700">
                {locale === 'zh' ? '请点击刷新后重试，现有内容仍可安全编辑。' : 'Refresh and try again. Existing content remains editable.'}
              </div>
            </div>
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-xs font-medium text-gray-500">{locale === 'zh' ? '已配置' : 'Configured'}</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">{overview.configured}</div>
              <div className="mt-1 text-xs text-gray-500">{locale === 'zh' ? `共 ${mergedSections.length} 个区块` : `${mergedSections.length} sections total`}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-xs font-medium text-gray-500">{locale === 'zh' ? '已启用' : 'Active'}</div>
              <div className="mt-1 text-2xl font-semibold text-emerald-700">{overview.active}</div>
              <div className="mt-1 text-xs text-gray-500">{locale === 'zh' ? '前台可见区块' : 'Visible on homepage'}</div>
            </div>
            <div className={`rounded-lg border bg-white p-4 ${overview.issues > 0 ? 'border-amber-300' : 'border-gray-200'}`}>
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <ExclamationTriangleIcon className={`h-4 w-4 ${overview.issues > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                {locale === 'zh' ? '待完善项' : 'Needs Attention'}
              </div>
              <div className={`mt-1 text-2xl font-semibold ${overview.issues > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{overview.issues}</div>
              <div className="mt-1 text-xs text-gray-500">{locale === 'zh' ? '空内容或 CTA 配置问题' : 'Empty content or CTA issues'}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <ClockIcon className="h-4 w-4" />
                {locale === 'zh' ? '最近更新' : 'Last Updated'}
              </div>
              <div className="mt-2 text-sm font-semibold text-gray-900">
                {overview.latestUpdate
                  ? new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(overview.latestUpdate)
                  : (locale === 'zh' ? '尚未保存' : 'Not saved yet')}
              </div>
            </div>
          </div>
        )}

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
                      onChange={(e) => setSectionFilter(e.target.value as SectionFilter)}
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
                                ref={drag.setActivatorNodeRef}
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
                  {filteredSections.length === 0 && (
                    <div className="px-6 py-10 text-center text-sm text-gray-500">
                      {locale === 'zh' ? '没有符合当前筛选条件的区块' : 'No sections match the current filters.'}
                    </div>
                  )}
                  {filteredSections.map((s) => {
                    const c = (contents || []).find((x) => x.section_key === s.key);
                    const isActive = c ? Boolean(c.is_active) : isPrimarySectionKey(s.key);
                    const isSelected = s.key === selectedKey;
                    const isTogglePending = toggleMutation.isPending && toggleMutation.variables?.key === s.key;
                    return (
                      <div key={s.key} className={`flex items-stretch ${isSelected ? 'bg-blue-50' : 'bg-white'}`}>
                        <button
                          type="button"
                          onClick={() => setSelectedKey(s.key)}
                          className="min-w-0 flex-1 px-6 py-4 text-left hover:bg-gray-50"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</div>
                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                              <span className="font-mono">{s.key}</span>
                              <span>·</span>
                              <span>sort: {c?.sort_order ?? '-'}</span>
                              <span>·</span>
                              <span>{getEditorType(s.key)}</span>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleMutation.mutate({ key: s.key, active: !isActive })}
                          disabled={isTogglePending}
                          className="flex w-12 flex-shrink-0 items-center justify-center border-l border-gray-100 hover:bg-gray-50 disabled:opacity-50"
                          title={isActive ? (locale === 'zh' ? '停用区块' : 'Disable section') : (locale === 'zh' ? '启用区块' : 'Enable section')}
                          aria-label={isActive ? (locale === 'zh' ? '停用区块' : 'Disable section') : (locale === 'zh' ? '启用区块' : 'Enable section')}
                          aria-pressed={isActive}
                        >
                          {isTogglePending ? (
                            <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-600" />
                          ) : isActive ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="lg:col-span-8 space-y-4">
              {selectedSection && (
                <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-gray-900">{selectedSection.name}</h2>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${current?.is_active ?? isPrimarySectionKey(selectedKey) ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {current?.is_active ?? isPrimarySectionKey(selectedKey)
                          ? (locale === 'zh' ? '已启用' : 'Active')
                          : (locale === 'zh' ? '未启用' : 'Inactive')}
                      </span>
                      {!current && (
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {locale === 'zh' ? '使用默认配置' : 'Using defaults'}
                        </span>
                      )}
                      {current && getSectionIssueCount(current) > 0 && (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {locale === 'zh' ? `${getSectionIssueCount(current)} 项待完善` : `${getSectionIssueCount(current)} issue(s)`}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate font-mono text-xs text-gray-500">{selectedSection.key}</div>
                    {current?.updated_at && (
                      <div className="mt-1 text-xs text-gray-500">
                        {locale === 'zh' ? '上次保存：' : 'Last saved: '}
                        {new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(current.updated_at))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate({
                        key: selectedKey,
                        active: !(current?.is_active ?? isPrimarySectionKey(selectedKey)),
                      })}
                      disabled={toggleMutation.isPending && toggleMutation.variables?.key === selectedKey}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {current?.is_active ?? isPrimarySectionKey(selectedKey) ? (
                        <XCircleIcon className="h-4 w-4" />
                      ) : (
                        <CheckCircleIcon className="h-4 w-4" />
                      )}
                      {current?.is_active ?? isPrimarySectionKey(selectedKey)
                        ? (locale === 'zh' ? '停用' : 'Disable')
                        : (locale === 'zh' ? '启用' : 'Enable')}
                    </button>
                    {isAdmin && sectionsReady && current && !selectedSection.predefined && (
                      <button
                        type="button"
                        onClick={() => {
                          const confirmed = window.confirm(
                            locale === 'zh'
                              ? `确定删除自定义区块“${selectedSection.name}”吗？此操作不可撤销。`
                              : `Delete custom section "${selectedSection.name}"? This cannot be undone.`
                          );
                          if (confirmed) deleteMutation.mutate(current.id);
                        }}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                        {locale === 'zh' ? '删除' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              )}

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
