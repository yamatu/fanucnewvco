import type { Article, Category, Product } from '@/types';
import {
  DEFAULT_PUBLIC_LOCALE,
  isPublicLocale,
  normalizePublicLocale,
  type PublicLocale,
} from './config';

function findTranslation<T extends { language_code: string }>(translations: T[] | undefined, locale: PublicLocale): T | undefined {
  if (locale === 'en' || !Array.isArray(translations)) return undefined;
  return translations.find((translation) => normalizePublicLocale(translation.language_code) === locale);
}

function hasMeaningfulTranslation(translation: {
  language_code: string;
  name?: string;
  title?: string;
  short_description?: string;
  summary?: string;
  description?: string;
  content?: string;
}): boolean {
  if (!isPublicLocale(translation.language_code) || normalizePublicLocale(translation.language_code) === DEFAULT_PUBLIC_LOCALE) {
    return false;
  }
  return Boolean(
    String(translation.name || translation.title || '').trim()
    && String(
      translation.description
      || translation.content
      || translation.short_description
      || translation.summary
      || '',
    ).trim(),
  );
}

export function getAvailableTranslationLocales(
  translations: Array<{
    language_code: string;
    name?: string;
    title?: string;
    short_description?: string;
    summary?: string;
    description?: string;
    content?: string;
  }> | undefined,
): PublicLocale[] {
  const locales = new Set<PublicLocale>([DEFAULT_PUBLIC_LOCALE]);
  for (const translation of translations || []) {
    if (hasMeaningfulTranslation(translation)) {
      locales.add(normalizePublicLocale(translation.language_code));
    }
  }
  return [...locales];
}

export function hasTranslationForLocale(
  translations: Parameters<typeof getAvailableTranslationLocales>[0],
  locale: PublicLocale,
): boolean {
  return locale === DEFAULT_PUBLIC_LOCALE || getAvailableTranslationLocales(translations).includes(locale);
}

export function filterToIndexableArticleLocales(article: Article, locale: PublicLocale): Article | null {
  if (!hasTranslationForLocale(article.translations, locale)) return null;
  return localizeArticleContent(article, locale);
}

export function filterToIndexableProductLocales(product: Product, locale: PublicLocale): Product | null {
  if (!hasTranslationForLocale(product.translations, locale)) return null;
  return localizeProductContent(product, locale);
}

export function localizeProductContent(product: Product, locale: PublicLocale): Product {
  const translation = findTranslation(product.translations, locale);
  if (!translation) return product;
  return {
    ...product,
    name: translation.name || product.name,
    short_description: translation.short_description || product.short_description,
    description: translation.description || product.description,
    meta_title: translation.meta_title || product.meta_title,
    meta_description: translation.meta_description || product.meta_description,
    meta_keywords: translation.meta_keywords || product.meta_keywords,
    category: product.category ? localizeCategoryContent(product.category, locale) : product.category,
  };
}

export function localizeProductOrDefault(product: Product, locale: PublicLocale): Product {
  return hasTranslationForLocale(product.translations, locale)
    ? localizeProductContent(product, locale)
    : product;
}

export function localizeCategoryContent(category: Category, locale: PublicLocale): Category {
  const translation = findTranslation(category.translations, locale);
  return {
    ...category,
    ...(translation ? {
      name: translation.name || category.name,
      description: translation.description || category.description,
    } : {}),
    children: category.children?.map((child) => localizeCategoryContent(child, locale)),
  };
}

export function localizeArticleContent(article: Article, locale: PublicLocale): Article {
  const translation = findTranslation(article.translations, locale);
  if (!translation) return article;
  return {
    ...article,
    title: translation.title || article.title,
    summary: translation.summary || article.summary,
    content: translation.content || article.content,
    meta_title: translation.meta_title || article.meta_title,
    meta_description: translation.meta_description || article.meta_description,
    meta_keywords: translation.meta_keywords || article.meta_keywords,
  };
}

export function localizeArticleOrDefault(article: Article, locale: PublicLocale): Article {
  return hasTranslationForLocale(article.translations, locale)
    ? localizeArticleContent(article, locale)
    : article;
}
