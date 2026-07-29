import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSiteUrl } from '@/lib/url';
import { SITE_NAME, withSiteName } from '@/lib/seo';
import { NewsService } from '@/services/news.service';
import NewsPageClient from '@/app/news/NewsPageClient';
import type { PaginationResponse, Article } from '@/types';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search.trim() : '';
  const page = Math.max(1, Number.parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1);
  const title = search ? `Search: ${search} - Blog` : 'Industrial Automation Blog';
  const description = search
    ? `Search results for "${search}" in the VIBO CNC industrial automation blog.`
    : 'Technical guides, troubleshooting knowledge, and purchasing insights for CNC and industrial automation parts.';
  const url = page > 1 ? `${getSiteUrl()}/blog?page=${page}` : `${getSiteUrl()}/blog`;
  return {
    title,
    description,
    keywords: ['industrial automation blog', 'CNC troubleshooting', 'automation parts guide', 'FANUC technical articles', search].filter(Boolean).join(', '),
    robots: search ? { index: false, follow: true } : { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: { title: withSiteName(title), description, type: 'website', url },
    twitter: { card: 'summary_large_image', title: withSiteName(title), description },
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BlogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const page = Number.parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1;
  const search = typeof params.search === 'string' && params.search.trim() ? params.search.trim() : undefined;
  let data: PaginationResponse<Article> = { data: [], page, page_size: 12, total_pages: 1, total: 0 };
  try {
    data = await NewsService.getArticles({ page, page_size: 12, search, content_type: 'blog' });
  } catch (error) {
    console.error('Failed to fetch blog articles:', error);
  }

  const baseUrl = getSiteUrl();
  const articles = data.data || [];
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'VIBO CNC Industrial Automation Blog',
    description: 'Technical guides and practical knowledge for CNC and industrial automation professionals.',
    url: `${baseUrl}/blog`,
    publisher: { '@type': 'Organization', '@id': `${baseUrl}/#organization`, name: SITE_NAME, url: baseUrl },
    blogPost: articles.slice(0, 10).map((article) => ({
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.summary || '',
      url: `${baseUrl}${article.public_path || `/blog/${article.slug}`}`,
      datePublished: article.published_at || article.created_at,
      dateModified: article.updated_at,
      image: article.featured_image || undefined,
    })),
  };

  const initialData = { articles, totalPages: data.total_pages || 1, total: data.total || 0, currentPage: page, searchQuery: search || '' };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800" /></div>}>
      <NewsPageClient initialData={initialData} searchParams={params} contentType="blog" />
    </Suspense>
  </>;
}
