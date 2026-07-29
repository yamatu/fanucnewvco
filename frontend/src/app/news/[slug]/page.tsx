import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSiteUrl } from '@/lib/url';
import { SITE_NAME, withSiteName, withoutSiteNameSuffix } from '@/lib/seo';
import { NewsService } from '@/services/news.service';
import ArticleDetailClient from './ArticleDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await NewsService.getArticleBySlug(slug, 'news');
    const baseUrl = getSiteUrl();
    const canonicalUrl = `${baseUrl}${article.public_path || `/news/${article.slug}`}`;

    const metaTitle = withoutSiteNameSuffix((article.meta_title || '').trim() || article.title);
    const socialTitle = withSiteName(metaTitle);
    const metaDescription =
      (article.meta_description || '').trim() ||
      article.summary ||
      `${article.title} - Read the latest from VIBO CNC.`;
    const metaKeywords =
      (article.meta_keywords || '').trim() ||
      [article.title, 'FANUC', 'industrial automation', 'CNC news'].join(', ');

    const images = article.featured_image ? [article.featured_image] : [];

    return {
      title: metaTitle,
      description: metaDescription,
      keywords: metaKeywords,
      openGraph: {
        title: socialTitle,
        description: metaDescription,
        type: 'article',
        url: canonicalUrl,
        images,
        publishedTime: article.published_at || article.created_at,
        modifiedTime: article.updated_at,
        ...(article.author?.full_name ? { authors: [article.author.full_name] } : {}),
      },
      alternates: { canonical: canonicalUrl },
      twitter: {
        card: 'summary_large_image',
        title: socialTitle,
        description: metaDescription,
        images,
      },
    };
  } catch {
    return {
      title: 'Article Not Found',
      description: 'The requested article could not be found.',
    };
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let article;
  try {
    article = await NewsService.getArticleBySlug(slug, 'news');
  } catch {
    notFound();
  }

  const baseUrl = getSiteUrl();
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.summary || article.meta_description || '',
    image: article.featured_image || undefined,
    datePublished: article.published_at || article.created_at,
    dateModified: article.updated_at,
    url: `${baseUrl}${article.public_path || `/news/${article.slug}`}`,
    ...(article.author?.full_name
      ? {
          author: {
            '@type': 'Person',
            name: article.author.full_name,
          },
        }
      : {}),
    publisher: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: SITE_NAME,
      url: baseUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}${article.public_path || `/news/${article.slug}`}`,
    },
  };

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'News', item: `${baseUrl}/news` },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: `${baseUrl}${article.public_path || `/news/${article.slug}`}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <ArticleDetailClient article={article} />
    </>
  );
}
