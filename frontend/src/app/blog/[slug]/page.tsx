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

async function loadArticle(slug: string) {
  return NewsService.getArticleBySlug(slug, 'blog');
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const locale = await getRequestPublicLocale();
    const article = localizeArticleContent(await loadArticle(slug), locale);
    const { canonical: canonicalUrl, languages } = await getLocalizedMetadataPaths(article.public_path || `/blog/${article.slug}`);
    const title = withoutSiteNameSuffix(article.meta_title?.trim() || article.title);
    const description = article.meta_description?.trim() || article.summary || `${article.title} - VIBO CNC industrial automation guide.`;
    const images = article.featured_image ? [article.featured_image] : [];
    return {
      title,
      description,
      keywords: article.meta_keywords || [article.title, 'industrial automation', 'CNC guide'].join(', '),
      alternates: { canonical: canonicalUrl, languages },
      openGraph: { title: withSiteName(title), description, type: 'article', url: canonicalUrl, images, publishedTime: article.published_at || article.created_at, modifiedTime: article.updated_at },
      twitter: { card: 'summary_large_image', title: withSiteName(title), description, images },
    };
  } catch {
    return { title: 'Article Not Found', robots: { index: false, follow: false } };
  }
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let article;
  const locale = await getRequestPublicLocale();
  try { article = localizeArticleContent(await loadArticle(slug), locale); } catch { notFound(); }
  const baseUrl = getSiteUrl();
  const articleUrl = `${baseUrl}${localizePublicPath(article.public_path || `/blog/${article.slug}`, locale)}`;
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: article.title,
    description: article.summary || article.meta_description || '', image: article.featured_image || undefined,
    datePublished: article.published_at || article.created_at, dateModified: article.updated_at, url: articleUrl,
    author: article.author?.full_name ? { '@type': 'Person', name: article.author.full_name } : { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', '@id': `${baseUrl}/#organization`, name: SITE_NAME, url: baseUrl },
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
  };
  const breadcrumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: translatePublicMessage(locale, 'common.home'), item: `${baseUrl}${localizePublicPath('/', locale)}` },
    { '@type': 'ListItem', position: 2, name: translatePublicMessage(locale, 'nav.blog'), item: `${baseUrl}${localizePublicPath('/blog', locale)}` },
    { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
  ] };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} /><ArticleDetailClient article={article} /></>;
}
