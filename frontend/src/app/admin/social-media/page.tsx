'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import { useAdminI18n } from '@/lib/admin-i18n';
import { queryKeys } from '@/lib/react-query';
import { SocialMediaService } from '@/services/social-media.service';
import type { SocialMediaSettingsRequest } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, RefreshCw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6';
import { toast } from 'react-hot-toast';

const EMPTY_FORM: SocialMediaSettingsRequest = {
  x_url: '',
  facebook_url: '',
  instagram_url: '',
  linkedin_url: '',
};

const PLATFORMS = [
  { key: 'x_url', name: 'X', placeholder: 'https://x.com/your-account', Icon: FaXTwitter },
  { key: 'facebook_url', name: 'Facebook', placeholder: 'https://www.facebook.com/your-page', Icon: FaFacebookF },
  { key: 'instagram_url', name: 'Instagram', placeholder: 'https://www.instagram.com/your-account', Icon: FaInstagram },
  { key: 'linkedin_url', name: 'LinkedIn', placeholder: 'https://www.linkedin.com/company/your-company', Icon: FaLinkedinIn },
] as const;

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return '';
  const apiError = error as Error & { response?: { data?: { error?: string } } };
  return apiError.response?.data?.error || error.message;
}

export default function AdminSocialMediaPage() {
  const { locale, t } = useAdminI18n();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SocialMediaSettingsRequest>(EMPTY_FORM);

  const settingsQuery = useQuery({
    queryKey: queryKeys.socialMedia.admin(),
    queryFn: () => SocialMediaService.getAdmin(),
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setForm({
      x_url: settingsQuery.data.x_url || '',
      facebook_url: settingsQuery.data.facebook_url || '',
      instagram_url: settingsQuery.data.instagram_url || '',
      linkedin_url: settingsQuery.data.linkedin_url || '',
    });
  }, [settingsQuery.data]);

  const configuredCount = useMemo(
    () => PLATFORMS.filter(({ key }) => form[key].trim()).length,
    [form],
  );

  const saveMutation = useMutation({
    mutationFn: () => SocialMediaService.update({
      x_url: form.x_url.trim(),
      facebook_url: form.facebook_url.trim(),
      instagram_url: form.instagram_url.trim(),
      linkedin_url: form.linkedin_url.trim(),
    }),
    onSuccess: async (saved) => {
      setForm({
        x_url: saved.x_url || '',
        facebook_url: saved.facebook_url || '',
        instagram_url: saved.instagram_url || '',
        linkedin_url: saved.linkedin_url || '',
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.socialMedia.all() });
      toast.success(locale === 'zh' ? '社媒设置已保存' : 'Social media settings saved');
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      toast.error(message || (locale === 'zh' ? '保存失败' : 'Failed to save'));
    },
  });

  return (
    <AdminLayout>
      <div className="max-w-4xl space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('socialMedia.title', locale === 'zh' ? '社媒设置' : 'Social Media')}
            </h1>
          </div>
          <div className="text-sm text-gray-500">
            {locale === 'zh' ? `已配置 ${configuredCount}/4` : `${configuredCount}/4 configured`}
          </div>
        </div>

        {settingsQuery.isLoading ? (
          <div className="rounded-lg bg-white p-6 shadow">
            {t('common.loading', locale === 'zh' ? '加载中...' : 'Loading...')}
          </div>
        ) : settingsQuery.isError ? (
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-red-600">
              {getErrorMessage(settingsQuery.error) || (locale === 'zh' ? '加载失败' : 'Failed to load')}
            </p>
            <button
              type="button"
              onClick={() => settingsQuery.refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              {t('common.retry', locale === 'zh' ? '重试' : 'Retry')}
            </button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-5"
          >
            <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
              {PLATFORMS.map(({ key, name, placeholder, Icon }) => {
                const value = form[key];
                return (
                  <div key={key} className="grid grid-cols-[minmax(0,1fr)_40px] gap-4 p-5 sm:grid-cols-[180px_minmax(0,1fr)_40px] sm:items-center">
                    <label htmlFor={key} className="col-span-2 flex items-center gap-3 text-sm font-semibold text-gray-900 sm:col-span-1">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-gray-700">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      {name}
                    </label>
                    <input
                      id={key}
                      type="url"
                      value={value}
                      onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                      placeholder={placeholder}
                      autoComplete="url"
                      className="min-w-0 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    {value.trim() ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${locale === 'zh' ? '打开' : 'Open'} ${name}`}
                        title={`${locale === 'zh' ? '打开' : 'Open'} ${name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="block h-10 w-10" aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => settingsQuery.refetch()}
                disabled={settingsQuery.isFetching || saveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${settingsQuery.isFetching ? 'animate-spin' : ''}`} />
                {t('common.refresh', locale === 'zh' ? '刷新' : 'Refresh')}
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending
                  ? t('common.saving', locale === 'zh' ? '保存中...' : 'Saving...')
                  : t('common.save', locale === 'zh' ? '保存' : 'Save')}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
