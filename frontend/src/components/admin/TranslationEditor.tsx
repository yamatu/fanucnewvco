'use client';

import { useMemo, useState } from 'react';
import type { ArticleTranslationReq, ProductTranslationReq } from '@/types';

const LANGUAGE_OPTIONS = [
  { code: 'zh', label: '简体中文' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
] as const;

type TranslationValue = ProductTranslationReq | ArticleTranslationReq;

interface TranslationEditorProps<T extends TranslationValue> {
  kind: 'product' | 'article';
  value?: T[];
  onChange: (translations: T[]) => void;
  locale?: string;
}

function emptyTranslation(kind: 'product' | 'article', languageCode: string): TranslationValue {
  const shared = {
    language_code: languageCode,
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
  };
  if (kind === 'product') {
    return { ...shared, name: '', short_description: '', description: '' };
  }
  return { ...shared, title: '', slug: '', summary: '', content: '' };
}

export default function TranslationEditor<T extends TranslationValue>({
  kind,
  value = [],
  onChange,
  locale = 'en',
}: TranslationEditorProps<T>) {
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const selected = value.find((translation) => translation.language_code === selectedLanguage)
    || emptyTranslation(kind, selectedLanguage) as T;
  const completedLanguages = useMemo(
    () => new Set(value.filter((translation) => {
      const title = 'name' in translation ? translation.name : translation.title;
      const content = 'description' in translation
        ? translation.description || translation.short_description
        : translation.content || translation.summary;
      return title.trim() && String(content || '').trim();
    }).map((translation) => translation.language_code)),
    [value],
  );

  const update = (field: string, nextValue: string) => {
    const next = { ...selected, language_code: selectedLanguage, [field]: nextValue } as T;
    onChange([...value.filter((translation) => translation.language_code !== selectedLanguage), next]);
  };

  const remove = () => onChange(value.filter((translation) => translation.language_code !== selectedLanguage));
  const titleField = kind === 'product' ? 'name' : 'title';
  const summaryField = kind === 'product' ? 'short_description' : 'summary';
  const contentField = kind === 'product' ? 'description' : 'content';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {locale === 'zh' ? '页面内容翻译与多语言 SEO' : 'Content translations and multilingual SEO'}
          </h3>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            {locale === 'zh'
              ? '只有填写标题和正文的真实翻译才会进入 hreflang、Sitemap 和搜索引擎索引；留空不会生成重复语言页面。'
              : 'Only complete translations with a title and body are added to hreflang, sitemaps and search indexing.'}
          </p>
        </div>
        {value.some((translation) => translation.language_code === selectedLanguage) && (
          <button type="button" onClick={remove} className="text-xs font-medium text-red-600 hover:text-red-700">
            {locale === 'zh' ? '删除该语言' : 'Remove language'}
          </button>
        )}
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {LANGUAGE_OPTIONS.map((language) => (
          <button
            key={language.code}
            type="button"
            onClick={() => setSelectedLanguage(language.code)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
              selectedLanguage === language.code
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
            }`}
          >
            {language.label}{completedLanguages.has(language.code) ? ' ✓' : ''}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {locale === 'zh' ? '本地化标题' : 'Localized title'} *
          </label>
          <input
            value={String((selected as unknown as Record<string, string>)[titleField] || '')}
            onChange={(event) => update(titleField, event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {kind === 'article' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {locale === 'zh' ? '本地化 URL Slug（可选）' : 'Localized URL slug (optional)'}
            </label>
            <input
              value={String((selected as ArticleTranslationReq).slug || '')}
              onChange={(event) => update('slug', event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {locale === 'zh' ? '本地化摘要' : 'Localized summary'}
          </label>
          <textarea
            value={String((selected as unknown as Record<string, string>)[summaryField] || '')}
            onChange={(event) => update(summaryField, event.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {locale === 'zh' ? '本地化正文' : 'Localized body'} *
          </label>
          <textarea
            value={String((selected as unknown as Record<string, string>)[contentField] || '')}
            onChange={(event) => update(contentField, event.target.value)}
            rows={kind === 'article' ? 14 : 7}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">SEO title</label>
            <input value={selected.meta_title || ''} onChange={(event) => update('meta_title', event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">SEO keywords</label>
            <input value={selected.meta_keywords || ''} onChange={(event) => update('meta_keywords', event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">SEO description</label>
          <textarea value={selected.meta_description || ''} onChange={(event) => update('meta_description', event.target.value)} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
    </div>
  );
}
