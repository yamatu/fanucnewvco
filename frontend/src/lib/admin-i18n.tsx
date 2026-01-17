'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

export type AdminLocale = 'en' | 'zh';

type AdminI18nContextValue = {
  locale: AdminLocale;
  setLocale: (l: AdminLocale) => void;
  t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string;
};

const AdminI18nContext = createContext<AdminI18nContextValue | null>(null);

const STORAGE_KEY = 'fanuc_admin_locale';
const COOKIE_KEY = 'fanuc_admin_locale';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';').map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith(name + '=')) return decodeURIComponent(p.slice(name.length + 1));
  }
  return null;
}

function persistLocale(l: AdminLocale) {
  // Persist synchronously so switching language + immediate navigation still keeps the choice.
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    // ignore
  }
  try {
    const maxAge = 60 * 60 * 24 * 365; // 1 year
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(l)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

function readSavedLocale(): AdminLocale | null {
  // Prefer localStorage, fallback to cookie.
  try {
    const v = localStorage.getItem(STORAGE_KEY) as AdminLocale | null;
    if (v === 'en' || v === 'zh') return v;
  } catch {
    // ignore
  }
  const c = getCookieValue(COOKIE_KEY) as AdminLocale | null;
  if (c === 'en' || c === 'zh') return c;
  return null;
}

const DICT: Record<AdminLocale, Record<string, string>> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.products': 'Products',
    'nav.categories': 'Categories',
    'nav.orders': 'Orders',
    'nav.customers': 'Customers',
    'nav.tickets': 'Support Tickets',
    'nav.coupons': 'Coupon Management',
    'nav.users': 'All Users',
    'nav.contacts': 'Contact Messages',
    'nav.media': 'Media Library',
    'nav.homepage': 'Homepage Content',
    'action.signOut': 'Sign out',
    'action.language': 'Language',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.loading': 'Loading...',
    'common.search': 'Search',
    'common.preview': 'Preview',
    'common.clear': 'Clear',
    'common.back': 'Back',
    'common.create': 'Create',
    'common.update': 'Update',
    'common.creating': 'Creating...',
    'common.updating': 'Updating...',
    'common.saving': 'Saving...',
    'common.retry': 'Retry',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.page': 'Page {page} / {pages}',
    'admin.panel': 'Admin Panel',

    'categories.title': 'Categories',
    'categories.subtitle': 'Manage product categories, images and sort order',
    'categories.add': 'Add Category',
    'categories.edit': 'Edit',
    'categories.delete': 'Delete',
    'categories.search': 'Search Categories',
    'categories.status': 'Status',
    'categories.all': 'All',
    'categories.active': 'Active',
    'categories.inactive': 'Inactive',
    'categories.sort.normalize': 'Normalize Sort',
    'categories.image.choose': 'Choose',
    'categories.image.clear': 'Clear',
    'categories.products': 'Products',
    'categories.created': 'Created',
    'categories.empty.title': 'No categories found',
    'categories.empty.filtered': 'Try adjusting your search or filter criteria.',
    'categories.empty.fresh': 'Get started by creating your first category.',
    'categories.stats.title': 'Category Statistics',
    'categories.stats.total': 'Total Categories',
    'categories.stats.active': 'Active Categories',
    'categories.stats.totalProducts': 'Total Products',
    'categories.stats.avgProducts': 'Avg Products/Category',
    'categories.confirm.delete': 'Are you sure you want to delete \"{name}\"? This action cannot be undone.',
    'categories.toast.created': 'Category created successfully!',
    'categories.toast.updated': 'Category updated successfully!',
    'categories.toast.deleted': 'Category deleted successfully!',
    'categories.toast.createFailed': 'Failed to create category',
    'categories.toast.updateFailed': 'Failed to update category',
    'categories.toast.deleteFailed': 'Failed to delete category',
    'categories.toast.nameRequired': 'Category name is required',
    'categories.drawer.createTitle': 'Create Category',
    'categories.drawer.editTitle': 'Edit Category',
    'categories.drawer.hint': 'Edit in this panel; list will refresh after saving.',
    'categories.field.name': 'Category Name',
    'categories.field.description': 'Description',
    'categories.field.image': 'Category Image',
    'categories.field.sortOrder': 'Sort Order',
    'categories.field.sortHint': 'Smaller numbers appear first.',
    'categories.field.isActive': 'Active',

    'media.picker.search': 'Search by filename / hash / title...',
    'media.picker.selected': 'Selected: {count}',
    'media.picker.loading': 'Loading...',
    'media.picker.empty': 'No images found',
    'media.picker.total': 'Total: {total}',
    'media.picker.prev': 'Prev',
    'media.picker.next': 'Next',
    'media.picker.cancel': 'Cancel',
    'media.picker.useSelected': 'Use Selected',

    'seo.preview.title': 'Google Preview',
    'seo.preview.note': 'For reference only; actual display depends on search engines.',
    'seo.preview.titleLen': 'Title length',
    'seo.preview.descLen': 'Description length',
    'seo.preview.reco': 'Recommended {min}-{max}',
    'seo.preview.chars': '{count} chars',

    'sitemap.title': 'Sitemap Management',
    'sitemap.refresh': 'Refresh Stats',
    'sitemap.refreshing': 'Refreshing...',
    'sitemap.stats.totalProducts': 'Total Products',
    'sitemap.stats.productSitemaps': 'Product Sitemaps',
    'sitemap.stats.perSitemap': 'Per Sitemap',
    'sitemap.stats.lastUpdated': 'Last Updated',
    'sitemap.urls.title': 'Sitemap URLs',
    'sitemap.urls.subtitle': 'All available sitemap files for your website',
    'sitemap.view': 'View',
    'sitemap.copy': 'Copy URL',
    'sitemap.instructions.title': 'SEO Instructions',
    'sitemap.instructions.1': 'Submit sitemap-index.xml to Google Search Console',
    'sitemap.instructions.2': 'Sitemaps are automatically updated every 30 minutes',
    'sitemap.instructions.3': 'Each product sitemap contains up to 100 products',
    'sitemap.instructions.4': 'New products are automatically included in sitemaps',

    'products.toast.bulkUpdated': 'Products updated successfully',
    'products.toast.bulkFailed': 'Bulk update failed',
    'products.toast.created': 'Product created successfully!',
    'products.toast.createFailed': 'Failed to create product',
    'products.toast.updated': 'Product updated successfully!',
    'products.toast.updateFailed': 'Failed to update product',
    'products.toast.deleted': 'Product deleted successfully!',
    'products.toast.deleteFailed': 'Failed to delete product',
    'products.toast.selectOne': 'Select at least one product',
    'products.toast.imageUrlInvalid': 'Please enter a valid image URL',
    'products.toast.urlInvalid': 'Please enter a valid URL',
    'products.toast.imageAdded': 'Image added successfully!',
    'products.toast.categoryInvalid': 'Please select a valid category',
    'products.toast.addedFromLibrary': 'Added from media library',
    'products.toast.batchUrlsRequired': 'Please enter URLs to import',
    'products.toast.noValidUrls': 'No valid URLs found',
    'products.toast.invalidUrlsFound': 'Found {count} invalid URLs. Please check and try again.',
    'products.confirm.delete': 'Are you sure you want to delete \"{name}\"? This action cannot be undone.',
  },
  zh: {
    'nav.dashboard': '仪表盘',
    'nav.products': '产品管理',
    'nav.categories': '分类管理',
    'nav.orders': '订单管理',
    'nav.customers': '客户管理',
    'nav.tickets': '支持工单',
    'nav.coupons': '优惠券管理',
    'nav.users': '全部用户',
    'nav.contacts': '联系消息',
    'nav.media': '图库',
    'nav.homepage': '首页内容',
    'action.signOut': '退出登录',
    'action.language': '语言',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.close': '关闭',
    'common.edit': '编辑',
    'common.delete': '删除',
    'common.loading': '加载中...',
    'common.search': '搜索',
    'common.preview': '预览',
    'common.clear': '清空',
    'common.back': '返回',
    'common.create': '创建',
    'common.update': '更新',
    'common.creating': '创建中...',
    'common.updating': '更新中...',
    'common.saving': '保存中...',
    'common.retry': '重试',
    'common.yes': '是',
    'common.no': '否',
    'common.page': '第 {page} 页 / 共 {pages} 页',
    'admin.panel': '管理后台',
    'categories.title': '分类管理',
    'categories.subtitle': '管理产品分类、图片与排序',
    'categories.add': '新增分类',
    'categories.edit': '编辑',
    'categories.delete': '删除',
    'categories.search': '搜索分类',
    'categories.status': '状态',
    'categories.all': '全部',
    'categories.active': '启用',
    'categories.inactive': '停用',
    'categories.sort.normalize': '重置排序(变小)',
    'categories.image.choose': '从图库选择',
    'categories.image.clear': '清空',
    'categories.products': '产品数',
    'categories.created': '创建时间',
    'categories.empty.title': '没有找到分类',
    'categories.empty.filtered': '请尝试调整搜索或筛选条件。',
    'categories.empty.fresh': '从创建第一个分类开始吧。',
    'categories.stats.title': '分类统计',
    'categories.stats.total': '分类总数',
    'categories.stats.active': '启用分类',
    'categories.stats.totalProducts': '产品总数',
    'categories.stats.avgProducts': '平均产品/分类',
    'categories.confirm.delete': '确定要删除“{name}”吗？此操作不可撤销。',
    'categories.toast.created': '分类创建成功！',
    'categories.toast.updated': '分类更新成功！',
    'categories.toast.deleted': '分类删除成功！',
    'categories.toast.createFailed': '创建分类失败',
    'categories.toast.updateFailed': '更新分类失败',
    'categories.toast.deleteFailed': '删除分类失败',
    'categories.toast.nameRequired': '分类名称不能为空',
    'categories.drawer.createTitle': '新增分类',
    'categories.drawer.editTitle': '编辑分类',
    'categories.drawer.hint': '在右侧面板编辑，保存后列表会自动刷新。',
    'categories.field.name': '分类名称',
    'categories.field.description': '描述',
    'categories.field.image': '分类图片',
    'categories.field.sortOrder': '排序',
    'categories.field.sortHint': '数字越小越靠前。',
    'categories.field.isActive': '启用',

    'media.picker.search': '按文件名 / 哈希 / 标题搜索...',
    'media.picker.selected': '已选择：{count}',
    'media.picker.loading': '加载中...',
    'media.picker.empty': '没有图片',
    'media.picker.total': '总计：{total}',
    'media.picker.prev': '上一页',
    'media.picker.next': '下一页',
    'media.picker.cancel': '取消',
    'media.picker.useSelected': '使用所选',

    'seo.preview.title': 'Google 预览',
    'seo.preview.note': '仅供参考，实际展示以搜索引擎为准',
    'seo.preview.titleLen': '标题长度',
    'seo.preview.descLen': '描述长度',
    'seo.preview.reco': '建议 {min}-{max}',
    'seo.preview.chars': '{count} 字符',

    'sitemap.title': '站点地图管理',
    'sitemap.refresh': '刷新统计',
    'sitemap.refreshing': '刷新中...',
    'sitemap.stats.totalProducts': '产品总数',
    'sitemap.stats.productSitemaps': '产品 Sitemap 数',
    'sitemap.stats.perSitemap': '每个 Sitemap',
    'sitemap.stats.lastUpdated': '最近刷新',
    'sitemap.urls.title': 'Sitemap 地址',
    'sitemap.urls.subtitle': '站点可用的 sitemap 列表',
    'sitemap.view': '查看',
    'sitemap.copy': '复制链接',
    'sitemap.instructions.title': 'SEO 提示',
    'sitemap.instructions.1': '把 sitemap-index.xml 提交到 Google Search Console',
    'sitemap.instructions.2': 'Sitemap 默认每 30 分钟更新一次',
    'sitemap.instructions.3': '每个产品 sitemap 最多包含 100 个产品',
    'sitemap.instructions.4': '新增产品会自动进入 sitemap',

    'products.toast.bulkUpdated': '批量更新成功',
    'products.toast.bulkFailed': '批量更新失败',
    'products.toast.created': '产品创建成功！',
    'products.toast.createFailed': '创建产品失败',
    'products.toast.updated': '产品更新成功！',
    'products.toast.updateFailed': '更新产品失败',
    'products.toast.deleted': '产品删除成功！',
    'products.toast.deleteFailed': '删除产品失败',
    'products.toast.selectOne': '请至少选择一个产品',
    'products.toast.imageUrlInvalid': '请输入有效的图片链接',
    'products.toast.urlInvalid': '请输入有效的 URL',
    'products.toast.imageAdded': '图片添加成功！',
    'products.toast.categoryInvalid': '请选择有效的分类',
    'products.toast.addedFromLibrary': '已从图库添加',
    'products.toast.batchUrlsRequired': '请输入要批量导入的链接',
    'products.toast.noValidUrls': '没有找到有效的链接',
    'products.toast.invalidUrlsFound': '发现 {count} 个无效链接，请检查后重试。',
    'products.confirm.delete': '确定要删除“{name}”吗？此操作不可撤销。',
  },
};

export function AdminI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<AdminLocale>('en');

  useIsoLayoutEffect(() => {
    const saved = readSavedLocale();
    if (saved) setLocale(saved);
  }, []);

  const setLocalePersist = useCallback((l: AdminLocale) => {
    setLocale(l);
    persistLocale(l);
  }, []);

  const value = useMemo<AdminI18nContextValue>(() => {
    const t = (key: string, fallback?: string, vars?: Record<string, string | number>) => {
      const base = DICT[locale][key] || DICT.en[key] || fallback || key;
      if (!vars) return base;
      return base.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? `{${k}}` : String(vars[k])));
    };
    return { locale, setLocale: setLocalePersist, t };
  }, [locale, setLocalePersist]);

  return <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>;
}

export function useAdminI18n(): AdminI18nContextValue {
  const ctx = useContext(AdminI18nContext);
  if (!ctx) throw new Error('useAdminI18n must be used within AdminI18nProvider');
  return ctx;
}
