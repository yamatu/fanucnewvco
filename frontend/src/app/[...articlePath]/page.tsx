import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSiteUrl } from '@/lib/url';
import { SITE_NAME, withSiteName, withoutSiteNameSuffix } from '@/lib/seo';
import { NewsService } from '@/services/news.service';
import ArticleDetailClient from '@/app/news/[slug]/ArticleDetailClient';
import { getLocalizedMetadataPaths, getRequestPublicLocale } from '@/lib/i18n/server';
import { localizeArticleContent } from '@/lib/i18n/content';
import { localizePublicPath } from '@/lib/i18n/config';
import { translatePublicMessage } from '@/lib/i18n/messages';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function loadArticle(parts: string[]) {
  return NewsService.getArticleByPath(parts.join('/'));
}

export async function generateMetadata({ params }: { params: Promise<{ articlePath: string[] }> }): Promise<Metadata> {
  const { articlePath } = await params;
  try {
    const locale = await getRequestPublicLocale();
    const article = localizeArticleContent(await loadArticle(articlePath), locale);
    const path = article.public_path || `/${articlePath.join('/')}`;
    const { canonical: canonicalUrl, languages } = await getLocalizedMetadataPaths(path);
    const title = withoutSiteNameSuffix(article.meta_title?.trim() || article.title);
    const description = article.meta_description?.trim() || article.summary || `${article.title} - VIBO CNC.`;
    const images = article.featured_image ? [article.featured_image] : [];
    return {
      title, description, keywords: article.meta_keywords || undefined,
      alternates: { canonical: canonicalUrl, languages },
      openGraph: { title: withSiteName(title), description, type: 'article', url: canonicalUrl, images, publishedTime: article.published_at || article.created_at, modifiedTime: article.updated_at },
      twitter: { card: 'summary_large_image', title: withSiteName(title), description, images },
    };
  } catch {
    return { title: 'Page Not Found', robots: { index: false, follow: false } };
  }
}

export default async function CustomArticlePage({ params }: { params: Promise<{ articlePath: string[] }> }) {
  const { articlePath } = await params;
  const locale = await getRequestPublicLocale();
  let article;
  try { article = localizeArticleContent(await loadArticle(articlePath), locale); } catch { notFound(); }
  const baseUrl = getSiteUrl();
  const articleUrl = `${baseUrl}${localizePublicPath(article.public_path || `/${articlePath.join('/')}`, locale)}`;
  const type = article.content_type === 'blog' ? 'BlogPosting' : 'NewsArticle';
  const sectionPath = article.content_type === 'blog' ? '/blog' : '/news';
  const sectionName = translatePublicMessage(locale, article.content_type === 'blog' ? 'nav.blog' : 'nav.news');
  const structuredData = {
    '@context': 'https://schema.org', '@type': type, headline: article.title,
    description: article.summary || article.meta_description || '', image: article.featured_image || undefined,
    datePublished: article.published_at || article.created_at, dateModified: article.updated_at, url: articleUrl,
    author: article.author?.full_name ? { '@type': 'Person', name: article.author.full_name } : { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', '@id': `${baseUrl}/#organization`, name: SITE_NAME, url: baseUrl },
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
  };
  const breadcrumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: translatePublicMessage(locale, 'common.home'), item: `${baseUrl}${localizePublicPath('/', locale)}` },
    { '@type': 'ListItem', position: 2, name: sectionName, item: `${baseUrl}${localizePublicPath(sectionPath, locale)}` },
    { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
  ] };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} /><ArticleDetailClient article={article} /></>;
}
