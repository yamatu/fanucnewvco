'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { EyeIcon } from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import MarkdownContent from '@/components/content/MarkdownContent';
import { SitePageService } from '@/services/site-page.service';
import { sitePageDefaults } from '@/lib/site-page-defaults';
import { useAdminI18n } from '@/lib/admin-i18n';
import type { SitePageRequest } from '@/types';

export default function AdminSitePages() {
  const { t } = useAdminI18n();
  const queryClient = useQueryClient();
  const [pageKey, setPageKey] = useState(sitePageDefaults[0].pageKey);
  const [preview, setPreview] = useState(false);
  const defaultPage = useMemo(() => sitePageDefaults.find((page) => page.pageKey === pageKey)!, [pageKey]);
  const [form, setForm] = useState<SitePageRequest>({ title: '', summary: '', content: '', meta_title: '', meta_description: '', meta_keywords: '', is_published: true });

  const { data, isFetching, isFetched } = useQuery({
    queryKey: ['site-pages', pageKey],
    queryFn: () => SitePageService.getAdminPage(pageKey),
    retry: false,
  });

  useEffect(() => {
    if (!isFetched) return;
    setForm(data ? {
      title: data.title, summary: data.summary, content: data.content, meta_title: data.meta_title,
      meta_description: data.meta_description, meta_keywords: data.meta_keywords, is_published: data.is_published,
    } : {
      title: defaultPage.title, summary: defaultPage.summary, content: defaultPage.content,
      meta_title: defaultPage.title, meta_description: defaultPage.metaDescription,
      meta_keywords: defaultPage.metaKeywords, is_published: true,
    });
  }, [data, defaultPage, isFetched]);

  const saveMutation = useMutation({
    mutationFn: () => SitePageService.savePage(pageKey, form),
    onSuccess: () => {
      toast.success(t('sitePages.saved'));
      queryClient.invalidateQueries({ queryKey: ['site-pages', pageKey] });
    },
    onError: (error: Error) => toast.error(error.message || t('sitePages.saveFailed')),
  });

  const update = (key: keyof SitePageRequest, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  return <AdminLayout>
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('sitePages.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('sitePages.subtitle')}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="border border-gray-200 bg-white p-2 shadow-sm">
          {sitePageDefaults.map((page) => <button key={page.pageKey} type="button" onClick={() => { setPageKey(page.pageKey); setPreview(false); }} className={`block w-full px-3 py-2 text-left text-sm ${pageKey === page.pageKey ? 'bg-blue-50 font-medium text-blue-800' : 'text-gray-700 hover:bg-gray-50'}`}>{t(`sitePages.page.${page.pageKey}`, page.title)}</button>)}
        </nav>
        <form onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }} className={`space-y-5 ${!isFetched ? 'pointer-events-none opacity-60' : ''}`}>
          <div className="border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">{t('sitePages.pageTitle')}<input value={form.title} onChange={(e) => update('title', e.target.value)} required className="mt-1 w-full border border-gray-300 px-3 py-2 font-normal" /></label>
              <label className="text-sm font-medium text-gray-700">{t('sitePages.metaTitle')}<input value={form.meta_title} onChange={(e) => update('meta_title', e.target.value)} className="mt-1 w-full border border-gray-300 px-3 py-2 font-normal" /></label>
            </div>
            <label className="mt-4 block text-sm font-medium text-gray-700">{t('sitePages.summary')}<textarea value={form.summary} onChange={(e) => update('summary', e.target.value)} rows={2} className="mt-1 w-full border border-gray-300 px-3 py-2 font-normal" /></label>
            <label className="mt-4 block text-sm font-medium text-gray-700">{t('sitePages.metaDescription')}<textarea value={form.meta_description} onChange={(e) => update('meta_description', e.target.value)} rows={2} maxLength={180} className="mt-1 w-full border border-gray-300 px-3 py-2 font-normal" /><span className="mt-1 block text-xs text-gray-500">{form.meta_description.length}/180</span></label>
            <label className="mt-4 block text-sm font-medium text-gray-700">{t('sitePages.metaKeywords')}<input value={form.meta_keywords} onChange={(e) => update('meta_keywords', e.target.value)} className="mt-1 w-full border border-gray-300 px-3 py-2 font-normal" /></label>
          </div>
          <div className="border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">{t('sitePages.content')}</label>
              <button type="button" onClick={() => setPreview((value) => !value)} className="inline-flex items-center gap-2 border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"><EyeIcon className="h-4 w-4" />{preview ? t('common.edit') : t('common.preview')}</button>
            </div>
            {preview ? <MarkdownContent content={form.content} className="min-h-[440px] border border-gray-200 bg-gray-50 p-5" /> : <textarea value={form.content} onChange={(e) => update('content', e.target.value)} required rows={24} className="w-full border border-gray-300 px-3 py-2 font-mono text-sm" />}
            <p className="mt-2 text-xs text-gray-500">{t('sitePages.markdownHint')}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border border-gray-200 bg-white p-4 shadow-sm">
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.is_published} onChange={(e) => update('is_published', e.target.checked)} />{t('sitePages.published')}</label>
            <div className="flex items-center gap-3"><a href={`/${pageKey}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-700 hover:underline">{t('sitePages.viewPage')}</a><button type="submit" disabled={saveMutation.isPending || isFetching} className="bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">{saveMutation.isPending ? t('common.saving') : t('sitePages.savePage')}</button></div>
          </div>
        </form>
      </div>
    </div>
  </AdminLayout>;
}
