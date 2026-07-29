import { NextResponse } from 'next/server';
import { getRequestBaseUrl } from '@/lib/request-url';
import { getAllPublishedArticles } from '@/lib/article-sitemap';
import type { Article } from '@/types';
import { renderLocalizedSitemap } from '@/lib/i18n/sitemap';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  const baseUrl = await getRequestBaseUrl();
  let articles: Article[] = [];
  try {
    articles = await getAllPublishedArticles('blog');
  } catch (error) {
    console.error('Error generating blog sitemap:', error);
  }
  const urls = [{ pathname: '/blog', lastModified: new Date().toISOString(), changeFrequency: 'daily', priority: '0.8' }, ...articles.map((article) => ({
    pathname: article.public_path || `/blog/${article.slug}`,
    lastModified: new Date(article.updated_at || article.published_at || article.created_at).toISOString(),
    changeFrequency: 'weekly', priority: article.is_featured ? '0.8' : '0.7',
  }))];
  const sitemap = renderLocalizedSitemap(baseUrl, urls);
  return new NextResponse(sitemap, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
}
