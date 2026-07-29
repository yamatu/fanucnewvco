import type { Article, Category, Product } from '@/types';
import { normalizePublicLocale, type PublicLocale } from './config';

function findTranslation<T extends { language_code: string }>(translations: T[] | undefined, locale: PublicLocale): T | undefined {
  if (locale === 'en' || !Array.isArray(translations)) return undefined;
  return translations.find((translation) => normalizePublicLocale(translation.language_code) === locale);
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
