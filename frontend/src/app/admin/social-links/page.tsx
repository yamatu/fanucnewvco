'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  XIcon,
} from '@/components/icons/SocialBrandIcons';
import { useAdminI18n } from '@/lib/admin-i18n';
import { SocialLinksService, type SocialLinksPublicConfig } from '@/services';
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ComponentType, SVGProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

type SocialURLField = Exclude<keyof SocialLinksPublicConfig, 'show_in_footer'>;
type BrandIcon = ComponentType<SVGProps<SVGSVGElement>>;

const EMPTY_FORM: SocialLinksPublicConfig = {
  show_in_footer: true,
  x_url: '',
  facebook_url: '',
  instagram_url: '',
  linkedin_url: '',
};

const platforms: Array<{
  key: SocialURLField;
  name: string;
  placeholder: string;
  Icon: BrandIcon;
}> = [
  { key: 'x_url', name: 'X', placeholder: 'https://x.com/your-account', Icon: XIcon },
  { key: 'facebook_url', name: 'Facebook', placeholder: 'https://www.facebook.com/your-page', Icon: FacebookIcon },
  { key: 'instagram_url', name: 'Instagram', placeholder: 'https://www.instagram.com/your-account', Icon: InstagramIcon },
  { key: 'linkedin_url', name: 'LinkedIn', placeholder: 'https://www.linkedin.com/company/your-company', Icon: LinkedInIcon },
];

function getErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  };
  return candidate?.response?.data?.error || candidate?.response?.data?.message || candidate?.message || fallback;
}

export default function AdminSocialLinksPage() {
  const { locale } = useAdminI18n();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SocialLinksPublicConfig>(EMPTY_FORM);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['social-links', 'settings'],
    queryFn: () => SocialLinksService.getSettings(),
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      show_in_footer: data.show_in_footer,
      x_url: data.x_url || '',
      facebook_url: data.facebook_url || '',
      instagram_url: data.instagram_url || '',
      linkedin_url: data.linkedin_url || '',
    });
  }, [data]);

  const configuredPlatforms = useMemo(
    () => platforms.filter((platform) => form[platform.key].trim()),
    [form]
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      SocialLinksService.updateSettings({
        show_in_footer: form.show_in_footer,
        x_url: form.x_url.trim(),
        facebook_url: form.facebook_url.trim(),
        instagram_url: form.instagram_url.trim(),
        linkedin_url: form.linkedin_url.trim(),
      }),
    onSuccess: async (saved) => {
      setForm({
        show_in_footer: saved.show_in_footer,
        x_url: saved.x_url || '',
        facebook_url: saved.facebook_url || '',
        instagram_url: saved.instagram_url || '',
        linkedin_url: saved.linkedin_url || '',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social-links'] }),
        queryClient.invalidateQueries({ queryKey: ['public', 'social-links'] }),
      ]);
      toast.success(locale === 'zh' ? '社交媒体设置已保存' : 'Social media settings saved');
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(mutationError, locale === 'zh' ? '保存失败' : 'Failed to save social media settings')
      );
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  const handleReset = () => {
    if (!data) return;
    setForm({
      show_in_footer: data.show_in_footer,
      x_url: data.x_url || '',
      facebook_url: data.facebook_url || '',
      instagram_url: data.instagram_url || '',
      linkedin_url: data.linkedin_url || '',
    });
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {locale === 'zh' ? '社交媒体与 SEO' : 'Social Media & SEO'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {locale === 'zh'
              ? '管理页脚社交账号和搜索引擎 Organization 身份关联。'
              : 'Manage footer profiles and Organization identity links for search engines.'}
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            {locale === 'zh' ? '加载中...' : 'Loading...'}
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-red-700">
              {getErrorMessage(error, locale === 'zh' ? '加载失败' : 'Failed to load settings')}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowPathIcon className="h-4 w-4" />
              {locale === 'zh' ? '重试' : 'Retry'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {locale === 'zh' ? '页脚社交图标' : 'Footer social icons'}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {locale === 'zh' ? '关闭后链接仍保留用于 SEO，但不在页脚显示。' : 'When disabled, links remain available for SEO but are hidden from the footer.'}
                </p>
              </div>
              <label className="inline-flex items-center gap-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.show_in_footer}
                  onChange={(event) => setForm((current) => ({ ...current, show_in_footer: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                {locale === 'zh' ? '显示' : 'Show'}
              </label>
            </div>

            <div className="divide-y divide-gray-100 px-6">
              {platforms.map(({ key, name, placeholder, Icon }) => (
                <div key={key} className="grid grid-cols-[40px_minmax(0,1fr)] gap-4 py-5 sm:grid-cols-[40px_110px_minmax(0,1fr)] sm:items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-900 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <label htmlFor={key} className="text-sm font-semibold text-gray-900">
                    {name}
                  </label>
                  <input
                    id={key}
                    type="url"
                    maxLength={500}
                    value={form[key]}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                    placeholder={placeholder}
                    className="col-span-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/30 sm:col-span-1"
                  />
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{locale === 'zh' ? '预览' : 'Preview'}</div>
                  <div className="mt-2 flex min-h-10 items-center gap-2">
                    {configuredPlatforms.length > 0 ? (
                      configuredPlatforms.map(({ key, name, Icon }) => (
                        <span
                          key={key}
                          title={name}
                          className={`flex h-10 w-10 items-center justify-center rounded-md bg-gray-900 text-white ${form.show_in_footer ? '' : 'opacity-40'}`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">
                        {locale === 'zh' ? '填写链接后显示图标' : 'Icons appear after a link is entered'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={saveMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    {locale === 'zh' ? '重置' : 'Reset'}
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-600 disabled:opacity-60"
                  >
                    <CheckIcon className="h-4 w-4" />
                    {saveMutation.isPending
                      ? locale === 'zh' ? '保存中...' : 'Saving...'
                      : locale === 'zh' ? '保存' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
