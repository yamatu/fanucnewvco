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
  t: (key: string, fallback?: string) => string;
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
    const t = (key: string, fallback?: string) => DICT[locale][key] || fallback || key;
    return { locale, setLocale: setLocalePersist, t };
  }, [locale, setLocalePersist]);

  return <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>;
}

export function useAdminI18n(): AdminI18nContextValue {
  const ctx = useContext(AdminI18nContext);
  if (!ctx) throw new Error('useAdminI18n must be used within AdminI18nProvider');
  return ctx;
}
